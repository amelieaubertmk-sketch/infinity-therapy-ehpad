import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {backup,DatabaseSync} from 'node:sqlite';
import {createApp} from '../backend/server.js';
import {newSession} from '../backend/auth.js';
import {seed,createTransmission} from '../src/domain.js';
import {emptyClinical,comparison} from '../src/assessments-domain.js';
import {newCompactClinical,validateCompact,compactTinetti,compactDiagnosis,compactProject,effectiveTug,effectiveAids,muscleRows,pomaItems,tugRisk,recordedTugDetails,chairResult,walkingPerimeter} from '../src/assessments-compact.js';
import {assessmentPDF} from '../backend/assessment-pdf.js';
const complete=()=>{const c=newCompactClinical();c.reason='Évaluation fonctionnelle fictive';c.mrc.status='Réalisable';c.walk.possible='Possible';for(const key of ['tug','tinetti','chair']){c[key].status='Non réalisable';c[key].reason='Refus du résident';}return c;};
test('compact defaults, MRC 0/NE/missing, partial results and conditional fields',()=>{
 const c=newCompactClinical();assert.equal(c.mrc.status,'');assert.equal(c.walk.possible,'');assert.equal(c.walk.wheelchair,'');assert.equal(c.observationsEnabled,false);assert.equal(c.jointsEnabled,false);assert.ok(Object.values(c.mrc.cells).every(x=>x.value===''));validateCompact(c);assert.throws(()=>validateCompact(c,true));
 const ready=complete();ready.mrc.cells.pullR={value:'0',reason:''};ready.mrc.cells.pullL={value:'NE',reason:'Refus du résident'};validateCompact(ready,true);assert.match(compactDiagnosis(ready),/déficit de force/);assert.match(compactDiagnosis(ready),/ne sont pas interprétables/);ready.mrc.cells.pullR.value='';assert.ok(!compactDiagnosis(ready).includes('un déficit de force'));ready.mrc.cells.pullR.value='6';assert.throws(()=>validateCompact(ready));ready.mrc.cells.pullR.value='';
 ready.observations='OBSERVATION_CACHEE';ready.joints='ARTICULAIRE_CACHEE';assert.ok(!compactDiagnosis(ready).includes('OBSERVATION_CACHEE'));assert.ok(!compactDiagnosis(ready).includes('ARTICULAIRE_CACHEE'));ready.observationsEnabled=true;ready.jointsEnabled=true;assert.match(compactDiagnosis(ready),/OBSERVATION_CACHEE/);assert.doesNotMatch(compactProject(ready),/mobilité articulaire/);ready.transfers.bedChair='Assistance totale';assert.match(compactProject(ready),/transferts/);ready.findings=['instructions'];assert.match(compactDiagnosis(ready),/sans conclusion diagnostique médicale/);assert.match(compactProject(ready),/Adapter les consignes/);ready.observationsEnabled=true;ready.observations='Appui interdit';assert.match(compactProject(ready),/Aucune intervention/);ready.observationsEnabled=false;assert.ok(!compactProject(ready).includes('Aucune intervention'));
 const reasonCase=complete();reasonCase.mrc.status='Non réalisable';reasonCase.mrc.reason='Refus du résident';reasonCase.mrc.other='AUTRE_MOTIF_MASQUE';assert.ok(!compactDiagnosis(reasonCase).includes('AUTRE_MOTIF_MASQUE'));reasonCase.mrc.reason='Difficultés de compréhension ou d’exécution de la consigne';assert.match(compactProject(reasonCase),/Adapter les consignes/);reasonCase.mrc.status='Réalisable';assert.ok(!compactProject(reasonCase).includes('Adapter les consignes'));
 assert.deepEqual(muscleRows.map(r=>r[0]),['pull','push','grip','hip','kneeFlex','kneeExt','ankleDorsi','anklePlantar']);
});
test('walking dependencies, actual aids, guided Tinetti 16+12, NE and protocol-sensitive comparisons',()=>{
 const c=complete();c.walk.aidEnabled=true;c.walk.aids=['Aide humaine','Déambulateur 2 roues'];assert.deepEqual(effectiveAids(c,c.tug),c.walk.aids);c.tug.aidsOverride=true;c.tug.aids=['Canne simple'];assert.deepEqual(effectiveAids(c,c.tug),['Canne simple']);c.tinetti.status='Réalisé';c.tinetti.protocol='Standard';for(const [id,,,values] of pomaItems)c.tinetti.items[id]=String(values.length-1);assert.deepEqual(Object.fromEntries(['balance','gait','total'].map(k=>[k,compactTinetti(c)[k]])),{balance:16,gait:12,total:28});assert.match(compactTinetti(c).interpretation,/faible/);for(const [target,label] of [[18,'élevé'],[19,'modéré'],[24,'modéré'],[25,'faible'],[28,'faible']]){let remaining=target;for(const [id,,,values] of pomaItems){const points=Math.min(values.length-1,remaining);c.tinetti.items[id]=String(points);remaining-=points;}assert.equal(compactTinetti(c).total,target);assert.ok(compactTinetti(c).interpretation.includes(label));}c.tinetti.items.sitting='NE';assert.equal(compactTinetti(c).total,null);assert.equal(compactTinetti(c).balance,null);assert.match(compactTinetti(c).interpretation,/non évaluable/);c.tinetti.items.sitting='0';assert.equal(compactTinetti(c).total,27);c.walk.possible='Impossible';c.tug.status='Réalisé';c.tug.time='50';assert.equal(effectiveTug(c).status,'Non réalisable');assert.equal(effectiveTug(c).time,'');assert.equal(compactTinetti(c).gait,null);assert.equal(compactTinetti(c).total,null);assert.ok(!compactProject(c).includes('Entretenir la marche'));assert.match(compactProject(c),/marche est notée impossible/);
 const before=complete(),after=complete();for(const x of [before,after]){delete x.tug.details;x.tug.status='Réalisé';x.tug.protocol='Standard';x.tug.time='20';}after.tug.time='18';assert.match(comparison(before,after).find(r=>r.label==='Timed Up and Go').delta,/-2/);after.tug.protocol='Adapté';assert.match(comparison(before,after).find(r=>r.label==='Timed Up and Go').delta,/comparaison chiffrée non appliquée/);
});
test('TUG thresholds, explicit selections, invalid durations and impossible status',()=>{
 const c=complete(),tug=c.tug;
 assert.deepEqual(recordedTugDetails(tug),[]);
 tug.status='Réalisé';
 for(const [time,risk] of [['11,99','faible'],['12.00','modéré'],['19,99','modéré'],['20.00','élevé'],['29,99','élevé'],['30.00','très élevé']]){
  tug.time=time;
  assert.equal(tugRisk(tug),'Risque de chute '+risk);
  validateCompact(c,true);
 }
 for(const time of ['-1','0','abc','1e2','12,3.4']){
  tug.time=time;
  assert.equal(tugRisk(tug),'');
  assert.throws(()=>validateCompact(c),/Temps invalide/);
 }
 tug.time='24,5';
 tug.details.technicalAid='Aucune';
 tug.details.observations=['Petits pas','Instabilité'];
 assert.deepEqual(recordedTugDetails(tug),[['Aide technique','Aucune'],['Observations','Instabilité, Petits pas']]);
 tug.details.observations.push('Instabilité');
 assert.throws(()=>validateCompact(c),/Observations du TUG invalides/);
 tug.details.observations.pop();
 tug.status='Non réalisable';
 tug.reason='';
 assert.throws(()=>validateCompact(c),/Aucun temps/);
 tug.time='';
 validateCompact(c,true);
 assert.equal(tugRisk(tug),'Risque non évaluable par le TUG');
 assert.deepEqual(tug.details.observations,['Petits pas','Instabilité']);
});
test('TUG PDF omits blank fields, retains observations when impossible and reads older compact bilans',t=>{
 const date='2026-11-12',stamp=date+'T12:00:00Z';
 const record={date,type:'initial',practitioner:'Amélie',reviewWindow:'3m',finalizedAt:stamp,diagnosisValidatedAt:stamp,projectValidatedAt:stamp,clinical:complete()};
 const extract=()=>{
  const result=spawnSync('pdftotext',['-','-'],{input:assessmentPDF(record),encoding:'utf8'});
  if(result.error?.code==='ENOENT')return null;
  assert.equal(result.status,0,result.stderr);
  return result.stdout.split('2.4 — Timed Up and Go (TUG)')[1].split('2.5 — Five Times')[0].replace(/\s+/g,' ');
 };
 const tug=record.clinical.tug;
 tug.reason='';
 tug.details.technicalAid='Aucune';
 tug.details.observations=['Hésitation'];
 const impossible=extract();
 if(impossible===null){t.skip('pdftotext indisponible');return;}
 assert.match(impossible,/Risque non évaluable par le TUG/);
 assert.match(impossible,/Aide technique Aucune/);
 assert.match(impossible,/Observations Hésitation/);
 assert.doesNotMatch(impossible,/Temps|Assistance humaine|Transfert assis-debout|Observations complémentaires|Instabilité/);

 delete tug.details;
 Object.assign(tug,{status:'Réalisé',time:'18',protocol:'Adapté',conditions:'Conditions historiques',aidsOverride:true,aids:['Canne simple']});
 assert.doesNotThrow(()=>validateCompact(record.clinical,true));
 const legacy=extract();
 assert.match(legacy,/18 secondes/);
 assert.match(legacy,/Aides utilisées Canne simple/);
 assert.doesNotMatch(legacy,/Conditions historiques|Protocole : Adapté/);
 assert.doesNotMatch(legacy,/Risque de chute faible|Risque de chute modéré/);
});
test('5xSTS thresholds, adaptations, incomplete inputs and impossible or unperformed tests',()=>{
 const c=complete(),chair=c.chair;
 Object.assign(chair,{status:'Réalisé',arms:'Non',humanAssistance:'Aucune',protocol:'',reason:''});
 for(const [time,level,label] of [['11,99','satisfactory','satisfaisante'],['12','slow','ralentie'],['15','slow','ralentie'],['15,01','verySlow','nettement ralentie']]){
  chair.time=time;
  assert.equal(chairResult(chair).level,level);
  assert.ok(chairResult(chair).messages[0].endsWith(label));
  validateCompact(c,true);
 }
 chair.humanAssistance='Simple surveillance';
 assert.equal(chairResult(chair).level,'verySlow');
 chair.arms='';
 assert.deepEqual(chairResult(chair),{level:'',messages:[]});
 validateCompact(c,true);
 chair.arms='Oui';
 assert.match(chairResult(chair).messages[0],/résultat descriptif/);
 chair.humanAssistance='Aide physique';
 assert.equal(chairResult(chair).messages.length,2);
 assert.match(chairResult(chair).messages[1],/interprétation standardisée non applicable/);
 chair.time='';
 validateCompact(c,true);
 chair.arms='Non';
 chair.humanAssistance='';
 assert.equal(chairResult(chair).level,'');
 chair.notes='Test interrompu après deux levers.';
 chair.status='Impossible';
 assert.match(chairResult(chair).messages[0],/Performance non évaluable/);
 chair.time='12';
 assert.throws(()=>validateCompact(c),/test réalisé/);
 chair.time='';
 validateCompact(c,true);
 chair.status='Non réalisé';
 assert.deepEqual(chairResult(chair).messages,[]);
 assert.match(chair.notes,/interrompu/);
 validateCompact(c,true);
});
test('clinical synthesis links objectives to evidence and defers conflicting findings',()=>{
 const c=complete();
 c.transfers={bedChair:'Autonome',sitStand:'Autonome'};
 c.jointsEnabled=true;
 c.joints='Bilan articulaire normal.';
 c.walk.aidEnabled=true;
 c.walk.aids=['Canne simple'];
 assert.match(compactDiagnosis(c),/lit-fauteuil \(autonome\)/);
 assert.doesNotMatch(compactProject(c),/Entraînement|mobilité articulaire|Rééducation de la marche|Renforcement/);
 c.findings=['transfer','joints'];
 assert.match(compactDiagnosis(c),/transferts renseignés sont autonomes.*difficulté/);
 assert.match(compactProject(c),/décrit comme normal.*limitation/);
 assert.doesNotMatch(compactProject(c),/Entraînement fonctionnel|Travail de mobilité/);
 c.transfers.bedChair='Assistance partielle';
 c.findings=[];
 c.joints='Flexion du genou droit limitée. Pas de limitation de l’épaule.';
 assert.match(compactProject(c),/nécessitant une assistance : lit-fauteuil/);
 assert.doesNotMatch(compactProject(c),/assis-debout|épaule/);
 assert.match(compactProject(c),/mobilité articulaire.*genou droit/);
 c.mrc.cells.kneeExtR.value='3';
 c.mrc.cells.kneeExtL.value='NE';
 assert.match(compactDiagnosis(c),/extension de genou \(droite 3\/5\)/);
 assert.match(compactProject(c),/Renforcement.*extension de genou \(droite 3\/5\)/);
 c.mrc.cells.kneeExtR.value='';
 Object.assign(c.chair,{status:'Réalisé',time:'15,01',arms:'Non',humanAssistance:'Aucune',notes:'Fatigabilité au dernier lever.'});
 assert.match(compactDiagnosis(c),/Performance nettement diminuée.*limitation fonctionnelle/);
 assert.match(compactDiagnosis(c),/Fatigabilité au dernier lever/);
 assert.match(compactProject(c),/exercices de lever de chaise adaptés/);
 assert.doesNotMatch(compactDiagnosis(c),/déficit de force/);
 c.chair.humanAssistance='';
 assert.doesNotMatch(compactProject(c),/exercices de lever de chaise/);
 c.chair.humanAssistance='Aide physique';
 assert.match(compactDiagnosis(c),/assistance physique/);
 assert.doesNotMatch(compactProject(c),/exercices de lever de chaise/);
 c.tinetti.status='Réalisé';
 for(const [id] of pomaItems)c.tinetti.items[id]='0';
 c.tug.status='Réalisé';
 c.tug.time='24';
 c.tug.details.observations=['Petits pas','Difficulté au demi-tour','Instabilité'];
 const diagnostic=compactDiagnosis(c);
 assert.match(diagnostic,/Tinetti : 0\/28 — Risque de chute élevé/);
 assert.match(diagnostic,/TUG : 24 secondes — Risque de chute élevé/);
 assert.match(diagnostic,/petits pas, difficulté au demi-tour/);
 assert.match(compactProject(c),/prévention des chutes/);
 assert.match(compactProject(c),/Difficultés à cibler : petits pas, difficulté au demi-tour/);
 c.tug.time='11';
 assert.match(compactDiagnosis(c),/Les repères du Tinetti et du TUG diffèrent/);
 assert.doesNotMatch(compactProject(c),/selon le risque élevé documenté/);
 c.walk.possible='Impossible';
 assert.match(compactDiagnosis(c),/marche est notée impossible/);
 assert.doesNotMatch(compactProject(c),/Rééducation de la marche/);
 c.chair.notes='Appui interdit.';
 assert.match(compactProject(c),/Aucune intervention/);
});
test('5xSTS PDF keeps impossible-test notes and reports only applicable interpretations',t=>{
 const stamp='2026-11-12T12:00:00Z',clinical=complete(),chair=clinical.chair;
 const record={date:'2026-11-12',type:'initial',practitioner:'Amélie',reviewWindow:'3m',finalizedAt:stamp,diagnosisValidatedAt:stamp,projectValidatedAt:stamp,clinical};
 const extract=()=>{
  const result=spawnSync('pdftotext',['-','-'],{input:assessmentPDF(record),encoding:'utf8'});
  if(result.error?.code==='ENOENT')return null;
  assert.equal(result.status,0,result.stderr);
  return result.stdout.split('2.5 — Five Times Sit-to-Stand (5xSTS)')[1].split('03 — Diagnostic')[0].replace(/\s+/g,' ');
 };
 Object.assign(chair,{status:'Impossible',reason:'',notes:'Interruption fictive.'});
 const impossible=extract();
 if(impossible===null){t.skip('pdftotext indisponible');return;}
 assert.match(impossible,/Performance non évaluable/);
 assert.match(impossible,/Interruption fictive/);
 assert.doesNotMatch(impossible,/Temps :|Utilisation des bras :|Assistance humaine :/);
 Object.assign(chair,{status:'Réalisé',time:'17,5',arms:'Oui',humanAssistance:'Aide physique',notes:''});
 const adapted=extract();
 assert.match(adapted,/17,5 secondes/);
 assert.match(adapted,/interprétation standardisée non applicable/);
 assert.doesNotMatch(adapted,/Performance nettement ralentie|Observations complémentaires/);
});
test('API: soft delete/restore, authorization, finalized immutability, Titan tracking, neutral PDF and additive persistence',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'infinity-compact-'));let app=createApp({directory:dir,origin:'http://localhost:31009'});const state=seed();state.residents[0].code='IDENTITE-RESIDENT-XYZ';state.residents[0].sector='Premier étage';state.transmissions=[createTransmission(state,{residentId:state.residents[0].id,date:'2026-11-12',activity:'Marche',practitioner:'Amélie',text:'Transmission fictive conservée'})];app.db.prepare('UPDATE state SET data=?').run(JSON.stringify(state));const baseline=app.db.prepare('SELECT * FROM state').get();
 const legacy={id:'old-final-assessment',residentId:state.residents[0].id,residentCode:state.residents[0].code,residentSector:'Premier étage',owner:'kine',status:'final',clinical:emptyClinical(),date:'2026-10-01',practitioner:'Amélie',diagnosis:'Ancien diagnostic',project:'Ancien projet',finalizedAt:'2026-10-01T12:00:00Z',finalizedBy:'Validateur',diagnosisValidatedAt:'2026-10-01T12:00:00Z',diagnosisValidatedBy:'Validateur',projectValidatedAt:'2026-10-01T12:00:00Z',projectValidatedBy:'Validateur',frequency:'1 fois',duration:'20 minutes',reviewDate:'2026-12-01'};legacy.clinical.anamnesis.medical='Antécédent ancien conservé';app.db.prepare('INSERT INTO assessments VALUES(?,?,?,?,1,?)').run(legacy.id,legacy.residentId,legacy.owner,legacy.status,JSON.stringify(legacy));const legacyRaw=app.db.prepare('SELECT data FROM assessments WHERE id=?').get(legacy.id).data;
 const clients={};for(const role of ['admin','kine','other','secretariat']){app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(role,role,role,role==='other'?'kine':role,'unused');clients[role]=newSession(app.db,role);}app.server.listen(31009,'127.0.0.1');await once(app.server,'listening');
 const call=async(route,method='GET',body,role='kine',csrf=true)=>{const s=clients[role],r=await fetch('http://localhost:31009/api/assessments'+route,{method,headers:{Connection:'close',Origin:'http://localhost:31009','Content-Type':'application/json',Cookie:'infinity_session='+s.token,...(csrf?{'X-CSRF-Token':s.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 try{
 let r=(await call('','POST',{residentId:legacy.residentId,date:'2026-11-12',practitioner:'Alexandre',clinicalSchema:2})).data.assessment;assert.equal(r.clinical.schema,2);const downgrade=await call('/'+r.id,'PUT',{revision:r.revision,assessment:{...r,clinical:emptyClinical()}});assert.equal(downgrade.status,400);r.clinical=complete();r.clinical.observations='OBSERVATION_NE_PAS_EXPORTER';r.clinical.joints='ARTICULAIRE_NE_PAS_EXPORTER';r.clinical.reason+=' '+state.residents[0].code+' Premier étage';r.reviewWindow='clinical';r.diagnosis='Texte manuel à préserver dans une version';
 let result=await call('/'+r.id,'PUT',{revision:r.revision,assessment:r,generate:true});assert.equal(result.status,200,JSON.stringify(result.data));r=result.data.assessment;assert.ok(r.proposal.diagnosis);const versions=(await call('/'+r.id+'/versions')).data.versions;assert.ok(versions.some(v=>v.data.diagnosis==='Texte manuel à préserver dans une version'));
 assert.equal((await call('/'+r.id+'/trash','POST',{revision:r.revision,confirmation:'SUPPRIMER LE BROUILLON'},'secretariat')).status,403);assert.equal((await call('/'+r.id+'/trash','POST',{revision:r.revision,confirmation:'SUPPRIMER LE BROUILLON'},'other')).status,404);assert.equal((await call('/'+r.id+'/trash','POST',{revision:r.revision,confirmation:'SUPPRIMER LE BROUILLON'},'kine',false)).status,403);assert.equal((await call('/'+r.id+'/trash','POST',{revision:r.revision,confirmation:''})).status,400);
 result=await call('/'+r.id+'/trash','POST',{revision:r.revision,confirmation:'SUPPRIMER LE BROUILLON'});assert.equal(result.status,200);r=result.data.assessment;assert.ok(!(await call('')).data.assessments.some(x=>x.id===r.id));assert.ok((await call('/trash')).data.assessments.some(x=>x.id===r.id));assert.equal((await call('/'+r.id,'PUT',{revision:r.revision,assessment:r})).status,400);assert.equal((await call('/trash','GET',null,'secretariat')).status,403);
 result=await call('/'+r.id+'/restore','POST',{revision:r.revision,confirmation:'RESTAURER'});assert.equal(result.status,200);r=result.data.assessment;assert.equal(r.deletedAt,null);assert.equal(r.clinical.observations,'OBSERVATION_NE_PAS_EXPORTER');const adminTrash=await call('/'+r.id+'/trash','POST',{revision:r.revision,confirmation:'SUPPRIMER LE BROUILLON'},'admin');assert.equal(adminTrash.status,200);assert.equal(adminTrash.data.assessment.deletedBy,'admin');const adminRestore=await call('/'+r.id+'/restore','POST',{revision:adminTrash.data.assessment.revision,confirmation:'RESTAURER'},'admin');assert.equal(adminRestore.status,200);r=adminRestore.data.assessment;assert.equal((await call('/'+r.id+'/finalize','POST',{revision:r.revision,confirmation:'FINALISER',confirmReviewed:false})).status,400);
 result=await call('/'+r.id+'/finalize','POST',{revision:r.revision,confirmation:'FINALISER',confirmReviewed:true});assert.equal(result.status,200,JSON.stringify(result.data));r=result.data.assessment;assert.equal(r.status,'final');const publicVersions=await call('/'+r.id+'/versions','GET',null,'secretariat');assert.ok(publicVersions.data.versions.every(v=>v.data.status==='final'&&!v.data.proposal));assert.ok(!(await call('/'+r.id,'GET',null,'other')).data.assessment.proposal);const finalizedRaw=app.db.prepare('SELECT data FROM assessments WHERE id=?').get(r.id).data;assert.ok((await call('/pending')).data.assessments.some(x=>x.id===r.id));assert.equal((await call('/'+r.id+'/trash','POST',{revision:r.revision,confirmation:'SUPPRIMER LE BROUILLON'})).status,400);assert.equal((await call('/'+r.id+'/export','POST',{})).status,400);assert.equal((await call('/'+r.id+'/export','POST',{confirmResidentId:'wrong'})).status,400);
 const pdf=await call('/'+r.id+'/export','POST',{confirmResidentId:r.residentId},'secretariat');assert.equal(pdf.status,200,JSON.stringify(pdf.data));assert.equal(pdf.data.assessmentId,r.id);assert.equal(pdf.data.filename,'Bilan_Kinesitherapique_2026-11-12.pdf');assert.ok(!pdf.data.filename.includes(r.residentCode));const file=path.join(dir,'neutral.pdf');writeFileSync(file,Buffer.from(pdf.data.file,'base64'));const extracted=spawnSync('pdftotext',[file,'-'],{encoding:'utf8'});if(extracted.error?.code==='ENOENT')console.log('Optional PDF text inspection unavailable: install pdftotext for this additional check.');else{assert.equal(extracted.status,0,extracted.stderr);for(const token of [r.residentId,r.residentCode,r.id,'Premier étage','OBSERVATION_NE_PAS_EXPORTER','ARTICULAIRE_NE_PAS_EXPORTER'])assert.ok(!extracted.stdout.includes(token),'PDF excludes '+token);}const meta=spawnSync('pdfinfo',[file],{encoding:'utf8'});if(meta.error?.code==='ENOENT')console.log('Optional PDF metadata inspection unavailable: install pdfinfo for this additional check.');else{assert.equal(meta.status,0);assert.ok(!meta.stdout.includes(r.residentCode));assert.ok(!meta.stdout.includes(r.id));assert.match(meta.stdout,/A4/);}assert.ok((await call('/pending')).data.assessments.some(x=>x.id===r.id),'export never marks Titan');
 assert.equal((await call('/'+r.id+'/titan','POST',{revision:r.revision,confirmation:''},'secretariat')).status,400);result=await call('/'+r.id+'/titan','POST',{revision:r.revision,confirmation:'SAISI SUR TITAN'},'secretariat');assert.equal(result.status,200);assert.ok(result.data.assessment.titanConfirmedAt);assert.equal(result.data.assessment.titanConfirmedBy,'secretariat');assert.equal(app.db.prepare('SELECT data FROM assessments WHERE id=?').get(r.id).data,finalizedRaw);assert.ok(!(await call('/pending')).data.assessments.some(x=>x.id===r.id));assert.ok((await call('')).data.assessments.some(x=>x.id===r.id));const samePDF=await call('/'+r.id+'/export','POST',{confirmResidentId:r.residentId});assert.equal(samePDF.data.file,pdf.data.file);assert.equal(app.db.prepare('SELECT count(*) AS n FROM assessment_documents WHERE assessment_id=?').get(r.id).n,1);
 const legacyPDF=await call('/'+legacy.id+'/export','POST',{confirmResidentId:legacy.residentId});assert.equal(legacyPDF.status,200);assert.equal(app.db.prepare('SELECT data FROM assessments WHERE id=?').get(legacy.id).data,legacyRaw);assert.deepEqual(app.db.prepare('SELECT * FROM state').get(),baseline);assert.equal(app.db.prepare('SELECT count(*) AS n FROM users').get().n,4);const audit=JSON.stringify(app.db.prepare('SELECT * FROM audit').all());assert.ok(audit.includes('assessment.draft.trash'));assert.ok(audit.includes('assessment.draft.restore'));assert.ok(audit.includes('assessment.titan.confirm'));assert.ok(!audit.includes('OBSERVATION_NE_PAS_EXPORTER'));assert.ok(!audit.includes('Texte manuel'));
 const reeval=await call('','POST',{residentId:r.residentId,date:'2026-12-12',practitioner:'Alexandre',clinicalSchema:2,previousId:r.id});assert.equal(reeval.status,201);const second=reeval.data.assessment;assert.equal(second.type,'reevaluation');assert.equal(second.previousId,r.id);assert.equal(second.clinical.reason,r.clinical.reason);assert.ok(Object.values(second.clinical.mrc.cells).every(x=>x.value===''));assert.equal(second.clinical.walk.possible,'');assert.equal(second.clinical.observations,r.clinical.observations);assert.equal((await call('/'+second.id+'/trash','POST',{revision:second.revision,confirmation:'SUPPRIMER LE BROUILLON'})).status,200);
 const backupFile=path.join(dir,'backup.sqlite');await backup(app.db,backupFile);const copy=new DatabaseSync(backupFile,{readOnly:true});assert.equal(copy.prepare('SELECT count(*) AS n FROM assessment_documents').get().n,2);assert.ok(copy.prepare('SELECT count(*) AS n FROM assessment_versions').get().n>=4);assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');copy.close();await new Promise(resolve=>app.server.close(resolve));app.close();app=createApp({directory:dir,origin:'http://localhost:31009'});assert.deepEqual(app.db.prepare('SELECT * FROM state').get(),baseline);assert.equal(app.db.prepare('SELECT data FROM assessments WHERE id=?').get(legacy.id).data,legacyRaw);assert.ok(app.db.prepare('SELECT deleted_at FROM assessment_tracking WHERE assessment_id=?').get(second.id).deleted_at);assert.ok(app.db.prepare('SELECT titan_at FROM assessment_tracking WHERE assessment_id=?').get(r.id).titan_at);
 }finally{if(app.server.listening)await new Promise(resolve=>app.server.close(resolve));app.close();rmSync(dir,{recursive:true,force:true});}
});

test('PDF layout keeps transfers together, repeats long-table headers and uses only the approved text',t=>{
 const c=complete(),stamp='2026-11-12T12:00:00Z';
 c.walk.distance='15';
 c.transfers={bedChair:'Autonome',sitStand:'Assistance partielle'};
 const record={date:'2026-11-12',practitioner:'Amélie',type:'initial',clinical:c,reviewWindow:'3m',
  finalizedAt:stamp,finalizedBy:'Amélie',diagnosisValidatedAt:stamp,diagnosisValidatedBy:'Amélie',
  projectValidatedAt:stamp,projectValidatedBy:'Amélie',
  diagnosis:'Conclusion clinique fictive validée.\n\nDeuxième phrase approuvée.',
  project:'Sécuriser les déplacements.\nEntretenir la mobilité du genou.\nSécuriser les déplacements.',
  proposal:{diagnosis:'PROPOSITION_NON_VALIDÉE'}};
 const extract=()=>{
  const result=spawnSync('pdftotext',['-layout','-','-'],{input:assessmentPDF(record),encoding:'utf8'});
  if(result.error?.code==='ENOENT')return null;
  assert.equal(result.status,0,result.stderr);
  return result.stdout.trim().split('\f').map(page=>page.trim());
 };
 const short=extract();
 if(short===null){t.skip('pdftotext indisponible');return;}
 assert.equal(short.length,1);
 const normalized=short[0].replace(/\s+/g,' ');
 assert.match(normalized,/BILAN DIAGNOSTIQUE KINÉSITHÉRAPIQUE/);
 assert.match(normalized,/Validation : 12\/11\/2026.*Amélie/);
 assert.match(normalized,/Conclusion clinique fictive validée\. Deuxième phrase approuvée\./);
 assert.equal(normalized.match(/Sécuriser les déplacements\./g).length,1);
 assert.match(normalized,/Page 1 \/ 1$/);
 assert.doesNotMatch(normalized,/Infinity Therapy|\(Paris\)|PROPOSITION_NON_VALIDÉE/i);
 assert.ok(normalized.indexOf('Tinetti POMA')<normalized.indexOf('Timed Up and Go'));
 assert.match(normalized,/Transferts Lit-fauteuil Autonome Assis-debout Assistance partielle/);

 c.tug.status='Réalisé';
 c.tug.time='22';
 c.tug.details.notes=Array.from({length:80},(_,i)=>'Observation locale fictive '+(i+1)+'. Le changement de direction est réalisé après une pause.').join('\n');
 const long=extract();
 assert.ok(long.length>=3);
 assert.ok(long.some(page=>/TUG · Mesure ou observation/.test(page)&&/\(suite\)/.test(page)));
 assert.ok(long.some(page=>/Observation locale fictive 80/.test(page)));
 const transfersPage=long.find(page=>page.includes('2.7 — Transferts'));
 assert.match(transfersPage,/Lit-fauteuil\s+Autonome/);
 assert.match(transfersPage,/Assis-debout\s+Assistance partielle/);
 for(const [i,page] of long.entries()){
  assert.match(page,new RegExp('Page '+(i+1)+' / '+long.length+'$'));
  assert.ok(page.split('\n').filter(line=>line.trim()).length>6,'Page presque vide');
 }
});

test('permanent deletion verifies active storage, clears dependent cache and preserves other assessments',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'infinity-assessment-purge-'));
 const origin='http://localhost:31029',app=createApp({directory,origin});
 try{
  const state=seed(),resident=state.residents[0];
  app.db.prepare('UPDATE state SET data=?').run(JSON.stringify(state));
  const baseline=app.db.prepare('SELECT * FROM state').get(),sessions={};
  for(const [id,role] of [['owner','kine'],['colleague','kine'],['secretary','secretariat']]){
   app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(id,id,id,role,'unused');
   sessions[id]=newSession(app.db,id);
  }
  const stamp='2026-11-12T12:00:00Z';
  const record=(id,previousId=null)=>({id,previousId,residentId:resident.id,residentCode:resident.code,owner:'owner',status:'final',type:previousId?'reevaluation':'initial',
   date:previousId?'2026-11-12':'2026-10-01',practitioner:'Amélie',clinical:complete(),reviewWindow:'3m',
   diagnosis:'Conclusion fictive.',project:'Objectif fictif.',finalizedAt:stamp,finalizedBy:'Amélie'});
  const old=record('bilan-a-effacer'),child=record('reevaluation-fictive',old.id),unrelated=record('bilan-independant');
  for(const entry of [old,child,unrelated]){
   app.db.prepare('INSERT INTO assessments VALUES(?,?,?,?,1,?)').run(entry.id,entry.residentId,entry.owner,entry.status,JSON.stringify(entry));
   app.db.prepare('INSERT INTO assessment_versions(assessment_id,at,actor,data) VALUES(?,?,?,?)').run(entry.id,stamp,entry.owner,JSON.stringify(entry));
   app.db.prepare('INSERT INTO assessment_documents VALUES(?,?,?,2)').run(entry.id,Buffer.from('ancienne présentation'),stamp);
  }
  app.db.prepare('INSERT INTO assessment_tracking(assessment_id,titan_at,titan_by,titan_name) VALUES(?,?,?,?)').run(old.id,stamp,'owner','Owner');
  app.server.listen(0,'127.0.0.1');
  await once(app.server,'listening');
  const call=async(suffix,{actor='owner',body,csrf=true,method=body?'POST':'GET'}={})=>{
   const session=sessions[actor];
   const response=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/assessments'+suffix,{
    method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:'infinity_session='+session.token,
     ...(csrf?{'X-CSRF-Token':session.csrf}:{})},body:body?JSON.stringify(body):undefined
   });
   return {status:response.status,data:await response.json()};
  };
  const exportBody={confirmResidentId:resident.id};
  const oldExport=await call('/'+old.id+'/export',{body:exportBody});
  assert.equal(oldExport.status,200);
  assert.match(Buffer.from(oldExport.data.file,'base64').toString('latin1'),/^%PDF-1\.4/);
  assert.equal(app.db.prepare('SELECT format_version FROM assessment_documents WHERE assessment_id=?').get(old.id).format_version,5);
  const originalComparison=await call('/'+child.id+'/export',{body:exportBody});
  assert.equal(originalComparison.status,200);
  const purge='/'+old.id+'/purge',valid={revision:1,confirmation:'effacer'};
  assert.equal((await call(purge,{actor:'secretary',body:valid})).status,403);
  assert.equal((await call(purge,{actor:'colleague',body:valid})).status,403);
  assert.equal((await call(purge,{body:valid,csrf:false})).status,403);
  assert.equal((await call(purge,{body:{...valid,confirmation:'Effacer'}})).status,400);
  assert.equal((await call(purge,{body:{...valid,revision:2}})).status,409);
  assert.equal((await call('/'+old.id)).status,200);
  const edit=await call('/'+old.id,{method:'PUT',body:{revision:1,assessment:old}});
  assert.equal(edit.status,400);
  assert.match(edit.data.error,/Bilan finalisé immuable/);
  assert.equal((await call(purge,{method:'PUT',body:valid})).status,405);
  assert.deepEqual(await call(purge,{body:valid}),{status:200,data:{deletedId:old.id}});
  for(const [table,column] of [['assessments','id'],['assessment_tracking','assessment_id'],['assessment_versions','assessment_id'],['assessment_documents','assessment_id'],['audit','target']]){
   assert.equal(app.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${column}=?`).get(old.id).n,0);
  }
  assert.equal((await call('/'+old.id)).status,404);
  assert.equal((await call('/'+old.id+'/versions')).status,404);
  assert.equal((await call(purge,{body:valid})).status,404);
  assert.ok(!(await call('/trash')).data.assessments.some(entry=>entry.id===old.id));
  assert.deepEqual(app.db.prepare('SELECT * FROM state').get(),baseline);
  for(const entry of [child,unrelated])assert.equal(app.db.prepare('SELECT data FROM assessments WHERE id=?').get(entry.id).data,JSON.stringify(entry));
  assert.equal(app.db.prepare('SELECT format_version FROM assessment_documents WHERE assessment_id=?').get(unrelated.id).format_version,2);
  assert.equal(app.db.prepare('SELECT pdf FROM assessment_documents WHERE assessment_id=?').get(child.id),undefined);
  const refreshed=await call('/'+child.id+'/export',{body:exportBody});
  assert.equal(refreshed.status,200);
  assert.notEqual(refreshed.data.file,originalComparison.data.file);
 }finally{
  if(app.server.listening)await new Promise(resolve=>app.server.close(resolve));
  app.close();
  rmSync(directory,{recursive:true,force:true});
 }
});

test('a partial Tinetti retains real points without reporting a final score in the PDF',t=>{
 const c=complete();
 Object.assign(c.tinetti,{status:'Réalisé',protocol:'',conditions:'Ancienne rubrique à masquer'});
 c.tinetti.items.sitting='1';
 c.tinetti.items.arising='0';
 c.tinetti.items.start='NE';
 const scores=compactTinetti(c);
 assert.deepEqual(scores.groups.balance,{points:1,entered:2,count:10,nonEvaluable:0,blocked:false,complete:false});
 assert.deepEqual(scores.groups.gait,{points:null,entered:1,count:10,nonEvaluable:1,blocked:false,complete:false});
 assert.equal(scores.provisionalTotal,1);
 assert.equal(scores.total,null);
 assert.equal(scores.level,'unavailable');
 assert.doesNotThrow(()=>validateCompact(c,true),'Un Tinetti partiel peut être finalisé tel quel sans protocole.');
 Object.assign(c.tinetti.details,{technicalAid:'Deux cannes',humanAssistance:'Aide physique',notes:'Interruption fictive.'});
 const record={date:'2026-11-12',type:'initial',practitioner:'Amélie',clinical:c,diagnosis:'Bilan fictif.',project:'Objectif fictif.'};
 const pdf=spawnSync('pdftotext',['-','-'],{input:assessmentPDF(record),encoding:'utf8'});
 if(pdf.error?.code==='ENOENT'){t.skip('pdftotext indisponible');return;}
 assert.equal(pdf.status,0,pdf.stderr);
 const tinetti=pdf.stdout.split('2.3 — Tinetti POMA 28')[1].split('2.4 — Timed Up')[0].replace(/\s+/g,' ');
 assert.match(tinetti,/Équilibre \(provisoire\) 1\/16/);
 assert.match(tinetti,/Total provisoire 1\/28/);
 assert.match(tinetti,/évaluation incomplète/);
 assert.match(tinetti,/Risque non évaluable par le Tinetti/);
 assert.match(tinetti,/Interruption fictive/);
 assert.doesNotMatch(tinetti,/Marche \(provisoire\) 0\/12|Risque de chute|Ancienne rubrique/);
 c.tinetti.status='Impossible';
 const unavailable=compactTinetti(c);
 assert.equal(unavailable.provisionalTotal,null);
 assert.equal(unavailable.level,'unavailable');
 assert.equal(c.tinetti.items.sitting,'1');
 assert.equal(c.tinetti.details.notes,'Interruption fictive.');
 const historical=structuredClone(c);
 delete historical.tinetti.details;
 Object.assign(historical.tinetti,{status:'Non réalisable',protocol:'Adapté',conditions:'Ancienne rubrique'});
 const before=structuredClone(historical);
 assert.equal(compactTinetti(historical).level,'unavailable');
 validateCompact(historical,true);
 assert.deepEqual(historical,before);
});

test('walking distance persists as a bounded description and an open-ended measurement has no numeric delta',t=>{
 const c=complete();
 const record={date:'2026-11-12',type:'initial',practitioner:'Amélie',clinical:c,project:'Projet fictif.'};
 let pdfAvailable=true;
 for(const [distance,expected,meters] of [
  ['25 m','évalué à 25 mètres',25],['100 m','évalué à 100 mètres',100],['> 100 m','supérieur à 100 mètres',null]
 ]){
  c.walk.distance=distance;
  assert.equal(walkingPerimeter(distance).meters,meters);
  validateCompact(c,true);
  const diagnosis=compactDiagnosis(c);
  assert.ok(diagnosis.includes('Périmètre de marche '+expected+'.'));
  const pdf=spawnSync('pdftotext',['-','-'],{input:assessmentPDF({...record,diagnosis}),encoding:'utf8'});
  if(pdf.error?.code==='ENOENT'){pdfAvailable=false;continue;}
  assert.equal(pdf.status,0,pdf.stderr);
  assert.ok(pdf.stdout.replace(/\s+/g,' ').includes('Périmètre de marche '+expected));
 }
 const previous=structuredClone(c);
 previous.walk.distance='100 m';
 const change=comparison(previous,c).find(row=>row.label==='Périmètre de marche');
 assert.deepEqual(change,{label:'Périmètre de marche',previous:'100 m',current:'> 100 m',delta:'Non comparable'});
 assert.equal(walkingPerimeter('25,5 m').meters,25.5);
 assert.equal(walkingPerimeter('> 50 m'),null);
 assert.equal(walkingPerimeter('-5 m'),null);
 assert.doesNotThrow(()=>{previous.walk.distance='125';validateCompact(previous,true);},'Ancienne mesure exacte préservée');
 if(!pdfAvailable)t.diagnostic('pdftotext indisponible : extraction PDF non vérifiée.');
});

test('diagnosis carries both indicative levels and uses the actual Tinetti subscores',()=>{
 const c=complete();
 c.observationsEnabled=true;
 c.observations='Observation fictive à conserver.';
 c.walk.possible='Possible';
 c.walk.wheelchair='Non';
 c.tinetti.status='Réalisé';
 assert.equal(Object.hasOwn(c.tinetti,'protocol'),false);
 for(const [id,,,values] of pomaItems)c.tinetti.items[id]=String(values.length-1);
 c.tinetti.items.path='0';
 c.tinetti.items.trunk='0';
 c.tug.status='Réalisé';
 c.tug.time='12';
 const diagnosis=compactDiagnosis(c);
 assert.ok(diagnosis.startsWith('Motif de prise en charge : '+c.reason+'\n\nObservations complémentaires de l’anamnèse : '+c.observations));
 assert.match(diagnosis,/Tinetti : 24\/28 — Risque de chute modéré/);
 assert.match(diagnosis,/certaines capacités de marche \(équilibre 16\/16, marche 8\/12\)/);
 assert.match(diagnosis,/TUG : 12 secondes — Risque de chute modéré/);
 assert.equal(diagnosis.match(/vigilance adaptée/g).length,1);
 assert.doesNotMatch(diagnosis,/fauteuil roulant|protocole|aucune classification/i);
 c.walk.wheelchair='Oui';
 assert.match(compactDiagnosis(c),/Marche possible\.[\s\S]*Utilisation habituelle d’un fauteuil roulant/);
 for(const [time,risk,detail] of [['11','faible','relativement préservée'],['24','élevé','nettement ralentie'],['30','très élevé','fortement altérée']]){
  c.tug.time=time;
  const result=compactDiagnosis(c);
  assert.ok(result.includes('TUG : '+time+' secondes — Risque de chute '+risk+'.'));
  assert.ok(result.includes(detail));
  assert.match(result,/Les repères du Tinetti et du TUG diffèrent/);
 }
 c.tinetti.items.path='NE';
 c.tug.status='Non réalisable';
 c.tug.time='';
 assert.doesNotMatch(compactDiagnosis(c),/Risque de chute/);
});
