import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {snapshot,audit} from './database.js';
import {emptyClinical,validateClinical} from '../src/assessments-domain.js';
import {assessmentPDF} from './assessment-pdf.js';
export function initializeAssessments(db){db.exec('CREATE TABLE IF NOT EXISTS assessments(id TEXT PRIMARY KEY,resident_id TEXT NOT NULL,owner TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL)');}
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function assessmentRoute({db,user,route,method,body,json}){
 if(!route.startsWith('/api/assessments'))return false;
 const read=row=>row?{...JSON.parse(row.data),revision:row.revision}:null;
 const get=id=>read(db.prepare('SELECT * FROM assessments WHERE id=?').get(id));
 const visible=r=>r&&(r.status==='final'||clinician&&(r.owner===user.id||user.role==='admin'));
 const clinician=['admin','kine'].includes(user.role);
 if(route==='/api/assessments'&&method==='GET'){const rows=db.prepare('SELECT * FROM assessments ORDER BY rowid DESC').all().map(read).filter(visible);json(200,{assessments:rows});return true;}
 const parts=route.split('/'),id=parts[3],action=parts[4];
 if(method==='GET'&&id&&!action){const r=get(id);json(visible(r)?200:404,visible(r)?{assessment:r}:{error:'Bilan introuvable.'});return true;}
 if(!['POST','PUT'].includes(method)){json(405,{error:'Méthode interdite.'});return true;}
 if(!clinician&&action!=='export'){json(403,{error:'Rédaction et validation réservées aux kinésithérapeutes.'});return true;}
 db.exec('BEGIN IMMEDIATE');try{
 const now=new Date().toISOString();if(/\bPATHOS\b/i.test(JSON.stringify(body)))throw Error('Terme non autorisé dans un bilan.');
 if(route==='/api/assessments'&&method==='POST'){
 const resident=snapshot(db).state.residents.find(r=>r.id===body.residentId);if(!resident)throw Error('Résident existant requis.');const previous=body.previousId?get(body.previousId):null;if(body.previousId&&(!previous||previous.status!=='final'||previous.residentId!==resident.id))throw Error('Bilan précédent finalisé du même résident requis.');
 const clinical=emptyClinical();if(previous)clinical.anamnesis=structuredClone(previous.clinical.anamnesis);
 const r={id:randomUUID(),residentId:resident.id,residentCode:resident.code,owner:user.id,createdBy:user.name,createdAt:now,status:'draft',type:previous?'reevaluation':'initial',previousId:previous?.id||null,date:body.date,practitioner:body.practitioner,clinical,diagnosis:'',project:'',frequency:'',duration:'',reviewDate:'',evolution:''};if(!validDate(r.date)||!['Amélie','Alexandre'].includes(r.practitioner))throw Error('Date et praticien requis.');db.prepare('INSERT INTO assessments VALUES(?,?,?,?,1,?)').run(r.id,r.residentId,r.owner,r.status,JSON.stringify(r));audit(db,user.id,'assessment.create',r.id);db.exec('COMMIT');json(201,{assessment:get(r.id)});return true;
 }
 const previous=get(id);if(!visible(previous)){db.exec('ROLLBACK');json(404,{error:'Bilan introuvable.'});return true;}
 if(action==='export'&&method==='POST'){if(previous.status!=='final')throw Error('Seuls les bilans finalisés peuvent être exportés.');const pdf=assessmentPDF(previous,previous.previousId?get(previous.previousId):null);audit(db,user.id,'assessment.export',id);db.exec('COMMIT');json(200,{file:pdf.toString('base64')});return true;}
 if(previous.owner!==user.id&&user.role!=='admin'){db.exec('ROLLBACK');json(403,{error:'Ce brouillon appartient à un autre évaluateur.'});return true;}
 if(previous.status==='final')throw Error('Bilan finalisé immuable. Créez une réévaluation.');
 if(body.revision!==previous.revision){db.exec('ROLLBACK');json(409,{error:'Bilan modifié par une autre session. Rechargez avant de reprendre ; votre formulaire est conservé.'});return true;}
 let next={...previous};delete next.revision;
 if(action==='finalize'&&method==='POST'){
 validateClinical(next.clinical,true);if(!next.diagnosisValidatedAt||!next.projectValidatedAt||!next.frequency.trim()||!next.duration.trim()||(!validDate(next.reviewDate)||next.reviewDate<next.date)||!next.diagnosis.trim()||!next.project.trim()||(next.type==='reevaluation'&&!next.evolution.trim())||body.confirmation!=='FINALISER')throw Error('Relire et valider le diagnostic, le projet et les modalités avant finalisation.');next={...next,status:'final',finalizedAt:now,finalizedBy:user.name,finalizedById:user.id};
 }else if(method==='PUT'&&!action){
 const input=body.assessment;if(!input||!validDate(input.date)||!['Amélie','Alexandre'].includes(input.practitioner))throw Error('Date ou praticien invalide.');validateClinical(input.clinical);for(const key of ['diagnosis','project','frequency','duration','reviewDate','evolution'])if(typeof input[key]!=='string'||input[key].length>30000)throw Error('Texte trop long ou invalide.');
 const changed=!isDeepStrictEqual(previous.clinical,input.clinical)||previous.date!==input.date||previous.practitioner!==input.practitioner;
 next={...next,...Object.fromEntries(['date','practitioner','clinical','diagnosis','project','frequency','duration','reviewDate','evolution'].map(k=>[k,input[k]])),updatedAt:now,updatedBy:user.id};
 const diagnosisChanged=changed||previous.diagnosis!==input.diagnosis,projectChanged=diagnosisChanged||previous.project!==input.project||['frequency','duration','reviewDate'].some(k=>previous[k]!==input[k]);
 if(diagnosisChanged){delete next.diagnosisValidatedAt;delete next.diagnosisValidatedBy;delete next.diagnosisValidatedById;}
 if(projectChanged){delete next.projectValidatedAt;delete next.projectValidatedBy;delete next.projectValidatedById;}
 if(body.validateDiagnosis===true){if(!next.diagnosis.trim())throw Error('Diagnostic requis.');next.diagnosisValidatedAt=now;next.diagnosisValidatedBy=user.name;next.diagnosisValidatedById=user.id;audit(db,user.id,'assessment.diagnosis.validate',id);}
 if(body.validateProject===true){if(!next.diagnosisValidatedAt||!next.project.trim())throw Error('Validez d’abord le diagnostic.');next.projectValidatedAt=now;next.projectValidatedBy=user.name;next.projectValidatedById=user.id;audit(db,user.id,'assessment.project.validate',id);}
 }else throw Error('Action inconnue.');
 db.prepare('UPDATE assessments SET status=?,revision=revision+1,data=? WHERE id=?').run(next.status,JSON.stringify(next),id);audit(db,user.id,action==='finalize'?'assessment.finalize':'assessment.update',id);db.exec('COMMIT');json(200,{assessment:get(id)});return true;
 }catch(e){if(db.isTransaction)db.exec('ROLLBACK');json(400,{error:e.message});return true;}
}
