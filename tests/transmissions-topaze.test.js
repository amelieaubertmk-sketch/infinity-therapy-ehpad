import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../backend/server.js';
import {newSession} from '../backend/auth.js';
import {seed,createTransmission,changeStatus} from '../src/domain.js';

test('Topaze persists independently of Titan; concurrent duplicates require explicit confirmation',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'infinity-topaze-'));let app=createApp({directory});
 const initial=seed(),input={residentId:initial.residents[0].id,date:'2026-11-12',activity:'Marche',practitioner:'Amélie',text:'Texte fictif',observation:'',reason:'',notPerformed:false};
 app.db.prepare('UPDATE state SET data=?').run(JSON.stringify(initial));
 for(const role of ['admin','kine','secretariat'])app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(role,role,role,role,'unused');
 const clients=Object.fromEntries(['admin','kine','secretariat'].map(role=>[role,newSession(app.db,role)]));
 let base;
 async function start(){app.server.listen(0,'127.0.0.1');await once(app.server,'listening');base='http://127.0.0.1:'+app.server.address().port;}
 async function stop(){await new Promise(r=>app.server.close(r));app.close();}
 async function call(route,body,role='kine',csrf=true){const c=clients[role];const r=await fetch(base+route,{method:body?'POST':'GET',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',Cookie:`infinity_session=${c.token}`,...(csrf?{'X-CSRF-Token':c.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
 const make=(overrides={})=>createTransmission(initial,{...input,...overrides});
 try{
 await start();
 const attempts=await Promise.all([call('/api/transmissions/create',{transmission:make()}),call('/api/transmissions/create',{transmission:make({activity:'Soins',practitioner:'Alexandre'})})]);
 assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
 assert.equal(attempts.find(r=>r.status===409).data.code,'DUPLICATE_TRANSMISSION');
 let snap=(await call('/api/state')).data;assert.equal(snap.state.transmissions.length,1);
 const id=snap.state.transmissions[0].id;
 assert.equal((await call('/api/transmissions/create',{transmission:make(),confirmDuplicate:'true'})).status,409);
 assert.equal((await call('/api/transmissions/create',{transmission:make(),confirmDuplicate:true},'secretariat')).status,403);
 const confirmed=await call('/api/transmissions/create',{transmission:make({activity:'Soins'}),confirmDuplicate:true});assert.equal(confirmed.status,200);assert.equal(confirmed.data.state.transmissions.length,2);
 // The legacy snapshot API cannot bypass duplicate validation either.
 snap=confirmed.data;const proposed={...snap.state,transmissions:[make(),...snap.state.transmissions]};
 const c=clients.kine;const legacy=await fetch(base+'/api/state',{method:'PUT',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',Cookie:`infinity_session=${c.token}`,'X-CSRF-Token':c.csrf},body:JSON.stringify({revision:snap.revision,state:proposed})});assert.equal(legacy.status,409);
 assert.equal((await call('/api/transmissions/topaze',{id},'kine',false)).status,403);
 assert.equal((await call('/api/transmissions/topaze',{id:'absent'})).status,400);
 const pointed=await call('/api/transmissions/topaze',{id,at:'forged',userId:'forged'},'secretariat');assert.equal(pointed.status,200);
 const t=pointed.data.state.transmissions.find(t=>t.id===id);assert.equal(t.topaze.userId,'secretariat');assert.equal(t.topaze.userName,'secretariat');assert.ok(Number.isFinite(Date.parse(t.topaze.at)));assert.equal(t.finalText,'Texte fictif');assert.equal(t.status,'À saisir');
 const again=await call('/api/transmissions/topaze',{id},'admin');assert.equal(again.data.revision,pointed.data.revision);assert.deepEqual(again.data.state.transmissions,pointed.data.state.transmissions);
 assert.equal(app.db.prepare("SELECT count(*) AS n FROM audit WHERE action='transmission.topaze'").get().n,1);
 // Completion keeps the pointage and still removes transmission contents.
 snap=again.data;const next={...snap.state,transmissions:snap.state.transmissions.map(row=>row.id===id?changeStatus(row,'Saisi sur Titan'):row)};
 const completed=await fetch(base+'/api/state',{method:'PUT',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',Cookie:`infinity_session=${c.token}`,'X-CSRF-Token':c.csrf},body:JSON.stringify({revision:snap.revision,state:next})});assert.equal(completed.status,200);
 await stop();app=createApp({directory});await start();const restored=(await call('/api/state')).data.state.transmissions.find(t=>t.id===id);assert.deepEqual(restored.topaze,t.topaze);assert.equal(restored.status,'Saisi sur Titan');assert.ok(!('finalText' in restored));
 }finally{await stop();rmSync(directory,{recursive:true,force:true});}
});
