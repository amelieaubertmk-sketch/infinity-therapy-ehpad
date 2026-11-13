export const sectors=['Premier étage','Deuxième étage','Maisonnée'];
export const activities=['Marche','Transfert','Renforcement musculaire','Soins'];
export const practitioners=['Amélie','Alexandre'];
export const statuses=['À saisir','En cours de saisie','Saisi sur Titan'];
export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function seed(){return {version:1,residents:['ARB.','MOL.','DUR.','BEL.','ROS.','LUM.'].map((code,i)=>({id:crypto.randomUUID(),code,sector:sectors[Math.floor(i/2)],archived:false,templates:Object.fromEntries(activities.map((a,j)=>[a,[`Travail de la marche avec déambulateur deux roues. Sollicitation de l’équilibre et de la coordination. Objectif : maintien de l’autonomie lors des déplacements.`,`Travail des transferts assis-debout avec assistance adaptée. Objectif : maintien des capacités fonctionnelles et sécurisation des transferts.`,`Renforcement musculaire adapté des membres inférieurs. Objectif : entretien de la force musculaire et prévention du déconditionnement.`,`Mobilisations et prise en charge kinésithérapique adaptées aux capacités fonctionnelles du résident.`][j]]))})),transmissions:[]};}
export function createTransmission(db,input){
 const resident=db.residents.find(r=>r.id===input.residentId&&!r.archived);
 if(!resident)throw Error('Sélectionnez un résident actif.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||(!Number.isFinite(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date))throw Error('Indiquez une date valide.');
 if(!activities.includes(input.activity)||!practitioners.includes(input.practitioner))throw Error('Sélectionnez une activité et un kinésithérapeute.');
 const text=input.text?.trim()||'',observation=input.observation?.trim()||'',reason=input.reason?.trim()||'';
 if(input.notPerformed&&!reason)throw Error('Précisez le motif de la séance non réalisée.');
 if(!input.notPerformed&&!text)throw Error('Saisissez une transmission avant de valider.');
 const finalText=input.notPerformed?`Séance non réalisée\nMotif : ${reason}`:text+(observation?'\n\nObservation complémentaire\n'+observation:'');
 return {id:crypto.randomUUID(),residentId:resident.id,residentCode:resident.code,sector:resident.sector,date:input.date,activity:input.activity,practitioner:input.practitioner,text:input.notPerformed?'':text,observation:input.notPerformed?'':observation,reason:input.notPerformed?reason:'',notPerformed:!!input.notPerformed,finalText,validatedAt:new Date().toISOString(),status:statuses[0],statusHistory:[]};
}
export function potentialDuplicate(db,input){return db.transmissions.some(t=>t.residentId===input.residentId&&t.date===input.date);}
export function changeStatus(t,status){if(t.status==='Annulée')throw Error('Une transmission annulée ne peut plus changer de statut.');if(!statuses.includes(status))throw Error('Statut invalide.');return {...t,status,statusHistory:[...t.statusHistory,{from:t.status,to:status,at:new Date().toISOString()}]};}

export function cancelTransmission(t,reason){if(t.status==='Annulée')throw Error('Transmission déjà annulée.');if(!reason?.trim())throw Error('Indiquez un motif d’annulation.');const at=new Date().toISOString();return {...t,status:'Annulée',cancellation:{reason:reason.trim(),at,previousStatus:t.status},statusHistory:[...t.statusHistory,{from:t.status,to:'Annulée',at}]};}

export function deleteResident(db,id){if(!db.residents.some(r=>r.id===id))throw Error('Résident introuvable.');return {...db,residents:db.residents.filter(r=>r.id!==id),transmissions:db.transmissions.filter(t=>t.residentId!==id)};}
// Only these fields survive completion. Never spread the original payload here.
export function titanSummary(t){return {id:t.id,residentId:t.residentId,residentCode:t.residentCode,sector:t.sector,date:t.date,activity:t.activity,practitioner:t.practitioner,status:statuses[2],notPerformed:!!t.notPerformed,validatedAt:t.validatedAt,...(t.createdBy?{createdBy:t.createdBy}:{}),...(t.validatedBy?{validatedBy:t.validatedBy}:{}),...(t.topaze?{topaze:t.topaze}:{}),...(t.topazeHistory?{topazeHistory:t.topazeHistory}:{}),completedAt:t.completedAt||t.statusHistory?.filter(h=>h.to===statuses[2]).at(-1)?.at||null};}
export function purgeTitan(db){return {...db,transmissions:db.transmissions.map(t=>t.status===statuses[2]?titanSummary(t):t)};}

export function deleteTitanSummary(db,id){const t=db.transmissions.find(t=>t.id===id);if(!t||t.status!==statuses[2])throw Error('Seule une ligne déjà saisie sur Titan peut être supprimée.');return {...db,transmissions:db.transmissions.filter(t=>t.id!==id)};}

export function deleteCancelledTransmission(db,id){const t=db.transmissions.find(t=>t.id===id);if(!t||t.status!=='Annulée')throw Error('Seule une transmission annulée peut être supprimée.');return {...db,transmissions:db.transmissions.filter(t=>t.id!==id)};}

export function pendingTransmissions(rows){return rows.filter(t=>t.status!==statuses[2]&&t.status!=='Annulée');}
export function orderedTransmissions(rows,history=false){return [...rows].sort((a,b)=>(history?-1:1)*(a.date.localeCompare(b.date)||String(a.validatedAt||'').localeCompare(String(b.validatedAt||''))||a.id.localeCompare(b.id)));}
export function sessionAge(date,now=today()){
 const days=Math.round((Date.parse(now)-Date.parse(date))/86400000);
 return days===0?{color:'today',label:"Aujourd’hui"}:days===1?{color:'yesterday',label:'Hier'}:days>1?{color:'older',label:'Antérieure'}:{color:'future',label:'À venir'};
}

// Administrative prescription follow-up only; never a legal validity decision.
export function validatePrescription(value){
 if(!value||!['unknown','missing','dated'].includes(value.status))throw Error('Statut d’ordonnance invalide.');
 if(value.status!=='dated'){if(value.date!==undefined&&value.date!=='')throw Error('Une ordonnance sans date disponible ne peut pas conserver une date.');return {status:value.status};}
 if(typeof value.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!Number.isFinite(Date.parse(value.date))||new Date(value.date).toISOString().slice(0,10)!==value.date)throw Error('Date d’ordonnance invalide.');
 return {status:'dated',date:value.date};
}
export function prescriptionFollowUp(resident,now=today()){
 const p=resident?.prescription;
 if(!p||p.status==='unknown')return {status:'unknown'};
 if(p.status==='missing')return {status:'missing'};
 const [year,month,day]=p.date.split('-').map(Number);
 const lastDay=new Date(Date.UTC(year+1,month,0)).getUTCDate();
 const due=`${year+1}-${String(month).padStart(2,'0')}-${String(Math.min(day,lastDay)).padStart(2,'0')}`;
 const days=Math.round((Date.parse(due)-Date.parse(now))/86400000);
 return {status:'dated',date:p.date,due,reminder:days<0?'overdue':days<=30?'soon':'normal'};
}
