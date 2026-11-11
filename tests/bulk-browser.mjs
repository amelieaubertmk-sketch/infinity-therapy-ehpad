import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../backend/server.js';
import {newSession} from '../backend/auth.js';
import {seed,createTransmission,today} from '../src/domain.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=mkdtempSync(path.join(tmpdir(),'infinity-bulk-browser-')),app=createApp({directory,origin:'http://localhost:31004'});let browser;
try{
 const state=seed();state.transmissions=['2026-01-01',today()].map((date,n)=>createTransmission(state,{residentId:state.residents[n].id,date,practitioner:n?'Alexandre':'Amélie',activity:'Marche',text:'FICTIF uniquement'}));app.db.prepare('UPDATE state SET data=?').run(JSON.stringify(state));app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run('admin','admin','Admin fictif','admin','unused');const session=newSession(app.db,'admin');app.server.listen(31004,'127.0.0.1');await once(app.server,'listening');
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await browser.newContext({acceptDownloads:true});await context.addCookies([{name:'infinity_session',value:session.token,url:'http://localhost:31004'}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let accept=false;page.on('dialog',d=>accept?d.accept():d.dismiss());await page.goto('http://localhost:31004');await page.getByRole('button',{name:'Transmissions à saisir dans Titan'}).click();
 assert.match(await page.locator('tbody tr').first().innerText(),/01\/01\/2026/);assert.equal(await page.locator('.session-age.older').count(),1);assert.equal(await page.locator('.session-age.today').count(),1);
 await page.locator('[data-select]').first().check();assert.ok(await page.locator('#select-all').evaluate(e=>e.indeterminate));await page.locator('#select-all').check();assert.equal(await page.locator('[data-select]:checked').count(),2);
 const download=page.waitForEvent('download');await page.locator('#export-selected').click();assert.match((await download).suggestedFilename(),/\.xlsx$/);
 await page.locator('#filter-practitioner').selectOption('Amélie');assert.equal(await page.locator('[data-select]').count(),1);assert.equal(await page.locator('[data-select]:checked').count(),0);await page.locator('#clear-filters').click();await page.locator('#group-practitioner').check();assert.equal(await page.locator('tbody th').count(),2);await page.locator('#group-practitioner').uncheck();
 await page.locator('#select-all').check();await page.locator('#trash-selected').click();assert.equal(await page.locator('[data-select]').count(),2);accept=true;const removed=page.waitForResponse(r=>r.url().endsWith('/api/transmissions/trash'));await page.locator('#trash-selected').click();assert.equal((await removed).status(),200);await page.getByText('Aucune transmission pour ces critères.',{exact:true}).waitFor();await page.locator('#open-trash').click();await page.locator('#trash-all').check();const restored=page.waitForResponse(r=>r.url().endsWith('/api/transmissions/restore'));await page.locator('#restore-selected').click();assert.equal((await restored).status(),200);await page.locator('[data-select]').first().waitFor();assert.equal(await page.locator('[data-select]').count(),2);
 await page.locator('#toggle-history').click();assert.match(await page.locator('tbody tr').last().innerText(),/01\/01\/2026/);assert.deepEqual(errors,[]);console.log('PASS bulk browser: selection, indeterminate state, local download, filter reset, grouping, colors, chronology, cancelled confirmation, trash and restore.');
}finally{await browser?.close();if(app.server.listening)await new Promise(r=>app.server.close(r));app.close();rmSync(directory,{recursive:true,force:true});}
