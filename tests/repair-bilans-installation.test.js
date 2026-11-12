import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {createHash} from 'node:crypto';
import {prepareRepair,applyRepair,verifyRepair} from '../scripts/repair-bilans-installation.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const digest=b=>createHash('sha256').update(b).digest('hex');
function fixture(){const directory=mkdtempSync(path.join(tmpdir(),'bilans-real-repair-')),project=path.join(directory,'configured-project');mkdirSync(project);for(const file of ['package.json','server.js','index.html'])cpSync(path.join(root,file),path.join(project,file));for(const dir of ['backend','src','assets'])cpSync(path.join(root,dir),path.join(project,dir),{recursive:true});return {directory,project};}
function snapshot(project){return Object.fromEntries(['backend/database.js','backend/assessments.js','backend/mutations.js','src/domain.js','src/store.js','src/app.js'].map(file=>[file,digest(readFileSync(path.join(project,file)))]));}
test('configured deployment: real 404 with file present becomes HTTP 200 for every module after route repair and restart',async()=>{
 const {directory,project}=fixture();let app;
 try{
  const file=path.join(project,'backend/server.js'),original=readFileSync(file,'utf8');writeFileSync(file,original.replace(",'/src/assessments-compact.js':'src/assessments-compact.js'",''));
  const {createApp}=await import(pathToFileURL(file));app=createApp({directory:path.join(directory,'persistent-data'),origin:'http://localhost:3000'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  const base='http://127.0.0.1:'+app.server.address().port;const before=app.db.prepare('SELECT * FROM state').get();const codeBefore=snapshot(project);
  assert.equal((await fetch(base+'/src/assessments-compact.js?v=2.6.1')).status,404);
  assert.equal((await verifyRepair({project,base})).ok,false);
  const port=app.server.address().port;await app.close();await new Promise(r=>app.server.close(r));app=null;
  const result=await applyRepair({project,port,backup:path.join(directory,'backup')});assert.deepEqual(result.changed,['backend/server.js']);assert.deepEqual(result.missingRoutes,['/src/assessments-compact.js']);
  assert.equal(readFileSync(path.join(project,'backend/server.js'),'utf8'),original,'repair only restores the missing static mapping');assert.deepEqual(snapshot(project),codeBefore);
  const restarted=await import(pathToFileURL(file).href+'?restart=1');app=restarted.createApp({directory:path.join(directory,'persistent-data'),origin:'http://localhost:3000'});app.server.listen(port,'127.0.0.1');await once(app.server,'listening');
  const verified=await verifyRepair({project,base});assert.equal(verified.ok,true,JSON.stringify(verified));assert.equal(verified.http.length,7);assert.deepEqual(app.db.prepare('SELECT * FROM state').get(),before);
 }finally{if(app?.server.listening)await new Promise(r=>app.server.close(r));app?.close();rmSync(directory,{recursive:true,force:true});}
});
test('missing module restored from official package; incompatible dependencies and active server refuse any write',async()=>{
 const {directory,project}=fixture(),listener=createServer();
 try{
  const compact=path.join(project,'src/assessments-compact.js');unlinkSync(compact);const plan=prepareRepair({project});assert.deepEqual(plan.replacements.map(e=>e.file),['src/assessments-compact.js']);
  listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port,backup=path.join(directory,'backup');
  await assert.rejects(applyRepair({project,port,backup}),/encore actif/);assert.ok(!existsSync(compact));assert.ok(!existsSync(backup));await new Promise(r=>listener.close(r));
  await applyRepair({project,port,backup});assert.equal(readFileSync(compact,'utf8'),readFileSync(path.join(root,'src/assessments-compact.js'),'utf8'));assert.equal(JSON.parse(readFileSync(path.join(backup,'manifest.json'))).files[0].existed,false);
  writeFileSync(path.join(project,'backend/assessments.js'),'// incompatible');assert.throws(()=>prepareRepair({project}),/Version incompatible/);
  assert.throws(()=>prepareRepair({project:root}),/distinct/);
 }finally{if(listener.listening)await new Promise(r=>listener.close(r));rmSync(directory,{recursive:true,force:true});}
});
