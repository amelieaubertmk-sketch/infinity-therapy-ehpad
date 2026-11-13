import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../backend/server.js';
import {DatabaseSync} from 'node:sqlite';
import {newSession} from '../backend/auth.js';
import {seed,createTransmission,validatePrescription,prescriptionFollowUp} from '../src/domain.js';

test('prescription states and administrative calendar reminder',()=>{
 assert.deepEqual(prescriptionFollowUp({}),{status:'unknown'});
 assert.deepEqual(validatePrescription({status:'missing'}),{status:'missing'});
 assert.throws(()=>validatePrescription({status:'missing',date:'2026-01-01'}));
 assert.throws(()=>validatePrescription({status:'dated',date:'2026-02-30'}));
 assert.throws(()=>validatePrescription({status:'other'}));
 const r={prescription:{status:'dated',date:'2024-02-29'}};
 assert.equal(prescriptionFollowUp(r,'2025-01-28').reminder,'normal');
 assert.equal(prescriptionFollowUp(r,'2025-01-29').reminder,'soon');
 assert.equal(prescriptionFollowUp(r,'2025-02-28').due,'2025-02-28');
 assert.equal(prescriptionFollowUp(r,'2025-03-01').reminder,'overdue');
});

test('resident prescription persists, protects Topaze against stale clients and never modifies transmissions',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'infinity-prescriptions-'));let app=createApp({directory}),base;
 const state=seed(),resident=state.residents[0];state.transmissions=[createTransmission(state,{residentId:resident.id,date:'2026-11-13',activity:'Marche',practitioner:'Amélie',text:'Fictif'})];
 app.db.prepare('UPDATE state SET data=?').run(JSON.stringify(state));
 for(const role of ['admin','kine','secretariat'])app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(role,role,role,role,'unused');
 const sessions=Object.fromEntries(['admin','kine','secretariat'].map(role=>[role,newSession(app.db,role)]));
 async function start(){app.server.listen(0,'127.0.0.1');await once(app.server,'listening');base='http://127.0.0.1:'+app.server.address().port;}
 async function stop(){await new Promise(r=>app.server.close(r));app.close();}
 async function req(route,body,role='admin',method=body?'POST':'GET'){const c=sessions[role];const r=await fetch(base+route,{method,headers:{Origin:'http://localhost:3000','Content-Type':'application/json',Cookie:`infinity_session=${c.token}`,'X-CSRF-Token':c.csrf},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
 async function set(prescription,role='admin'){const snap=(await req('/api/state')).data;return req('/api/state',{revision:snap.revision,state:{...snap.state,residents:snap.state.residents.map(r=>r.id===resident.id?{...r,prescription}:r)}},role,'PUT');}
 try{await start();
 assert.equal((await set({status:'missing'},'kine')).status,403);
 assert.equal((await set({status:'dated',date:'2026-02-30'})).status,400);
 let result=await set({status:'missing'});assert.equal(result.status,200);assert.deepEqual(result.data.state.transmissions,state.transmissions);
 assert.equal((await req('/api/transmissions/topaze',{id:state.transmissions[0].id},'secretariat')).status,400);
 assert.equal(app.db.prepare("SELECT count(*) AS n FROM audit WHERE action='transmission.topaze'").get().n,0);
 await stop();app=createApp({directory});await start();assert.equal((await req('/api/state')).data.state.residents[0].prescription.status,'missing');
 result=await set({status:'dated',date:'2020-01-01'});assert.equal(result.status,200);assert.deepEqual(result.data.state.transmissions,state.transmissions);
 assert.equal((await req('/api/transmissions/topaze',{id:state.transmissions[0].id},'secretariat')).status,200); // Age alone never blocks pointage.

 let pointed=(await req('/api/state')).data.state.transmissions[0];assert.ok(pointed.topaze);
 result=await set({status:'missing'});assert.equal(result.status,200);
 let cancelled=result.data.state.transmissions[0];assert.ok(!cancelled.topaze);assert.deepEqual(cancelled.topazeHistory[0].pointage,pointed.topaze);assert.equal(cancelled.topazeHistory[0].cancelledBy,'admin');assert.equal(cancelled.finalText,pointed.finalText);assert.equal(cancelled.status,pointed.status);
 const refused=await req('/api/transmissions/topaze',{id:cancelled.id},'secretariat');assert.equal(refused.data.error,'Pointage impossible : ordonnance manquante');
 result=await set({status:'dated',date:'2026-11-13'});assert.ok(!result.data.state.transmissions[0].topaze);
 await stop();app=createApp({directory});await start();assert.ok(!(await req('/api/state')).data.state.transmissions[0].topaze);
 assert.equal((await req('/api/transmissions/topaze',{id:cancelled.id},'secretariat')).status,200);
 pointed=(await req('/api/state')).data.state.transmissions[0];assert.ok(pointed.topaze);assert.equal(pointed.topazeHistory.length,1);
 // Competing requests: whichever acquires the write lock first, missing wins.
 const race=await Promise.all([set({status:'missing'}),req('/api/transmissions/topaze',{id:cancelled.id},'secretariat')]);assert.equal(race[0].status,200);
 assert.ok(!(await req('/api/state')).data.state.transmissions[0].topaze);
 // Simulate a pre-correction database with an active pointage and missing prescription.
 const old=(await req('/api/state')).data.state;old.transmissions[0]={...old.transmissions[0],topaze:pointed.topaze};app.db.prepare('UPDATE state SET data=?').run(JSON.stringify(old));
 await stop();app=createApp({directory});await start();
 const repaired=(await req('/api/state')).data.state.transmissions[0];assert.ok(!repaired.topaze);assert.equal(repaired.topazeHistory.length,3);assert.equal(repaired.finalText,pointed.finalText);
 const backups=readdirSync(directory).filter(f=>f.startsWith('before-topaze-correction-'));assert.equal(backups.length,1);
 const saved=new DatabaseSync(path.join(directory,backups[0]),{readOnly:true});assert.equal(saved.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(JSON.parse(saved.prepare('SELECT data FROM state').get().data).transmissions[0].topaze,pointed.topaze);saved.close();
 await stop();app=createApp({directory});await start();assert.equal(readdirSync(directory).filter(f=>f.startsWith('before-topaze-correction-')).length,1);assert.equal((await req('/api/state')).data.state.transmissions[0].topazeHistory.length,3);
 result=await set({status:'unknown'});assert.equal(result.status,200);assert.deepEqual(result.data.state.residents[0].prescription,{status:'unknown'});
 }finally{await stop();rmSync(directory,{recursive:true,force:true});}
});
