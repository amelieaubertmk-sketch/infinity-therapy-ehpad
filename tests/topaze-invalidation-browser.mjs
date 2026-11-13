import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../backend/server.js';
import {hashPassword} from '../backend/auth.js';
import {seed,createTransmission,changeStatus,purgeTitan} from '../src/domain.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=mkdtempSync(path.join(tmpdir(),'infinity-invalidation-')),origin='http://localhost:31013';let app=createApp({directory,origin}),browser;
try{
 const state=seed(),resident=state.residents[0];resident.prescription={status:'dated',date:'2026-01-01'};
 const t=createTransmission(state,{residentId:resident.id,date:'2026-11-13',activity:'Marche',practitioner:'Amélie',text:'Fictif'});state.transmissions=[changeStatus(t,'Saisi sur Titan')];app.db.prepare('UPDATE state SET data=?').run(JSON.stringify(purgeTitan(state)));
 const password='Fictitious-only-password-123';app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run('admin','admin','Admin fictif','admin',await hashPassword(password));
 async function start(){app.server.listen(31013,'127.0.0.1');await once(app.server,'listening');}await start();
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage();
 async function login(){await page.goto(origin);await page.locator('#username').fill('admin');await page.locator('#password').fill(password);await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.getByRole('button',{name:'Boss',exact:true}).waitFor();}
 async function history(){await page.getByRole('button',{name:'Kiné',exact:true}).click();await page.getByRole('button',{name:'Transmissions à saisir dans Titan'}).click();if(await page.getByRole('button',{name:'Voir l’historique',exact:true}).count())await page.getByRole('button',{name:'Voir l’historique',exact:true}).click();}
 async function prescription(missing){await page.getByRole('button',{name:'Boss',exact:true}).click();await page.locator(`[data-prescription="${resident.id}"]`).click();if(missing)await page.locator('#prescription-missing').check();else{await page.locator('#prescription-status').selectOption('dated');await page.locator('#prescription-date').fill('2026-11-13');}await page.getByRole('button',{name:'Enregistrer l’ordonnance',exact:true}).click();await page.locator('#modal').waitFor({state:'hidden'});await history();}
 await login();await history();assert.equal(await page.locator('tbody .badge').innerText(),'Saisi sur Titan');await page.locator('[data-topaze]').click();await page.locator('.badge.topaze').waitFor();
 await prescription(true);assert.equal(await page.locator('tbody .badge').innerText(),'Saisi sur Titan');assert.equal(await page.locator('.badge.topaze').count(),0);assert.equal(await page.locator('[data-topaze]').count(),0);assert.equal(await page.locator('tbody .resident-code').evaluate(el=>getComputedStyle(el).color),'rgb(180, 35, 24)');
 await page.getByRole('button',{name:'Voir le suivi',exact:true}).click();await page.getByText(/Aucune annulation n’a été effectuée dans Topaze/).waitFor();assert.equal(await page.locator('#modal .badge').innerText(),'Saisi sur Titan');await page.getByRole('button',{name:'Fermer',exact:true}).click();
 await page.reload();await history();assert.equal(await page.locator('tbody .badge').innerText(),'Saisi sur Titan');assert.equal(await page.locator('[data-topaze]').count(),0);
 await prescription(false);assert.equal(await page.locator('.badge.topaze').count(),0);assert.equal(await page.locator('[data-topaze]').count(),1);
 page.once('dialog',d=>d.dismiss());await page.locator('[data-topaze]').click();assert.equal(await page.locator('.badge.topaze').count(),0);
 page.once('dialog',d=>d.accept());await page.locator('[data-topaze]').click();await page.locator('.badge.topaze').waitFor();assert.equal(await page.locator('tbody [data-open]').count(),1);assert.equal(await page.locator('[data-topaze]').count(),0);
 await prescription(true);await page.getByRole('button',{name:'Se déconnecter',exact:true}).click();await new Promise(r=>app.server.close(r));app.close();app=createApp({directory,origin});await start();await login();await history();assert.equal(await page.locator('tbody .badge').innerText(),'Saisi sur Titan');assert.equal(await page.locator('[data-topaze]').count(),0);assert.equal(await page.locator('tbody .badge.topaze').count(),0);
 assert.equal(JSON.parse(app.db.prepare('SELECT data FROM state').get().data).transmissions[0].topazeHistory.length,2);
 console.log('PASS: missing prescription wins over prior Topaze, red code, no pointage button, follow-up warning, no automatic restoration, explicit re-confirmation, refresh and restart.');
}finally{await browser?.close();if(app.server.listening)await new Promise(r=>app.server.close(r));app.close();rmSync(directory,{recursive:true,force:true});}
