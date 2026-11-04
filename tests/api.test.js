import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {backup,DatabaseSync} from 'node:sqlite';
import {createApp} from '../backend/server.js';
import {hashPassword} from '../backend/auth.js';
import {createTransmission,changeStatus,cancelTransmission} from '../src/domain.js';

test('private server: accounts, RBAC, synchronization, conflicts, restart, backup and outage',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'infinity-api-'));let app,base;
 async function start(){app=createApp({directory,origin:'http://localhost:31002'});app.server.listen(31002,'127.0.0.1');await once(app.server,'listening');base='http://localhost:'+app.server.address().port;}
 async function stop(){await new Promise(r=>app.server.close(r));app.close();}
 async function request(route,{method='GET',body,client,origin='http://localhost:31002',csrf=true}={}){if(client?.role==='secretariat'&&body?.state)body={...body,state:{...body.state,residents:body.state.residents.map(r=>({...r,templates:{}}))}};const r=await fetch(base+route,{method,headers:{Host:'localhost:31002',Origin:origin,'Content-Type':'application/json',...(client?{Cookie:client.cookie,...(csrf?{'X-CSRF-Token':client.csrf}:{})}:{})},...(body?{body:JSON.stringify(body)}:{})});return {code:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};}
 try{
 await start();const password=await hashPassword('Fictitious-only-password-123');
 for(const role of ['admin','kine','secretariat'])app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(role,role,'Compte fictif '+role,role,password);
 assert.equal((await request('/api/state')).code,401);
 const clients={};for(const role of ['admin','kine','secretariat']){const r=await request('/api/login',{method:'POST',body:{username:role,password:'Fictitious-only-password-123'}});assert.equal(r.code,200);assert.match(r.cookie,/HttpOnly/);assert.match(r.cookie,/SameSite=Strict/);clients[role]={role,csrf:r.data.csrf,cookie:r.cookie.split(';')[0]};}
 assert.equal((await request('/api/users',{client:clients.kine})).code,403);
 assert.equal((await request('/api/audit',{client:clients.secretariat})).code,403);
 let state=(await request('/api/state',{client:clients.kine})).data;assert.ok((await request('/api/state',{client:clients.secretariat})).data.state.residents.every(r=>Object.keys(r.templates).length===0));
 const residents=structuredClone(state.state.residents);residents[0].code='MOD.';
 assert.equal((await request('/api/state',{method:'PUT',client:clients.kine,body:{revision:state.revision,state:{...state.state,residents}}})).code,403);
 const transmission=createTransmission(state.state,{residentId:state.state.residents[0].id,date:'2026-11-04',activity:'Marche',practitioner:'Alexandre',text:'Transmission fictive partagée.',observation:'Observation fictive.'});
 const proposed={...state.state,transmissions:[transmission]};
 assert.equal((await request('/api/state',{method:'PUT',client:clients.secretariat,body:{revision:state.revision,state:proposed}})).code,403);
 assert.equal((await request('/api/state',{method:'PUT',client:clients.kine,csrf:false,body:{revision:state.revision,state:proposed}})).code,403);
 assert.equal((await request('/api/state',{method:'PUT',client:clients.kine,origin:'https://evil.invalid',body:{revision:state.revision,state:proposed}})).code,403);
 let write=await request('/api/state',{method:'PUT',client:clients.kine,body:{revision:state.revision,state:proposed}});assert.equal(write.code,200);const created=write.data.state.transmissions[0];assert.equal(created.createdBy,'kine');assert.notEqual(created.id,transmission.id);
 assert.equal((await request('/api/state',{client:clients.secretariat})).data.state.transmissions[0].finalText,created.finalText);
 assert.equal((await request('/api/state',{method:'PUT',client:clients.admin,body:{revision:state.revision,state:{...state.state,residents}}})).code,409);
 state=write.data;
 const altered={...created,finalText:'Tampered text',status:'Saisi sur Titan'};
 assert.equal((await request('/api/state',{method:'PUT',client:clients.secretariat,body:{revision:state.revision,state:{...state.state,transmissions:[altered]}}})).code,400);
 const done=changeStatus(created,'Saisi sur Titan');write=await request('/api/state',{method:'PUT',client:clients.secretariat,body:{revision:state.revision,state:{...state.state,transmissions:[done]}}});assert.equal(write.code,200);state=(await request('/api/state',{client:clients.admin})).data;
 assert.equal((await request('/api/state',{client:clients.kine})).data.state.transmissions[0].status,'Saisi sur Titan');
 const cancelled=cancelTransmission(state.state.transmissions[0],'Erreur fictive');assert.equal((await request('/api/state',{method:'PUT',client:clients.secretariat,body:{revision:state.revision,state:{...state.state,transmissions:[cancelled]}}})).code,403);
 write=await request('/api/state',{method:'PUT',client:clients.admin,body:{revision:state.revision,state:{...state.state,transmissions:[cancelled]}}});assert.equal(write.code,200);state=write.data;
 assert.equal(state.state.transmissions[0].finalText,created.finalText);
 // Admin can maintain users, with no password/hash returned.
 assert.equal(await new Promise((resolve,reject)=>{const r=http.get(base+'/api/state',{headers:{host:'127.0.0.1:31002',cookie:clients.admin.cookie}},response=>{response.resume();resolve(response.statusCode);});r.on('error',reject);}),200);
 const users=await request('/api/users',{client:clients.admin});assert.ok(users.data.users.every(u=>!('password'in u)));
 assert.equal((await request('/api/users',{method:'POST',client:clients.admin,body:{username:'fourth',name:'Test fictif',role:'kine',active:true,password:'Another-fictitious-password-123'}})).code,200);
 const events=(await request('/api/audit',{client:clients.admin})).data.events;assert.ok(events.some(e=>e.action==='transmission.cancel'));assert.ok(!JSON.stringify(events).includes('Transmission fictive'));
 const file=path.join(directory,'backup.sqlite');await backup(app.db,file);const saved=new DatabaseSync(file,{readOnly:true});assert.equal(JSON.parse(saved.prepare('SELECT data FROM state').get().data).transmissions[0].status,'Annulée');assert.equal(saved.prepare('PRAGMA integrity_check').get().integrity_check,'ok');saved.close();
 const restoredDir=path.join(directory,'restored');const restore=spawnSync(process.execPath,['scripts/restore.js',file,'--server-stopped'],{env:{...process.env,INFINITY_DATA_DIR:restoredDir},encoding:'utf8'});assert.equal(restore.status,0,restore.stderr);const restoredDb=new DatabaseSync(path.join(restoredDir,'demo.sqlite'));assert.equal(JSON.parse(restoredDb.prepare('SELECT data FROM state').get().data).transmissions[0].status,'Annulée');assert.equal(restoredDb.prepare('SELECT count(*) AS n FROM sessions').get().n,0);restoredDb.close();
 await stop();await assert.rejects(()=>fetch(base+'/api/state'));await start();const restored=(await request('/api/state',{client:clients.admin})).data;assert.equal(restored.state.transmissions[0].status,'Annulée');assert.equal(restored.revision,state.revision);
 const secret=app.db.prepare('SELECT * FROM users WHERE id=?').get('secretariat');assert.equal((await request('/api/users',{method:'POST',client:clients.admin,body:{id:secret.id,username:secret.username,name:secret.name,role:secret.role,active:false}})).code,200);assert.equal((await request('/api/state',{client:clients.secretariat})).code,401);
 assert.equal(await new Promise((resolve,reject)=>{const r=http.get(base+'/',{headers:{host:'evil.invalid'}},response=>{response.resume();resolve(response.statusCode);});r.on('error',reject);}),403);
 console.log('Verified three separate accounts, server-side permissions, shared state, immutable history, stale-write rejection, CSRF, audit, restart, consistent backup and unavailable server.');
 }finally{if(app?.server.listening)await stop();rmSync(directory,{recursive:true,force:true});}
});
