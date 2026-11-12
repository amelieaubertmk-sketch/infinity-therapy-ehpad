import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {createApp} from '../backend/server.js';
import {hashPassword} from '../backend/auth.js';
import {seed,createTransmission} from '../src/domain.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=mkdtempSync(path.join(tmpdir(),'infinity-prescription-ui-')),origin='http://localhost:31012';let app=createApp({directory,origin}),browser;
try{
 const state=seed(),resident=state.residents[0];state.transmissions=[createTransmission(state,{residentId:resident.id,date:'2026-11-13',activity:'Marche',practitioner:'Amélie',text:'Fictif'})];app.db.prepare('UPDATE state SET data=?').run(JSON.stringify(state));
 const password=randomBytes(24).toString('hex');app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run('admin','admin','Admin fictif','admin',await hashPassword(password));
 async function start(){app.server.listen(31012,'127.0.0.1');await once(app.server,'listening');}await start();
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function login(){await page.goto(origin);await page.locator('#username').fill('admin');await page.locator('#password').fill(password);await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.getByRole('button',{name:'Boss',exact:true}).waitFor();}
 async function boss(){await page.getByRole('button',{name:'Boss',exact:true}).click();await page.locator('[data-prescription]').first().waitFor();}
 async function history(){await page.getByRole('button',{name:'Kiné',exact:true}).click();await page.getByRole('button',{name:'Transmissions à saisir dans Titan'}).click();if(await page.getByRole('button',{name:'Voir l’historique',exact:true}).count())await page.getByRole('button',{name:'Voir l’historique',exact:true}).click();}
 async function edit(){await page.locator(`[data-prescription="${resident.id}"]`).click();}
 async function save(){await page.getByRole('button',{name:'Enregistrer l’ordonnance',exact:true}).click();await page.locator('#modal').waitFor({state:'hidden'});}
 await login();await boss();const row=page.locator('#resident-rows tr').filter({hasText:resident.code});assert.match(await row.innerText(),/Non renseigné/);
 await edit();await page.locator('#prescription-missing').check();assert.equal(await page.locator('#prescription-date').isDisabled(),true);await save();assert.match(await row.innerText(),/Pas d’ordo/);assert.equal(await row.locator('.resident-code').evaluate(el=>getComputedStyle(el).color),'rgb(180, 35, 24)');
 await history();assert.equal(await page.locator('[data-topaze]').isDisabled(),true);await page.getByText('Ordonnance manquante',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Voir le suivi',exact:true}).isEnabled(),true);
 await page.reload();await history();assert.equal(await page.locator('[data-topaze]').isDisabled(),true);
 await boss();await edit();await page.locator('#prescription-status').selectOption('dated');await page.locator('#prescription-date').fill('2020-01-01');await save();assert.match(await row.innerText(),/rappel dépassé/);assert.match(await row.innerText(),/01\/01\/2021/);
 await history();assert.equal(await page.locator('[data-topaze]').isEnabled(),true);assert.equal(await page.getByText('Ordonnance manquante',{exact:true}).count(),0);assert.equal(await page.locator('.resident-code.prescription-missing').count(),0);
 await boss();await edit();await page.locator('#prescription-missing').check();await save();assert.ok(!JSON.parse(app.db.prepare('SELECT data FROM state').get().data).residents[0].prescription.date);assert.doesNotMatch(await row.innerText(),/2020/);
 await edit();await page.locator('#prescription-missing').uncheck();await save();assert.match(await row.innerText(),/Non renseigné/);
 await history();await page.getByText('Ordonnance à vérifier',{exact:true}).waitFor();assert.equal(await page.locator('[data-topaze]').isEnabled(),true);
 await page.getByRole('button',{name:'Se déconnecter',exact:true}).click();await new Promise(r=>app.server.close(r));app.close();app=createApp({directory,origin});await start();await login();await history();await page.getByText('Ordonnance à vérifier',{exact:true}).waitFor();
 assert.deepEqual(JSON.parse(app.db.prepare('SELECT data FROM state').get().data).transmissions,state.transmissions);assert.deepEqual(errors,[]);
 console.log('PASS: Boss prescription editor, three states, date clearing, administrative reminder, red code, current resident lookup in history, disabled Topaze, retained follow-up, refresh and restart; transmissions unchanged.');
}finally{await browser?.close();if(app.server.listening)await new Promise(r=>app.server.close(r));app.close();rmSync(directory,{recursive:true,force:true});}
