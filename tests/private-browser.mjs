import {createApp} from '../backend/server.js';
import {hashPassword} from '../backend/auth.js';
import {mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=mkdtempSync(path.join(tmpdir(),'infinity-browser-')),password=randomBytes(24).toString('hex');
const origin='http://localhost:31001';const app=createApp({directory,origin});let browser;
try{
 const hash=await hashPassword(password);for(const role of ['admin','kine','secretariat'])app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(role,role,'Utilisateur fictif',role,hash);
 app.server.listen(31001,'127.0.0.1');await once(app.server,'listening');
 const child=spawn(process.execPath,['tests/browser.mjs'],{env:{...process.env,BASE_URL:origin,TEST_LOGIN:password},stdio:'inherit'});const [code]=await once(child,'exit');assert.equal(code,0,'Original functional workflow must pass after private login.');
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const contexts=[];const pages={};for(const role of ['admin','kine','secretariat']){const context=await browser.newContext({viewport:role==='kine'?{width:390,height:844}:{width:1280,height:900}});contexts.push(context);const page=await context.newPage();pages[role]=page;await page.goto(origin);await page.locator('#username').fill(role);await page.locator('#password').fill(password);await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.locator('#logout').waitFor();}
 assert.equal(await pages.kine.getByRole('button',{name:'Boss',exact:true}).count(),0);
 assert.equal(await pages.secretariat.getByRole('button',{name:'Nouvelle transmission',exact:false}).count(),0);
 const kine=pages.kine,secretary=pages.secretariat;kine.on('dialog',d=>d.accept());
 await kine.locator('#resident').selectOption({label:'ARB.'});await kine.locator('#text').fill('Séance fictive synchronisée entre comptes.');await kine.getByRole('button',{name:'Valider la transmission'}).click();await kine.locator('#toast').filter({hasText:'Transmission enregistrée'}).waitFor();
 await secretary.locator('tbody tr').filter({hasText:'ARB.'}).getByRole('button',{name:'Ouvrir',exact:true}).click({timeout:15000});
 assert.match(await secretary.locator('#final-text').innerText(),/synchronisée entre comptes/);assert.equal(await secretary.locator('#cancel-form').count(),0);
 secretary.on('dialog',d=>d.accept());await secretary.getByRole('button',{name:'Marquer comme saisi sur Titan'}).click();
 await kine.getByRole('button',{name:'Transmissions à saisir dans Titan'}).click();await kine.getByRole('button',{name:'Voir l’historique'}).click();
 await kine.locator('tbody tr').filter({hasText:'ARB.'}).filter({hasText:'Saisi sur Titan'}).waitFor({timeout:15000});await kine.locator('tbody tr').filter({hasText:'ARB.'}).getByRole('button',{name:'Voir le suivi',exact:true}).click();assert.equal(await kine.locator('#final-text').count(),0);await kine.getByRole('button',{name:'Fermer',exact:true}).click();
 await pages.admin.getByRole('button',{name:'Boss',exact:true}).click();await pages.admin.getByRole('button',{name:'Utilisateurs',exact:true}).click();await pages.admin.getByRole('button',{name:'Ajouter un compte'}).waitFor();
 await pages.admin.getByRole('button',{name:'Ajouter un compte'}).click();await pages.admin.locator('#user-name').fill('Compte supplémentaire fictif');await pages.admin.locator('#user-login').fill('test-extra');await pages.admin.locator('#user-password').fill(password);await pages.admin.getByRole('button',{name:'Enregistrer le compte',exact:true}).click();await pages.admin.locator('#users-list').getByText('Compte supplémentaire fictif',{exact:false}).waitFor();

 await pages.admin.getByRole('button',{name:'Journal des actions'}).click();await pages.admin.locator('#audit-panel').getByText('transmission.create',{exact:true}).first().waitFor();
 // Real network failure: the form remains and no success is shown.
 await kine.getByRole('button',{name:'Nouvelle transmission',exact:false}).click();await kine.locator('#text').fill('Texte fictif conservé hors connexion.');
 await contexts[1].setOffline(true);await kine.getByRole('button',{name:'Valider la transmission'}).click();await kine.locator('#toast').filter({hasText:'Serveur inaccessible'}).waitFor();assert.equal(await kine.locator('#text').inputValue(),'Texte fictif conservé hors connexion.');await contexts[1].setOffline(false);
 assert.ok(await kine.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await kine.screenshot({path:'/tmp/infinity-private-mobile.png',fullPage:true});
 await pages.admin.getByRole('button',{name:'Se déconnecter',exact:true}).click();await pages.admin.locator('#username').fill('saisie-conservee');await pages.admin.waitForTimeout(5500);assert.equal(await pages.admin.locator('#username').inputValue(),'saisie-conservee');
 console.log('PASS: private login, original UI workflows, three isolated browser sessions, automatic cross-account synchronization, secretary Titan status, role-aware UI, audit, mobile width, offline error and retained input.');
}finally{await browser?.close();if(app.server.listening)await new Promise(r=>app.server.close(r));app.close();rmSync(directory,{recursive:true,force:true});}
