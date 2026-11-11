import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {createApp} from '../backend/server.js';
import {newSession} from '../backend/auth.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=mkdtempSync(path.join(tmpdir(),'infinity-startup-')),app=createApp({directory,origin:'http://localhost:31008'});let browser;
try{
 app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run('admin','admin','Compte fictif','admin','unused');const session=newSession(app.db,'admin'),before=app.db.prepare('SELECT * FROM state').get();app.server.listen(31008,'127.0.0.1');await once(app.server,'listening');browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const mode of ['normal','legacy-cache','missing-assessments','incompatible-domain','blocked-app','no-javascript']){
  const context=await browser.newContext({javaScriptEnabled:mode!=='no-javascript'});await context.addCookies([{name:'infinity_session',value:session.token,url:'http://localhost:31008'}]);await context.addInitScript(()=>localStorage.setItem('startup-sentinel','conserver'));let legacyRequests=0,assessmentsRequests=0;
  await context.route('**/src/**',async route=>{const url=new URL(route.request().url());if(url.searchParams.get('v')==='titansummary1'){legacyRequests++;if(mode==='legacy-cache'){return route.fulfill({contentType:'text/javascript',body:execFileSync('git',['show','v2.4.0^:src/domain.js'],{encoding:'utf8'})});}}
   if(url.pathname==='/src/assessments.js'){assessmentsRequests++;if(mode==='missing-assessments')return route.fulfill({status:404,contentType:'application/json',body:'{"error":"Introuvable"}'});}
   if(mode==='incompatible-domain'&&url.pathname==='/src/domain.js')return route.fulfill({contentType:'text/javascript',body:'export const today=()=>"2026-11-11";'});
   if(mode==='blocked-app'&&url.pathname==='/src/app.js')return route.abort();return route.continue();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:31008');
  if(mode==='incompatible-domain'){await page.getByRole('heading',{name:'Infinity Therapy n’a pas pu démarrer',exact:true}).waitFor();assert.ok(await page.getByRole('link',{name:'Recharger Infinity Therapy',exact:true}).isVisible());}
  else if(mode==='blocked-app'||mode==='no-javascript'){assert.ok((await page.locator('#app').innerText()).includes('Si ce message persiste'));}
  else{await page.locator('#logout').waitFor();assert.equal(assessmentsRequests,0,'Bilans must not block initial startup');await page.getByRole('button',{name:'Bilans résidents',exact:true}).click();if(mode==='missing-assessments'){await page.getByText(/Le module Bilans n’a pas pu être chargé/).waitFor();await page.getByRole('button',{name:'Kiné',exact:true}).click();await page.locator('#transmission-form').waitFor();}else await page.locator('#assessment-new').waitFor();}
  if(mode!=='no-javascript'){assert.equal(await page.evaluate(()=>localStorage.getItem('startup-sentinel')),'conserver');assert.deepEqual(errors,[]);}assert.equal(legacyRequests,0,'All module imports must use the new version');assert.ok((await page.locator('#app').innerText()).length>0);await context.close();
 }
 assert.deepEqual(app.db.prepare('SELECT * FROM state').get(),before);console.log('PASS startup: normal private startup, old cache avoided, missing Bilans module isolated, incompatible modules caught, blocked JavaScript visible, storage and database preserved.');
}finally{await browser?.close();if(app.server.listening)await new Promise(r=>app.server.close(r));app.close();rmSync(directory,{recursive:true,force:true});}
