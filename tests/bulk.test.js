import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {createApp} from '../backend/server.js';
import {newSession} from '../backend/auth.js';
import {seed,createTransmission,orderedTransmissions,pendingTransmissions,sessionAge,changeStatus,purgeTitan} from '../src/domain.js';
import {mutation} from '../backend/mutations.js';
test('chronology, calendar colors, counters and validation identity',()=>{
 const state=seed(),input={residentId:state.residents[0].id,date:'2026-11-11',practitioner:'Amélie',activity:'Marche',text:'FICTIF',observation:'',reason:'',notPerformed:false};
 const result=mutation(state,{...state,transmissions:[createTransmission(state,input)]},{id:'account',name:'Validateur',role:'kine'}),t=result.state.transmissions[0];assert.equal(t.validatedBy,'Validateur');assert.equal(purgeTitan({...state,transmissions:[changeStatus(t,'Saisi sur Titan')]}).transmissions[0].validatedBy,'Validateur');
 const rows=[t,{...t,id:'older',date:'2026-11-09',notPerformed:true},{...t,id:'cancel',status:'Annulée'},{...t,id:'done',status:'Saisi sur Titan'}];assert.equal(pendingTransmissions(rows).length,2);assert.equal(rows.filter(t=>t.status!=='Annulée').length,3);assert.equal(orderedTransmissions(rows)[0].id,'older');assert.equal(orderedTransmissions(rows,true).at(-1).id,'older');
 for(const [date,color] of [['2026-11-11','today'],['2026-11-10','yesterday'],['2026-10-31','older'],['2026-11-12','future']])assert.equal(sessionAge(date,'2026-11-11').color,color);
});
test('bulk: authorization, CSRF, atomicity, conflict, export privacy, recoverable trash and persistence',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'infinity-bulk-'));let app=createApp({directory:dir,origin:'http://localhost:31003'});const state=seed();state.transmissions=[0,1].map((n)=>({...createTransmission(state,{residentId:state.residents[n].id,date:'2026-11-11',practitioner:n?'Alexandre':'Amélie',activity:'Marche',text:'SECRET-MEDICAL',observation:'PRIVATE-OBSERVATION'}),validatedBy:'=FORMULA()'}));app.db.prepare('UPDATE state SET data=?').run(JSON.stringify(state));const clients={};for(const role of ['admin','kine','secretariat']){app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(role,role,role,role,'unused');clients[role]=newSession(app.db,role);}app.server.listen(31003,'127.0.0.1');await once(app.server,'listening');
 const call=async(route,body,role='admin',csrf=true)=>{const s=clients[role],r=await fetch('http://localhost:31003/api/'+route,{method:body?'POST':'GET',headers:{Connection:'close',Origin:'http://localhost:31003','Content-Type':'application/json',Cookie:'infinity_session='+s.token,...(csrf?{'X-CSRF-Token':s.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 try{const ids=state.transmissions.map(t=>t.id),body={ids,revision:1,confirmation:'CORBEILLE'};
 for(const role of ['kine','secretariat']){assert.equal((await call('transmissions/trash',body,role)).status,403);assert.equal((await call('trash',null,role)).status,403);assert.equal((await call('transmissions/restore',{...body,confirmation:'RESTAURER'},role)).status,403);}
 assert.equal((await call('transmissions/trash',body,'admin',false)).status,403);assert.equal((await call('transmissions/trash',{...body,confirmation:''})).status,400);assert.equal((await call('transmissions/trash',{...body,ids:[ids[0],'missing']})).status,400);assert.equal((await call('transmissions/trash',{...body,ids:[ids[0],ids[0]]})).status,400);assert.equal((await call('transmissions/trash',{...body,revision:0})).status,409);
 const exported=await call('transmissions/export',{ids,revision:1},'secretariat');assert.equal(exported.status,200);const bytes=Buffer.from(exported.data.file,'base64');assert.equal(bytes.readUInt32LE(),0x04034b50);assert.ok(!bytes.includes(Buffer.from('SECRET-MEDICAL')));assert.ok(!bytes.includes(Buffer.from('PRIVATE-OBSERVATION')));assert.ok(bytes.includes(Buffer.from('=FORMULA()')));assert.ok(!bytes.includes(Buffer.from('<f>')));
 const file=path.join(dir,'export.xlsx');writeFileSync(file,bytes);const check=spawnSync('python',['-c',`import zipfile,xml.etree.ElementTree as E,sys\nz=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None\nfor n in z.namelist(): E.fromstring(z.read(n))\nassert len(E.fromstring(z.read('xl/worksheets/sheet2.xml'))[0])==3`,file],{encoding:'utf8'});if(check.error?.code==='ENOENT')console.log('Optional Python ZIP/XML interoperability check skipped: Python unavailable.');else assert.equal(check.status,0,check.stderr);
 assert.equal((await call('transmissions/trash',body)).status,200);assert.equal((await call('state')).data.state.transmissions.length,0);assert.equal((await call('trash')).data.entries.length,2);assert.ok(!(await call('trash')).data.entries[0].finalText);
 await new Promise(r=>app.server.close(r));app.close();app=createApp({directory:dir,origin:'http://localhost:31003'});app.server.listen(31003,'127.0.0.1');await once(app.server,'listening');assert.equal((await call('trash')).data.entries.length,2);
 const restored=await call('transmissions/restore',{ids,revision:2,confirmation:'RESTAURER'});assert.equal(restored.status,200);assert.deepEqual(restored.data.state.transmissions,state.transmissions);assert.equal((await call('trash')).data.entries.length,0);const audit=(await call('audit')).data.events;assert.equal(audit.filter(e=>e.action==='transmission.trash').length,2);assert.equal(audit.filter(e=>e.action==='transmission.restore').length,2);assert.ok(!JSON.stringify(audit).includes('SECRET-MEDICAL'));
 }finally{await new Promise(r=>app.server.close(r));app.close();rmSync(dir,{recursive:true,force:true});}
});
