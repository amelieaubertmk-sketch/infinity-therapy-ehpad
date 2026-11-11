import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../backend/server.js';
import {newSession} from '../backend/auth.js';
import {seed,createTransmission,today} from '../src/domain.js';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=mkdtempSync(path.join(tmpdir(),'infinity-ergonomics-')),app=createApp({directory,origin:'http://localhost:31005'});let browser;
try{
 const state=seed(),yesterday=new Date(today()+'T12:00:00');yesterday.setDate(yesterday.getDate()-1);const dateYesterday=`${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
 state.transmissions=['2025-01-01',today(),dateYesterday,today()].map((date,n)=>createTransmission(state,{residentId:state.residents[n].id,date,practitioner:n%2?'Alexandre':'Amélie',activity:'Marche',text:'FICTIF uniquement'}));app.db.prepare('UPDATE state SET data=?').run(JSON.stringify(state));
 const sessions={};for(const role of ['admin','kine','secretariat']){app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(role,role,role,role,'unused');sessions[role]=newSession(app.db,role);}
 const before=app.db.prepare('SELECT data,revision FROM state').get();app.server.listen(31005,'127.0.0.1');await once(app.server,'listening');browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const mobile of [false,true])for(const role of ['admin','kine','secretariat']){
  const context=await browser.newContext(mobile?{...devices['iPhone 13'],defaultBrowserType:undefined}:{viewport:{width:1440,height:1000}});await context.addCookies([{name:'infinity_session',value:sessions[role].token,url:'http://localhost:31005'}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:31005');if(role!=='secretariat')await page.getByRole('button',{name:'Transmissions à saisir dans Titan'}).click();
  for(const selector of ['[data-select]','#select-all','#export-selected','#trash-selected','#open-trash'])assert.equal(await page.locator(selector).count(),0,selector+' hidden pending');
  for(const [color,count] of [['today',2],['yesterday',1],['older',1]])assert.equal(await page.locator('.session-age.'+color).count(),count);
  assert.match(await page.locator('tbody tr').first().innerText(),/01\/01\/2025/);
  await page.locator('#group-practitioner').check();assert.match(await page.locator('tbody th').first().innerText(),/AMÉLIE · 2/);assert.match(await page.locator('tbody th').last().innerText(),/ALEXANDRE · 2/);
  assert.equal(await page.locator('.practitioner-heading.amelie th').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(252, 231, 241)');assert.equal(await page.locator('.practitioner-heading.alexandre th').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(226, 241, 255)');assert.equal(await page.locator('.practitioner-row').count(),0);assert.equal(await page.locator('.session-age.today').count(),2);
  await page.locator('#group-practitioner').uncheck();assert.equal(await page.locator('.practitioner-heading').count(),0);
  await page.locator('#toggle-history').click();assert.equal(await page.locator('.session-age').count(),0);assert.match(await page.locator('tbody tr').last().innerText(),/01\/01\/2025/);assert.equal(await page.locator('[data-select]').count(),4);await page.locator('#select-all').check();assert.equal(await page.locator('[data-select]:checked').count(),4);assert.ok(await page.locator('#export-selected').isVisible());assert.equal(await page.locator('#trash-selected').count(),role==='admin'?1:0);assert.equal(await page.locator('#open-trash').count(),role==='admin'?1:0);
  await page.locator('#group-practitioner').check();assert.equal(await page.locator('.practitioner-row.amelie').count(),2);assert.equal(await page.locator('.practitioner-row.alexandre').count(),2);assert.equal(await page.locator('.practitioner-row.amelie td').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(252, 231, 241)');assert.equal(await page.locator('.practitioner-row.alexandre td').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(226, 241, 255)');assert.equal(await page.locator('.session-age').count(),0);
  assert.match(await page.locator('.practitioner-row.amelie').last().innerText(),/01\/01\/2025/);
  await page.locator('#filter-practitioner').selectOption('Amélie');assert.equal(await page.locator('.practitioner-heading').count(),1);assert.match(await page.locator('tbody th').innerText(),/AMÉLIE · 2/);assert.equal(await page.locator('[data-select]:checked').count(),0);
  await page.locator('#group-practitioner').uncheck();assert.equal(await page.locator('#filter-practitioner').inputValue(),'Amélie');assert.equal(await page.locator('.practitioner-row').count(),0);assert.equal(await page.locator('[data-select]').count(),2);
  await page.locator('#clear-filters').click();await page.locator('#toggle-history').click();assert.equal(await page.locator('#select-all').count(),0);assert.equal(await page.locator('.session-age').count(),4);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  await page.screenshot({path:`/tmp/infinity-2.4.1-${mobile?'iphone':'desktop'}-${role}.png`,fullPage:true});await context.close();
 }
 assert.deepEqual(app.db.prepare('SELECT data,revision FROM state').get(),before);console.log('PASS ergonomics: desktop and emulated iPhone, 3 roles, pending/history controls, exact group colors/counts, date colors, neutral history, grouping toggles, filters, chronology, no state writes.');
}finally{await browser?.close();if(app.server.listening)await new Promise(r=>app.server.close(r));app.close();rmSync(directory,{recursive:true,force:true});}
