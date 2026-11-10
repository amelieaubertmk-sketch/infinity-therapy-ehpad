// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/resident-order.mjs
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {createApp} from '../backend/server.js';
import {hashPassword} from '../backend/auth.js';
import {activities,sectors,createTransmission} from '../src/domain.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=mkdtempSync(path.join(tmpdir(),'infinity-order-'));
const origin='http://localhost:31004',app=createApp({directory,origin});let browser;
const stored=()=>JSON.parse(app.db.prepare('SELECT data FROM state WHERE id=1').get().data);
try{
 const groups=[['ZOE.','ÉLI.','BEL.','ARB.'],['YVO.','ÊVE.','DUR.','BÉA.'],['ROS.','MOL.','LUM.','ANA.']];
 const residents=groups.flatMap((codes,i)=>codes.map(code=>({id:randomUUID(),code,sector:sectors[i],archived:false,templates:Object.fromEntries(activities.map(a=>[a,`Modèle fictif ${code} : ${a}.`]))})));
 for(const code of ['ZAR.','ÂRC.'])residents.push({id:randomUUID(),code,sector:sectors[0],archived:true,templates:Object.fromEntries(activities.map(a=>[a,'Modèle fictif archivé.']))});
 const initial={version:1,residents,transmissions:[]};initial.transmissions=[createTransmission(initial,{residentId:residents[0].id,date:'2026-11-10',practitioner:'Amélie',activity:'Marche',text:'Transmission historique fictive immuable.',observation:'Observation fictive conservée.'})];
 app.db.prepare('UPDATE state SET data=? WHERE id=1').run(JSON.stringify(initial));const original=structuredClone(stored()),password=randomBytes(24).toString('hex');
 app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(randomUUID(),'admin','Compte fictif','admin',await hashPassword(password));
 app.server.listen(31004,'127.0.0.1');await once(app.server,'listening');
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.locator('#username').fill('admin');await page.locator('#password').fill(password);await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.locator('#logout').waitFor();
 const codes=()=>page.locator('#resident option').evaluateAll(options=>options.filter(o=>o.value).map(o=>o.textContent));
 for(const [i,expected] of [['ARB.','BEL.','ÉLI.','ZOE.'],['BÉA.','DUR.','ÊVE.','YVO.'],['ANA.','LUM.','MOL.','ROS.']].entries()){
  await page.getByRole('button',{name:sectors[i],exact:true}).click();assert.deepEqual(await codes(),expected);
  for(const resident of residents.filter(r=>r.sector===sectors[i]&&!r.archived)){
   await page.locator('#resident').selectOption(resident.id);assert.equal(await page.locator('#resident').inputValue(),resident.id);assert.equal(await page.locator('#text').inputValue(),resident.templates.Marche);
  }
 }
 await page.locator('#resident-query').fill('eli');assert.equal(await page.locator('#resident').inputValue(),residents.find(r=>r.code==='ÉLI.').id);assert.equal(await page.locator('#text').inputValue(),'Modèle fictif ÉLI. : Marche.');
 await page.locator('#activity').selectOption('Soins');assert.equal(await page.locator('#text').inputValue(),'Modèle fictif ÉLI. : Soins.');
 await page.getByRole('button',{name:'Boss',exact:true}).click();const bossCodes=()=>page.locator('#resident-rows .resident-code').allTextContents();
 assert.deepEqual(await bossCodes(),['ANA.','ARB.','BÉA.','BEL.','DUR.','ÉLI.','ÊVE.','LUM.','MOL.','ROS.','YVO.','ZOE.']);
 await page.locator('#resident-search').fill('a');assert.deepEqual(await bossCodes(),['ANA.','ARB.','BÉA.']);await page.locator('#resident-search').fill('');
 await page.getByRole('button',{name:'Archives',exact:true}).click();assert.deepEqual(await bossCodes(),['ÂRC.','ZAR.']);
 assert.deepEqual(stored(),original,'Reading and sorting must not change storage order, IDs, templates or transmissions.');
 await page.getByRole('button',{name:'Actifs',exact:true}).click();await page.getByRole('button',{name:'Ajouter un résident',exact:false}).click();await page.locator('#code').fill('AAB.');await page.locator('#resident-sector').selectOption('Maisonnée');
 for(let i=0;i<4;i++)await page.locator('#template-'+i).fill('Nouveau modèle fictif '+i);
 await page.getByRole('button',{name:'Enregistrer le résident et ses modèles',exact:true}).click();await page.locator('#modal').waitFor({state:'hidden'});assert.equal((await bossCodes())[0],'AAB.');
 const added=stored();assert.deepEqual(added.residents.slice(0,-1),original.residents);assert.equal(added.residents.at(-1).code,'AAB.');assert.deepEqual(added.transmissions,original.transmissions);
 await page.locator('#resident-rows tr').filter({hasText:'ZOE.'}).getByRole('button',{name:'Modifier & modèles',exact:true}).click();await page.locator('#code').fill('AAA.');await page.getByRole('button',{name:'Enregistrer le résident et ses modèles',exact:true}).click();await page.locator('#modal').waitFor({state:'hidden'});
 assert.deepEqual((await bossCodes()).slice(0,2),['AAA.','AAB.']);const renamed=stored();assert.deepEqual(renamed.residents.map(r=>r.id),added.residents.map(r=>r.id));assert.equal(renamed.residents[0].code,'AAA.');assert.deepEqual(renamed.transmissions,original.transmissions);
 await page.getByRole('button',{name:'Kiné',exact:true}).click();await page.getByRole('button',{name:sectors[0],exact:true}).click();assert.deepEqual(await codes(),['AAA.','ARB.','BEL.','ÉLI.']);await page.locator('#resident-query').fill('aaa');assert.equal(await page.locator('#resident').inputValue(),residents[0].id);assert.equal(await page.locator('#text').inputValue(),residents[0].templates.Soins);
 await page.getByRole('button',{name:'Maisonnée',exact:true}).click();assert.deepEqual(await codes(),['AAB.','ANA.','LUM.','MOL.','ROS.']);await page.reload();await page.getByRole('button',{name:'Boss',exact:true}).click();assert.deepEqual((await bossCodes()).slice(0,2),['AAA.','AAB.']);assert.deepEqual(stored().transmissions,original.transmissions);assert.deepEqual(errors,[]);
 console.log('PASS: French alphabetical order in all sectors, Boss active/archived/search lists, selection by unchanged IDs, prefix search, correct models, add/rename reordering, unchanged storage order and byte-equivalent existing transmission data.');
}finally{await browser?.close();if(app.server.listening)await new Promise(r=>app.server.close(r));app.close();rmSync(directory,{recursive:true,force:true});}
