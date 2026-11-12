import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {createApp} from '../backend/server.js';
import {planStaticRouteRepair} from '../scripts/repair-static-routes.js';
const root=fileURLToPath(new URL('../',import.meta.url));
function moduleGraph(){
 const html=readFileSync(path.join(root,'index.html'),'utf8'),pending=[];
 for(const tag of html.matchAll(/<script\b[^>]*>/gi)){if(/\btype\s*=\s*["']module["']/i.test(tag[0])){const src=tag[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i);if(src)pending.push(new URL(src[1],'http://localhost/'));}}
 assert.ok(pending.length,'HTML must declare a module entry');const visited=new Map();
 while(pending.length){const url=pending.pop();assert.equal(url.origin,'http://localhost');if(visited.has(url.href))continue;assert.ok(url.pathname.startsWith('/src/'));const source=readFileSync(path.join(root,url.pathname.slice(1)),'utf8');visited.set(url.href,{url,source});
  for(const pattern of [/\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.{1,2}\/[^'"]+)['"]/g,/\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g])for(const match of source.matchAll(pattern))pending.push(new URL(match[1],url));
 }
 return [...visited.values()];
}
test('HTTP: all static and dynamic browser imports return exact JavaScript, 200 and MIME, from another cwd',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'infinity-static-')),cwd=process.cwd();let app;
 try{const graph=moduleGraph(),names=new Set(graph.map(({url})=>url.pathname));for(const file of ['app','domain','store','demo-store','assessments','assessments-domain','assessments-compact'])assert.ok(names.has('/src/'+file+'.js'),'discovered '+file);process.chdir(directory);app=createApp({directory,origin:'http://localhost:3000'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 for(const {url,source} of graph)for(const suffix of [url.search,'','?v=2.5.0']){const response=await fetch(base+url.pathname+suffix);assert.equal(response.status,200,url.pathname+suffix);assert.match(response.headers.get('content-type'),/^(?:text|application)\/javascript(?:;|$)/i);assert.equal(await response.text(),source,url.pathname+' must be the module, not a JSON/HTML fallback');}
 for(const route of ['/backend/server.js','/scripts/repair-static-routes.js','/package.json','/src/unknown.js'])assert.equal((await fetch(base+route)).status,404,route);
 console.log(`Verified ${names.size} JavaScript modules, original queries, unversioned URLs and ?v=2.5.0; source matches expected project despite different cwd.`);
 }finally{process.chdir(cwd);if(app?.server.listening)await new Promise(r=>app.server.close(r));app?.close();rmSync(directory,{recursive:true,force:true});}
});
test('repair plan only adds the three missing public routes, preserves other source and refuses ambiguous mappings',()=>{
 const original="const marker='conserver'; const files={'/src/app.js':'src/app.js'}; const databaseRule='inchangée';";const result=planStaticRouteRepair(original);assert.equal(result.missing.length,3);assert.equal(result.source,"const marker='conserver'; const files={'/src/app.js':'src/app.js','/src/assessments.js':'src/assessments.js','/src/assessments-domain.js':'src/assessments-domain.js','/src/assessments-compact.js':'src/assessments-compact.js'}; const databaseRule='inchangée';");assert.deepEqual(planStaticRouteRepair(result.source),{source:result.source,missing:[]});assert.ok(planStaticRouteRepair('const files={};').source.startsWith("const files={'/src/assessments.js'"));assert.throws(()=>planStaticRouteRepair('unrecognized server'));assert.throws(()=>planStaticRouteRepair("const files={'/src/assessments.js':'private.js'};"));
});
test('repair CLI: running server refused, stopped server backed up, repair idempotent and persistent files untouched',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'infinity-repair-')),run=promisify(execFile),tool=path.join(root,'scripts','repair-static-routes.js');const listener=createServer();
 try{mkdirSync(path.join(directory,'backend'));mkdirSync(path.join(directory,'src'));writeFileSync(path.join(directory,'server.js'),"import './backend/server.js';");for(const file of ['assessments','assessments-domain','assessments-compact'])writeFileSync(path.join(directory,'src',file+'.js'),'// fixture');const original="const files={'/src/app.js':'src/app.js'};";writeFileSync(path.join(directory,'backend','server.js'),original);writeFileSync(path.join(directory,'persistent-sentinel'),'DONNEES A CONSERVER');const backup=path.join(directory,'server-before.js');listener.listen(0,'127.0.0.1');await once(listener,'listening');const args=[tool,'--project',directory,'--port',String(listener.address().port),'--backup',backup,'--apply'];await assert.rejects(()=>run(process.execPath,args));assert.equal(readFileSync(path.join(directory,'backend','server.js'),'utf8'),original);assert.ok(!existsSync(backup));await new Promise(r=>listener.close(r));await run(process.execPath,args);assert.equal(readFileSync(backup,'utf8'),original);const repaired=readFileSync(path.join(directory,'backend','server.js'),'utf8');assert.deepEqual(planStaticRouteRepair(repaired).missing,[]);await run(process.execPath,args);assert.equal(readFileSync(path.join(directory,'backend','server.js'),'utf8'),repaired);assert.equal(readFileSync(path.join(directory,'persistent-sentinel'),'utf8'),'DONNEES A CONSERVER');
 }finally{if(listener.listening)await new Promise(r=>listener.close(r));rmSync(directory,{recursive:true,force:true});}
});
