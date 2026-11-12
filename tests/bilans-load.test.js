import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,cpSync,unlinkSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createApp} from '../backend/server.js';
import {diagnoseBilans} from '../scripts/diagnose-bilans.js';
const root=fileURLToPath(new URL('../',import.meta.url)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(readFileSync(new URL('../scripts/bilans-runtime-manifest.json',import.meta.url),'utf8'));
test('read-only diagnosis identifies the exact missing compact route even if the file is present',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'bilans-diagnose-'));let app;
 try{const appRoot=path.join(directory,'project');mkdirSync(appRoot);for(const file of ['server.js','package.json','index.html'])cpSync(path.join(root,file),path.join(appRoot,file));for(const dir of ['backend','src','assets'])cpSync(path.join(root,dir),path.join(appRoot,dir),{recursive:true});const backend=path.join(appRoot,'backend/server.js');const official=readFileSync(backend,'utf8');writeFileSync(backend,official.replace(",'/src/assessments-compact.js':'src/assessments-compact.js'",''));
 const {createApp:createFixture}=await import(pathToFileURL(backend));app=createFixture({directory:path.join(directory,'test-data'),origin:'http://localhost:3000'});const before=app.db.prepare('SELECT * FROM state').get();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 const result=await diagnoseBilans({project:appRoot,base,manifest,checkSyntax:false});assert.ok(result.routes.missing.includes('/src/assessments-compact.js'));assert.equal(result.http.find(r=>r.file==='src/assessments-compact.js').status,404);assert.ok(result.conclusions.some(c=>c.includes('route manquante confirmée')));assert.deepEqual(app.db.prepare('SELECT * FROM state').get(),before);
 // Disk fixed but running Node still executes old function: this reproduces stale in-memory routing.
 writeFileSync(backend,official);const stale=await diagnoseBilans({project:appRoot,base,manifest,checkSyntax:false});assert.deepEqual(stale.routes.missing,[]);assert.ok(stale.conclusions.some(c=>c.includes('ancienne version')));
 }finally{if(app?.server.listening)await new Promise(r=>app.server.close(r));app?.close();rmSync(directory,{recursive:true,force:true});}
});
test('registered but missing JS returns real HTTP 404 JSON, not an empty HTTP 200 module',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'bilans-static-missing-'));let app;
 try{for(const file of ['package.json','index.html'])cpSync(path.join(root,file),path.join(directory,file));for(const dir of ['backend','src','assets'])cpSync(path.join(root,dir),path.join(directory,dir),{recursive:true});const {createApp:createFixture}=await import(pathToFileURL(path.join(directory,'backend/server.js')));app=createFixture({directory:path.join(directory,'data'),origin:'http://localhost:3000'});unlinkSync(path.join(directory,'src/assessments-compact.js'));app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const response=await fetch('http://127.0.0.1:'+app.server.address().port+'/src/assessments-compact.js?v=2.6.1');assert.equal(response.status,404);assert.match(response.headers.get('content-type'),/application\/json/);assert.deepEqual(await response.json(),{error:'Fichier statique absent : src/assessments-compact.js'});
 }finally{if(app?.server.listening)await new Promise(r=>app.server.close(r));app?.close();rmSync(directory,{recursive:true,force:true});}
});
test('diagnosis checks schema metadata in read-only mode without returning or modifying clinical rows',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'bilans-schema-'));try{const file=path.join(directory,'test.sqlite'),db=new DatabaseSync(file);db.exec("CREATE TABLE assessments(id TEXT, data TEXT); INSERT INTO assessments VALUES('patient-private-id','PRIVATE-CLINICAL-TEXT');");db.close();const before=hash(readFileSync(file));const result=await diagnoseBilans({project:root,manifest,dataFile:file,checkSyntax:false});assert.equal(result.schema.assessments.present,true);assert.equal(result.schema.assessment_tracking.present,false);assert.ok(result.conclusions.some(c=>c.includes('schéma configuré est incomplet')));const output=JSON.stringify(result);assert.ok(!output.includes('PRIVATE-CLINICAL-TEXT'));assert.ok(!output.includes('patient-private-id'));assert.equal(hash(readFileSync(file)),before);}finally{rmSync(directory,{recursive:true,force:true});}
});

test('runtime manifest matches every shipped file and all source files pass syntax validation',async()=>{const result=await diagnoseBilans({project:root,manifest});assert.ok(result.checks.length>15);assert.ok(result.checks.every(c=>c.state==='target'),JSON.stringify(result.checks.filter(c=>c.state!=='target')));assert.ok(result.checks.every(c=>c.syntax===undefined||c.syntax==='valid'));});
