import {today} from './domain.js?v=2.5.1';
import {request,user} from './store.js?v=2.5.1';
import {anamnesisFields,walkingFields,jointFields,testDefinitions,testResult,comparison} from './assessments-domain.js?v=2.6.1';
import {muscleRows,assistanceOptions,reasons,findingOptions,pomaItems,effectiveTug,compactTinetti,tinettiFields,tinettiStatus,tinettiStatuses,tinettiGroups,tinettiContext,tinettiAssistanceWarning,tinettiIncomplete,newTinettiDetails,testDescriptions,reviewLabel,tugFields,tugObservations,newTugDetails,decimalSeconds,tugRiskLevel,tugRisk,tugContext,tugVigilance,tugPhysicalAssistance,tugLegacyAdaptation,chairStatuses,chairArms,chairAssistance,chairStatus,chairResult} from './assessments-compact.js?v=2.6.1';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let records=[],trash=[],current=null,residents=[],filter='',view='active',dirty=false,reviewed=false,inFlight=false,host,notify,activeUser=null,ticket=0;
const $=s=>host?.querySelector(s),clinician=()=>['admin','kine'].includes(user?.role),owns=r=>clinician()&&(r.owner===user.id||user.role==='admin'),editable=()=>current?.status==='draft'&&!current.deletedAt&&owns(current),disabled=()=>editable()?'':'disabled';
const dateFR=v=>v?new Date(v+'T12:00:00').toLocaleDateString('fr-FR'):'';
const get=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object);
const set=(object,path,value)=>{const keys=path.split('.'),last=keys.pop();keys.reduce((value,key)=>value[key],object)[last]=value;};
const options=(values,value,empty='—')=>`<option value="">${empty}</option>`+values.map(v=>{const [key,label]=Array.isArray(v)?v:[v,v];return `<option value="${escape(key)}" ${String(value)===String(key)?'selected':''}>${escape(label)}</option>`;}).join('');
const select=(label,path,values,value=get(current,path),extra='',empty='—')=>`<label class="compact-field">${label}<select data-path="${path}" ${disabled()} ${extra}>${options(values,value,empty)}</select></label>`;
const input=(label,path,type='text',extra='')=>`<label class="compact-field">${label}<input data-path="${path}" type="${type}" value="${escape(get(current,path))}" ${disabled()} ${extra}></label>`;
const textarea=(label,path)=>`<label class="compact-field compact-text">${label}<textarea data-path="${path}" rows="3" ${disabled()}>${escape(get(current,path))}</textarea></label>`;
const check=(label,path)=>`<label class="check"><input type="checkbox" data-path="${path}" ${get(current,path)?'checked':''} ${disabled()}>${label}</label>`;
const heading=(number,label)=>`<h3>${number} — ${label}</h3>`;
async function assessmentList(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{let response;try{response=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal});}catch{throw Error(url+' — connexion impossible ou délai dépassé');}const mime=response.headers.get('content-type')||'absent';if(!/application\/json/i.test(mime))throw Error(url+' — HTTP '+response.status+' — réponse non JSON ('+mime+')');let data;try{data=await response.json();}catch{throw Error(url+' — HTTP '+response.status+' — JSON invalide');}if(!response.ok)throw Error(url+' — HTTP '+response.status+' : '+(data?.error||'Requête refusée'));if(!data||!Array.isArray(data.assessments))throw Error(url+' — réponse incompatible : une liste de bilans est attendue. Vérifier backend/assessments.js et le redémarrage de Node.');return data;}finally{clearTimeout(timer);}}

export function assessmentPanel(){return '<section id="assessments-panel" class="card"><h1>Bilans résidents</h1><p>Chargement…</p></section>';}
export async function mountAssessments({root,residentList,toast}){if(activeUser!==user?.id){records=[];trash=[];current=null;dirty=false;reviewed=false;activeUser=user?.id;}host=root;residents=residentList;notify=toast;const run=++ticket,sentUser=user?.id;try{const [main,deleted]=await Promise.all([assessmentList('/api/assessments'),clinician()?assessmentList('/api/assessments/trash'):Promise.resolve({assessments:[]})]);if(run!==ticket||user?.id!==sentUser||!host?.isConnected)return;records=main.assessments;trash=deleted.assessments;if(current&&!dirty)current=records.find(r=>r.id===current.id)||null;draw();}catch(e){if(host?.isConnected)host.innerHTML='<h1>Bilans résidents</h1><p>Échec de l’API ou du rendu des bilans. Aucun bilan n’est effacé.</p><pre id="assessment-api-diagnostic">'+escape(e.name+': '+e.message)+'</pre>';}}
function listRows(){let list=(view==='trash'?trash:records).filter(r=>!filter||r.residentId===filter);if(view==='pending')list=list.filter(r=>r.status==='final'&&!r.titanConfirmedAt);if(view==='history')list=list.filter(r=>r.status==='final');return [...list].sort((a,b)=>(view==='pending'?1:-1)*(a.date.localeCompare(b.date)||a.id.localeCompare(b.id)));}
function draw(){if(!host?.isConnected)return;const pending=records.filter(r=>r.status==='final'&&!r.titanConfirmedAt).length,list=listRows();host.innerHTML=`<div class="heading"><div><h1>Bilans résidents</h1><p class="help">Données partagées · Aucun envoi automatique vers Titan</p></div><button id="assessment-refresh">Actualiser</button></div><div class="tabs">${[['active','Brouillons et bilans'],['pending',`Bilans à saisir sur Titan (${pending})`],['history','Historique des bilans'],...(clinician()?[['trash','Corbeille des brouillons']]:[])].map(([key,label])=>`<button data-assessment-view="${key}" class="${view===key?'active':''}">${label}</button>`).join('')}</div><div class="toolbar"><label>Résident<select id="assessment-resident-filter"><option value="">Tous les résidents</option>${residents.map(r=>`<option value="${escape(r.id)}" ${filter===r.id?'selected':''}>${escape(r.code)}${r.archived?' (archivé)':''}</option>`).join('')}</select></label>${clinician()?'<button id="assessment-new" class="primary">Nouveau bilan initial</button>':''}</div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Résident</th><th>Étage / unité</th><th>Kiné</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${list.map(r=>`<tr data-assessment-row="${r.id}"><td>${dateFR(r.date)}</td><td>${escape(r.residentCode)}</td><td>${escape(r.residentSector)}</td><td>${escape(r.practitioner)}</td><td>${r.deletedAt?'Brouillon supprimé':r.status==='draft'?'Brouillon':r.titanConfirmedAt?`Saisi sur Titan<br><small>${escape(new Date(r.titanConfirmedAt).toLocaleString('fr-FR'))} · ${escape(r.titanConfirmedBy)}</small>`:'À saisir sur Titan'}</td><td>${r.deletedAt?`<button data-assessment-action="restore" data-id="${r.id}">Restaurer le brouillon</button>`:`<button data-assessment-action="open" data-id="${r.id}">Consulter</button>${r.status==='final'?` <button data-assessment-action="pdf" data-id="${r.id}">Voir le PDF</button>${!r.titanConfirmedAt?` <button data-assessment-action="titan" data-id="${r.id}">Marquer comme saisi sur Titan</button>`:''}${clinician()?` <button data-assessment-action="reevaluate" data-id="${r.id}">Créer une réévaluation</button>`:''}`:owns(r)?` <button data-assessment-action="trash" data-id="${r.id}" class="danger">Supprimer le brouillon</button>`:''}`}${owns(r)?` <button type="button" data-assessment-action="purge" data-id="${r.id}" class="danger">Supprimer définitivement</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6">Aucun bilan dans cette rubrique.</td></tr>'}</tbody></table></div><details class="compact-comparison"><summary>Comparer deux bilans finalisés du même résident</summary><div class="toolbar"><select id="assessment-compare-a" aria-label="Bilan antérieur">${comparisonOptions()}</select><select id="assessment-compare-b" aria-label="Bilan actuel">${comparisonOptions()}</select><button id="assessment-compare">Comparer</button></div><div id="assessment-comparison"></div></details><div id="assessment-editor">${current?editor():''}</div>`;
 $('#assessment-refresh').onclick=()=>mountAssessments({root:host,residentList:residents,toast:notify});$('#assessment-resident-filter').onchange=e=>{filter=e.target.value;draw();};host.querySelectorAll('[data-assessment-view]').forEach(b=>b.onclick=()=>{view=b.dataset.assessmentView;draw();});if($('#assessment-new'))$('#assessment-new').onclick=()=>newDialog();
 host.querySelectorAll('[data-assessment-action]').forEach(b=>b.onclick=()=>{const r=[...records,...trash].find(x=>x.id===b.dataset.id);if(!r)return;const action=b.dataset.assessmentAction;if(action==='open'){if(dirty&&!confirm('Quitter les modifications non enregistrées de ce brouillon ?'))return;current=structuredClone(r);dirty=false;reviewed=false;draw();$('#assessment-editor')?.scrollIntoView({block:'start'});}else if(action==='pdf')confirmPDF(r);else if(action==='reevaluate')newDialog(r);else if(action==='purge')confirmPermanentDelete(r);else lifecycle(r,action);});
 $('#assessment-compare').onclick=()=>{const a=records.find(r=>r.id===$('#assessment-compare-a').value),b=records.find(r=>r.id===$('#assessment-compare-b').value);if(!a||!b||a.id===b.id||a.residentId!==b.residentId){notify('Choisir deux bilans distincts du même résident.');return;}$('#assessment-comparison').innerHTML=comparisonTable(a,b);};if(current)bindEditor();}
function comparisonOptions(){return '<option value="">Choisir un bilan</option>'+records.filter(r=>r.status==='final'&&(!filter||r.residentId===filter)).map(r=>`<option value="${r.id}">${escape(r.residentCode)} · ${dateFR(r.date)} · ${escape(r.practitioner)} · ${r.type==='initial'?'Initial':'Réévaluation'} · ${r.finalizedAt?escape(new Date(r.finalizedAt).toLocaleString('fr-FR')):''}</option>`).join('');}
function comparisonTable(a,b){return `<p>Antérieur ${dateFR(a.date)} · Actuel ${dateFR(b.date)}. Les protocoles incompatibles ne donnent pas d’écart chiffré.</p><div class="table-wrap"><table><thead><tr><th>Mesure</th><th>Antérieur</th><th>Actuel</th><th>Évolution</th></tr></thead><tbody>${comparison(a.clinical,b.clinical).map(x=>`<tr><td>${escape(x.label)}</td><td>${escape(x.previous)}</td><td>${escape(x.current)}</td><td>${escape(x.delta)}</td></tr>`).join('')}</tbody></table></div>`;}
function newDialog(previous){if(dirty&&!confirm('Quitter les modifications non enregistrées ?'))return;const dialog=document.querySelector('#modal');dialog.innerHTML=`<div class="modal-head"><h2>${previous?'Créer une réévaluation':'Nouveau bilan initial'}</h2><button aria-label="Fermer">×</button></div><form id="assessment-create"><label>Résident existant<select id="assessment-new-resident" required ${previous?'disabled':''}>${residents.filter(r=>previous?r.id===previous.residentId:!r.archived).map(r=>`<option value="${escape(r.id)}" ${filter===r.id?'selected':''}>${escape(r.code)}</option>`).join('')}</select></label><label>Date du bilan<input id="assessment-new-date" type="date" required value="${today()}"></label><label>Kinésithérapeute évaluateur<select id="assessment-new-practitioner">${options(['Amélie','Alexandre'],previous?.practitioner||'Amélie').replace('<option value="">—</option>','')}</select></label>${previous?'<p>Les résultats précédents restent consultables et comparables. Les nouvelles mesures ne sont jamais préremplies comme des mesures actuelles.</p>':''}<button type="submit" class="primary">Créer le brouillon</button></form>`;dialog.showModal();dialog.querySelector('button').onclick=()=>dialog.close();dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(inFlight)return;inFlight=true;const sentUser=user.id;try{const result=await request('/api/assessments','POST',{residentId:previous?.residentId||dialog.querySelector('#assessment-new-resident').value,date:dialog.querySelector('#assessment-new-date').value,practitioner:dialog.querySelector('#assessment-new-practitioner').value,previousId:previous?.id,clinicalSchema:2});if(user?.id!==sentUser)return;current=result.assessment;records.unshift(current);view='active';dirty=false;reviewed=false;dialog.close();dialog.innerHTML='';draw();$('#assessment-editor')?.scrollIntoView({block:'start'});notify('Brouillon créé.');}catch(err){notify(err.message);}finally{inFlight=false;}};}
function mrcTable(group){const cells=current.clinical.mrc.cells;return `<h4>${group==='upper'?'Membres supérieurs':'Membres inférieurs'}</h4>${group==='upper'?'<p class="help">Mouvements fonctionnels : ne pas assimiler ces mesures à un groupe musculaire isolé sans protocole adapté.</p>':''}<div class="table-wrap"><table class="compact-mrc"><thead><tr><th>Mouvement</th><th>Droite</th><th>Gauche</th></tr></thead><tbody>${muscleRows.filter(([, ,g])=>g===group).map(([id,label])=>`<tr><th scope="row">${label}</th>${['R','L'].map(side=>{const key=id+side;return `<td><select aria-label="${label} ${side==='R'?'droite':'gauche'}" data-path="clinical.mrc.cells.${key}.value" ${disabled()}>${options([...Array.from({length:6},(_,i)=>[String(i),i+'/5']),['NE','NE : non évaluable']],cells[key].value)}</select>${cells[key].value==='NE'?select('Motif NE (facultatif)','clinical.mrc.cells.'+key+'.reason',reasons):''}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;}
function walkAidPicker(){
 const chosen=current.clinical.walk.aids;
 return `<div class="compact-aids">${assistanceOptions.map(a=>`<label class="check"><input type="checkbox" data-aid="walk" value="${escape(a)}" ${chosen.includes(a)?'checked':''} ${disabled()}>${a}</label>`).join('')}</div>`;
}
function compactClinical(){const c=current.clinical;return `${heading('1','Anamnèse et contexte clinique')}${textarea('Motif de prise en charge','clinical.reason')}${check('Observations complémentaires (facultatif)','clinical.observationsEnabled')}${c.observationsEnabled?textarea('Observations complémentaires','clinical.observations'):''}${heading('2','Examen clinique et fonctionnel')}${heading('2.1','Testing musculaire (MRC)')}${select('Testing musculaire','clinical.mrc.status',['Réalisable','Non réalisable'])}${c.mrc.status==='Réalisable'?mrcTable('upper')+mrcTable('lower')+'<p class="help">NE : non évaluable. Une cellule vide ou NE ne vaut jamais 0/5. 0 = aucune contraction ; 1 = contraction sans mouvement ; 2 = pesanteur éliminée ; 3 = contre pesanteur ; 4 = contre résistance ; 5 = force normale.</p>':c.mrc.status==='Non réalisable'?select('Motif du testing non réalisable','clinical.mrc.reason',reasons)+(c.mrc.reason==='Autre motif'?input('Préciser le motif','clinical.mrc.other'):''):''}${heading('2.2','Marche')}<div class="compact-line">${select('Marche','clinical.walk.possible',['Possible','Impossible'])}${select('Fauteuil roulant habituel','clinical.walk.wheelchair',['Oui','Non'])}</div>${c.walk.possible==='Possible'?check('Aide à la marche','clinical.walk.aidEnabled')+(c.walk.aidEnabled?walkAidPicker():'')+input('Périmètre de marche','clinical.walk.distance','text','maxlength="30" placeholder="Ex. : 25 m ou &gt; 100 m"'):c.walk.possible==='Impossible'?'<p class="notice">TUG non réalisable : marche impossible. Partie marche du Tinetti non évaluable. Le total reste provisoire.</p>':''}${heading('2.3','Test de Tinetti — cotation guidée')}${tinettiEditor()}${heading('2.4','Timed Up and Go (TUG)')}<p class="help">${testDescriptions.tug}</p>${tugEditor()}${heading('2.5','Five Times Sit-to-Stand — 5xSTS')}<p class="help">${testDescriptions.chair}</p>${chairEditor()}${heading('2.6','Bilan articulaire facultatif')}${check('Bilan articulaire (facultatif)','clinical.jointsEnabled')}${c.jointsEnabled?textarea('Observation articulaire pertinente','clinical.joints'):''}${heading('2.7','Transferts')}<div class="table-wrap"><table class="compact-transfers"><thead><tr><th>Transfert</th><th>Autonome</th><th>Assistance partielle</th><th>Assistance totale</th><th></th></tr></thead><tbody>${[['bedChair','Lit-fauteuil'],['sitStand','Assis-debout']].map(([key,label])=>`<tr><th>${label}</th>${['Autonome','Assistance partielle','Assistance totale'].map(value=>`<td><input type="radio" aria-label="${label} : ${value}" name="transfer-${key}" data-path="clinical.transfers.${key}" value="${value}" ${c.transfers[key]===value?'checked':''} ${disabled()}></td>`).join('')}<td><button type="button" data-clear="clinical.transfers.${key}" ${disabled()}>Effacer</button></td></tr>`).join('')}</tbody></table></div>${heading('2.8','Constat clinique retenu par l’évaluateur')}<div class="compact-findings">${findingOptions.map(([id,label])=>`<label class="check"><input type="checkbox" data-finding="${id}" ${c.findings.includes(id)?'checked':''} ${disabled()}>${label}</label>`).join('')}</div>`;}
function tugEditor(){
 const c=current.clinical,t=effectiveTug(c);
 const impossible=t.status==='Non réalisable',walkingImpossible=c.walk.possible==='Impossible';
 return `<section class="assessment-tug" aria-label="Saisie du Timed Up and Go">
  <div class="tug-time">
   <label class="compact-field">Temps (secondes)<input id="assessment-tug-time" inputmode="decimal" maxlength="30" value="${escape(impossible?'':t.time)}" aria-describedby="assessment-tug-interpretation" ${impossible?'disabled':disabled()}></label>
   <label class="check"><input id="assessment-tug-impossible" type="checkbox" ${impossible?'checked':''} ${walkingImpossible?'disabled':disabled()}>Test impossible</label>
  </div>
  ${walkingImpossible?'<p class="help">Marche impossible.</p>':''}
  <div id="assessment-tug-interpretation" class="tug-interpretation" role="status">${tugFeedback(t)}</div>
  <div class="tug-fields">${tugFields.map(([key,label,values])=>select(label,'clinical.tug.details.'+key,values,undefined,'','Sélectionner')).join('')}</div>
  <p id="assessment-tug-assistance" class="help" ${t.details?.humanAssistance==='Aide physique'?'':'hidden'}>${tugPhysicalAssistance}</p>
  <fieldset class="tug-observations">
   <legend>Observations complémentaires</legend>
   <details class="tug-observation-menu">
    <summary><span>Observations cliniques</span><span id="tug-observation-selection">${escape(tugSelection(t.details))}</span></summary>
    <div class="tug-observation-options">${tugObservations.map(value=>`<label class="check"><input type="checkbox" data-tug-observation value="${escape(value)}" ${t.details?.observations.includes(value)?'checked':''} ${disabled()}>${escape(value)}</label>`).join('')}</div>
   </details>
   ${textarea('Texte libre (facultatif)','clinical.tug.details.notes')}
  </fieldset>
 </section>`;
}
function riskTag(level,label){
 return level?`<strong class="clinical-risk clinical-risk--${level}">${escape(label)}</strong>`:'';
}
function tugSelection(details){
 const selected=tugObservations.filter(value=>details?.observations.includes(value));
 return selected.join(', ')||'Sélectionner';
}
function tugFeedback(tug){
 if(tug.status==='Réalisé'&&!tug.details&&tug.protocol==='Adapté')return `<p class="help">${tugLegacyAdaptation}</p>`;
 const level=tugRiskLevel(tug);
 if(!level)return tug.time?'<p>Saisir une durée positive en secondes.</p>':'';
 return `<p>${riskTag(level,tugRisk(tug))}</p>${level==='unavailable'?'':`<p class="help">${tugContext}<br>${tugVigilance}</p>`}`;
}
function prepareTugDetails(){
 const tug=current.clinical.tug;
 if(!tug.details){
  tug.details=newTugDetails();
  if(tug.status==='Non réalisable')tug.time='';
  $('#assessment-tug-interpretation').innerHTML=tugFeedback(effectiveTug(current.clinical));
 }
 return tug;
}
function bindTug(){
 const time=$('#assessment-tug-time'),impossible=$('#assessment-tug-impossible');
 if(!time||!editable())return;
 time.oninput=()=>{
  const tug=prepareTugDetails();
  tug.time=time.value.trim();
  tug.status=tug.time?'Réalisé':'';
  tug.reason='';
  time.setAttribute('aria-invalid',String(Boolean(tug.time)&&decimalSeconds(tug.time)===null));
  $('#assessment-tug-interpretation').innerHTML=tugFeedback(tug);
  changed();
 };
 impossible.onchange=()=>{
  const tug=prepareTugDetails();
  tug.status=impossible.checked?'Non réalisable':'';
  tug.reason='';
  tug.time='';
  time.value='';
  time.disabled=impossible.checked;
  time.removeAttribute('aria-invalid');
  $('#assessment-tug-interpretation').innerHTML=tugFeedback(tug);
  changed();
 };
 host.querySelectorAll('[data-tug-observation]').forEach(option=>option.onchange=()=>{
  const {details}=prepareTugDetails();
  details.observations=[...host.querySelectorAll('[data-tug-observation]:checked')].map(input=>input.value);
  $('#tug-observation-selection').textContent=tugSelection(details);
  changed();
 });
}
function tinettiEditor(){
 const c=current.clinical,t=c.tinetti,status=tinettiStatus(t),scores=compactTinetti(c);
 return `<section class="assessment-tinetti" aria-label="Saisie du Tinetti">
  ${select('Réalisation du Tinetti','clinical.tinetti.status',tinettiStatuses,status)}
  ${status==='Réalisé'?tinettiGroups.map(([group,label,max])=>`<fieldset class="tinetti-group" ${scores.groups[group].blocked?'disabled':''}>
   <legend data-tinetti-group="${group}">${tinettiGroupLabel(label,max,scores.groups[group])}</legend>
   ${scores.groups[group].blocked?'<p class="help">Marche impossible.</p>':''}
   <div class="tinetti-grid">${pomaItems.filter(([, ,key])=>key===group).map(([id,item,,values])=>select(item,'clinical.tinetti.items.'+id,[
    ...values.map((description,score)=>[String(score),score+' — '+description]),['NE','NE — Non évaluable']
   ])).join('')}</div>
  </fieldset>`).join(''):''}
  <div id="assessment-tinetti-score" role="status" ${status?'':'hidden'}>${tinettiSummary(scores,status)}</div>
  <div class="tinetti-aids">${tinettiFields.map(([key,label,values])=>select(label,'clinical.tinetti.details.'+key,values,undefined,'','Sélectionner')).join('')}</div>
  <p id="assessment-tinetti-assistance" class="help" ${t.details?.humanAssistance==='Aide physique'?'':'hidden'}>${tinettiAssistanceWarning}</p>
  ${textarea('Observations complémentaires','clinical.tinetti.details.notes')}
 </section>`;
}
function tinettiGroupLabel(label,max,group){
 const progress=group.blocked?'Non évaluable':`${group.entered}/${group.count} items renseignés${group.nonEvaluable?' · '+group.nonEvaluable+' NE':''}`;
 return `<strong>${label.toLocaleUpperCase('fr-FR')} : ${group.points??'—'} / ${max}</strong> <span class="help">${progress}</span>`;
}
function tinettiSummary(scores,status){
 if(status==='Non réalisé')return '<p>Test non réalisé.</p>';
 const result=riskTag(scores.level,scores.interpretation);
 return `${status==='Réalisé'?`<p><strong>SCORE TOTAL TINETTI : ${scores.provisionalTotal??'—'} / 28</strong></p>
  ${scores.partial?`<p class="help">${tinettiIncomplete}</p>`:''}`:''}
  ${result?`<p>${result}</p>`:''}
  ${scores.description?`<p>${scores.description}</p><p class="help">${tinettiContext}</p>`:''}`;
}
function refreshTinetti(){
 const c=current.clinical,scores=compactTinetti(c);
 for(const [key,label,max] of tinettiGroups){
  const legend=$('[data-tinetti-group="'+key+'"]');
  if(legend)legend.innerHTML=tinettiGroupLabel(label,max,scores.groups[key]);
 }
 $('#assessment-tinetti-score').innerHTML=tinettiSummary(scores,tinettiStatus(c.tinetti));
}
function chairEditor(){
 const chair=current.clinical.chair,status=chairStatus(chair);
 return `<section aria-label="Saisie du 5xSTS">
  ${select('Réalisation du 5xSTS','clinical.chair.status',chairStatuses,status)}
  ${status==='Réalisé'?input('Temps (secondes)','clinical.chair.time','text','inputmode="decimal" maxlength="30" aria-describedby="assessment-chair-interpretation"'):''}
  <p id="assessment-chair-interpretation" class="help" role="status">${escape(chairFeedback(chair))}</p>
  ${status==='Réalisé'?`<div class="compact-line">
   ${select('Utilisation des bras','clinical.chair.arms',chairArms,undefined,'','Sélectionner')}
   ${select('Assistance humaine','clinical.chair.humanAssistance',chairAssistance,undefined,'','Sélectionner')}
  </div>`:''}
  ${textarea('Observations complémentaires','clinical.chair.notes')}
 </section>`;
}
function chairFeedback(chair){
 if(chair.status==='Réalisé'&&chair.time&&decimalSeconds(chair.time)===null&&chair.humanAssistance!==undefined)return 'Saisir une durée positive en secondes.';
 return chairResult(chair).messages.join('. ');
}
function legacyClinical(){const c=current.clinical;return `<p class="notice">Ancien format conservé : ses données ne sont pas converties ou supprimées. Les nouveaux bilans utilisent le formulaire compact.</p>${heading('1','Anamnèse et contexte clinique')}<details open><summary>Données cliniques historiques</summary>${anamnesisFields.map(([id,label])=>textarea(label,'clinical.anamnesis.'+id)).join('')}</details>${c.findings?.length?'<p>Constats historiques : '+c.findings.map(id=>escape(findingOptions.find(x=>x[0]===id)?.[1]||id)).join(', ')+'</p>':''}${c.evidence?textarea('Éléments cliniques historiques','clinical.evidence'):''}${c.joints?'<details><summary>Détails articulaires historiques conservés</summary>'+jointFields.filter(([id])=>c.joints[id]).map(([id,label])=>'<p>'+escape(label)+' : '+escape(c.joints[id])+'</p>').join('')+'</details>':''}${heading('2','Examen clinique et fonctionnel')}<details><summary>Marche historique</summary>${walkingFields.map(([id,label])=>textarea(label,'clinical.walking.'+id)).join('')}</details>${testDefinitions.map(def=>{const t=c.tests[def.id];return `<details><summary>${escape(def.label)} — ${escape(t.status)}</summary>${select('Réalisation','clinical.tests.'+def.id+'.status',['Non réalisé','Non réalisable','Contre-indiqué','Réalisé'])}${input('Résultat conservé','clinical.tests.'+def.id+'.value')}${input('Motif conservé','clinical.tests.'+def.id+'.reason')}${['tug','tinetti'].includes(def.id)?'':textarea('Conditions conservées','clinical.tests.'+def.id+'.conditions')}${def.id==='tinetti'?pomaItems.map(([id,label,,values])=>select(label,'clinical.tests.tinetti.items.'+id,values.map((_,i)=>String(i)))).join(''):''}</details>`;}).join('')}`;}
function editor(){const r=current;return `<hr><h2>${r.type==='initial'?'Bilan initial':'Réévaluation'} · ${escape(r.residentCode)}</h2><p id="assessment-review" class="notice" role="status">${r.status==='final'?`Bilan validé par ${escape(r.finalizedBy)} le ${escape(new Date(r.finalizedAt).toLocaleString('fr-FR'))}`:dirty?'Modifications non enregistrées : relire le diagnostic et le projet après tout changement clinique.':r.proposal?.needsReview?'Les résultats ont changé depuis la génération. Relire et actualiser le diagnostic et le projet si nécessaire.':'Brouillon enregistré — non finalisé'}</p><div class="compact-line">${input('Date du bilan','date','date')}${select('Kinésithérapeute évaluateur','practitioner',['Amélie','Alexandre'])}</div>${r.clinical.schema===2?compactClinical():legacyClinical()}${heading('3','Diagnostic kinésithérapique')}${textarea(r.status==='final'?'Diagnostic validé':'Proposition de diagnostic — modifiable','diagnosis')}${heading('4','Projet thérapeutique')}${textarea(r.status==='final'?'Projet validé':'Proposition de projet — modifiable','project')}${r.clinical.schema===2?select('Échéance de réévaluation','reviewWindow',[['3m','Dans 3 mois'],['6m','Dans 6 mois'],['clinical','Selon l’évolution clinique']]):`<p>Échéance conservée : ${escape(r.reviewDate||'non renseignée')}</p>`}${r.type==='reevaluation'?textarea('Évolution objectivée et adaptation des objectifs','evolution'):''}${r.previousId?`<details><summary>Comparer au bilan précédent</summary>${records.some(x=>x.id===r.previousId)?comparisonTable(records.find(x=>x.id===r.previousId),r):'Bilan précédent absent de la liste.'}</details>`:''}${r.proposal?'<details><summary>Dernières propositions générées (avant corrections)</summary><p>'+escape(r.proposal.diagnosis)+'</p><p>'+escape(r.proposal.project)+'</p></details>':''}<button id="assessment-versions">Consulter les versions enregistrées</button>${editable()?`<label class="check"><input type="checkbox" id="assessment-reviewed" ${reviewed?'checked':''}>J’ai relu et corrigé le diagnostic et le projet, vérifié les données cliniques et les précautions applicables.</label><div class="modal-actions"><button id="assessment-generate">Générer le diagnostic et le projet</button><button id="assessment-save">Enregistrer le brouillon</button><button id="assessment-finalize" class="primary">Valider le bilan</button><button id="assessment-trash" class="danger">Supprimer le brouillon</button></div><p class="help">Sauvegarde volontaire sur le serveur. Une suppression récupérable conserve la dernière version enregistrée ; elle ne supprime jamais le résident.</p>`:r.status==='final'?'<button id="assessment-pdf" class="primary">Exporter en PDF</button>':''}`;}
function changed(){dirty=true;reviewed=false;for(const key of ['diagnosis','project'])for(const suffix of ['ValidatedAt','ValidatedBy','ValidatedById'])delete current[key+suffix];if($('#assessment-reviewed'))$('#assessment-reviewed').checked=false;if($('#assessment-review'))$('#assessment-review').textContent='Modifications non enregistrées : les propositions doivent être revérifiées. Aucun texte corrigé n’est écrasé automatiquement.';}
function bindEditor(){bindTug();host.querySelectorAll('[data-path]').forEach(el=>el.oninput=()=>{if(!editable())return;const value=el.type==='checkbox'?el.checked:el.value;
 if(el.dataset.path.startsWith('clinical.tug.details.')){
  const {details}=prepareTugDetails();
  set(current,el.dataset.path,value);
  $('#assessment-tug-assistance').hidden=details.humanAssistance!=='Aide physique';
  changed();
  return;
 }
 if(el.dataset.path.startsWith('clinical.tinetti.')){
  const t=current.clinical.tinetti;
  if(el.dataset.path.startsWith('clinical.tinetti.details.'))t.details??=newTinettiDetails();
  set(current,el.dataset.path,value);
  changed();
  if(el.dataset.path==='clinical.tinetti.status'){draw();return;}
  if(el.dataset.path.startsWith('clinical.tinetti.items.'))refreshTinetti();
  if(el.dataset.path==='clinical.tinetti.details.humanAssistance')$('#assessment-tinetti-assistance').hidden=value!=='Aide physique';
  return;
 }
 if(el.dataset.path.startsWith('clinical.chair.')){
  const chair=current.clinical.chair,key=el.dataset.path.split('.').at(-1);
  chair.humanAssistance??='';
  chair.notes??='';
  chair[key]=key==='time'?value.trim():value;
  if(chairStatus(chair)!=='Réalisé')chair.time='';
  changed();
  if(key==='status'){draw();return;}
  if(key!=='notes')$('#assessment-chair-interpretation').textContent=chairFeedback(chair);
  return;
 }
 set(current,el.dataset.path,value);changed();if(el.tagName==='SELECT'||el.type==='checkbox'||el.type==='radio')draw();});
 host.querySelectorAll('[data-aid]').forEach(el=>el.onchange=()=>{const aids=current.clinical[el.dataset.aid].aids;current.clinical[el.dataset.aid].aids=el.checked?[...aids,el.value]:aids.filter(x=>x!==el.value);changed();draw();});host.querySelectorAll('[data-finding]').forEach(el=>el.onchange=()=>{current.clinical.findings=el.checked?[...current.clinical.findings,el.dataset.finding]:current.clinical.findings.filter(x=>x!==el.dataset.finding);changed();});host.querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>{set(current,b.dataset.clear,'');changed();draw();});
 if($('#assessment-versions'))$('#assessment-versions').onclick=async()=>{const sentUser=user.id;try{const data=await request('/api/assessments/'+current.id+'/versions');if(user?.id!==sentUser)return;const dialog=document.querySelector('#modal');dialog.innerHTML='<div class="modal-head"><h2>Versions enregistrées</h2><button aria-label="Fermer">×</button></div>'+(data.versions.length?data.versions.map(v=>`<details><summary>${escape(new Date(v.at).toLocaleString('fr-FR'))} · ${escape(v.data.status)} · ${escape(v.actorName||v.actor)}</summary><h3>Diagnostic</h3><p>${escape(v.data.diagnosis)}</p><h3>Projet</h3><p>${escape(v.data.project)}</p></details>`).join(''):'<p>Aucune version intermédiaire enregistrée pour cet ancien bilan. Le document courant reste conservé.</p>');dialog.showModal();dialog.querySelector('button').onclick=()=>dialog.close();}catch(e){notify(e.message);}};
 if(!editable()){if($('#assessment-pdf'))$('#assessment-pdf').onclick=()=>confirmPDF(current);return;}
 $('#assessment-reviewed').onchange=e=>reviewed=e.target.checked;$('#assessment-save').onclick=()=>saveDraft();$('#assessment-generate').onclick=()=>{if((current.diagnosis||current.project)&&!confirm('Remplacer les deux textes par de nouvelles propositions ? Les versions enregistrées restent consultables.'))return;saveDraft({generate:true});};$('#assessment-trash').onclick=()=>lifecycle(current,'trash');
 $('#assessment-finalize').onclick=async()=>{if(!reviewed){notify('Confirmez la relecture professionnelle des deux textes.');return;}if(!confirm('Valider ce bilan ? La version finalisée sera conservée et ne pourra pas être modifiée silencieusement.'))return;const confirmed=reviewed;if(!await saveDraft())return;await mutate('/api/assessments/'+current.id+'/finalize',{revision:current.revision,confirmation:'FINALISER',confirmReviewed:confirmed});};}
function accept(r){if(r.deletedAt){records=records.filter(x=>x.id!==r.id);trash=[r,...trash.filter(x=>x.id!==r.id)];if(current?.id===r.id)current=null;}else{records=[r,...records.filter(x=>x.id!==r.id)];trash=trash.filter(x=>x.id!==r.id);if(current?.id===r.id)current=structuredClone(r);}}
async function saveDraft(flags={}){if(inFlight||!editable())return false;inFlight=true;const sentId=current.id,sentUser=user.id;host.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);try{const data=await request('/api/assessments/'+sentId,'PUT',{revision:current.revision,assessment:current,...flags});if(user?.id!==sentUser)return false;accept(data.assessment);dirty=false;if(flags.generate)reviewed=false;draw();notify('Brouillon enregistré.');return true;}catch(e){notify(e.message);return false;}finally{inFlight=false;draw();}}
async function mutate(url,body){if(inFlight)return;inFlight=true;const sentUser=user.id;try{const data=await request(url,'POST',body);if(user?.id!==sentUser)return;const affectsCurrent=!current||current.id===data.assessment.id;accept(data.assessment);if(affectsCurrent){dirty=false;reviewed=false;}draw();notify('Action enregistrée.');}catch(e){notify(e.message);}finally{inFlight=false;}}
function lifecycle(r,action){const confirmations={trash:['Voulez-vous vraiment supprimer ce brouillon de bilan ?','SUPPRIMER LE BROUILLON'],restore:['Restaurer ce brouillon de bilan ?','RESTAURER'],titan:[`Confirmez-vous avoir intégré le PDF du bilan du ${dateFR(r.date)} pour ${r.residentCode} dans le bon dossier Titan ?`,'SAISI SUR TITAN']};if(!confirm(confirmations[action][0]))return;mutate('/api/assessments/'+r.id+'/'+action,{revision:r.revision,confirmation:confirmations[action][1]});}
function confirmPermanentDelete(record){
 if(inFlight)return;
 const dialog=document.querySelector('#modal'),sentUser=user.id;
 dialog.innerHTML=`<div class="modal-head"><h2>Voulez-vous effacer définitivement ce bilan&nbsp;?</h2><button type="button" aria-label="Fermer">×</button></div>
 <p class="notice">${escape(record.residentCode)} · ${dateFR(record.date)} · ${escape(record.practitioner)} · ${record.type==='initial'?'Bilan initial':'Réévaluation'}</p>
 <p>Vérifiez les règles de conservation applicables avant de supprimer ce bilan. Son contenu, ses versions et le PDF conservé par l’application seront effacés de la base active. Les sauvegardes antérieures, les PDF déjà téléchargés et les copies dans Titan suivent leur propre rétention.</p>
 <form id="assessment-purge-form">
  <label>Saisissez exactement « effacer »<input id="assessment-purge-confirmation" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" required></label>
  <div class="modal-actions"><button type="button" data-cancel>Annuler</button> <button type="submit" class="danger" disabled>Confirmer la suppression définitive</button></div>
  <p role="alert"></p>
 </form>`;
 const form=dialog.querySelector('form'),input=form.querySelector('input'),submit=form.querySelector('[type=submit]');
 dialog.querySelector('.modal-head button').onclick=form.querySelector('[data-cancel]').onclick=()=>dialog.close();
 input.oninput=()=>submit.disabled=inFlight||input.value!=='effacer';
 form.onsubmit=async event=>{
  event.preventDefault();
  if(inFlight||input.value!=='effacer')return;
  inFlight=true;
  submit.disabled=true;
  try{
   const result=await request('/api/assessments/'+record.id+'/purge','POST',{revision:record.revision,confirmation:input.value});
   if(user?.id!==sentUser)return;
   if(result.deletedId!==record.id)throw Error('La réponse du serveur ne correspond pas au bilan sélectionné.');
   records=records.filter(item=>item.id!==record.id);
   trash=trash.filter(item=>item.id!==record.id);
   if(current?.id===record.id){current=null;dirty=false;reviewed=false;}
   if(form.isConnected&&dialog.open)dialog.close();
   draw();
   notify('Bilan définitivement supprimé de la base active.');
  }catch(error){
   if(form.isConnected)form.querySelector('[role=alert]').textContent=error.message;
  }finally{
   inFlight=false;
   if(form.isConnected)submit.disabled=input.value!=='effacer';
  }
 };
 dialog.showModal();
 input.focus();
}
function confirmPDF(record){const sentUser=user.id,r=structuredClone(record),dialog=document.querySelector('#modal');dialog.innerHTML=`<div class="modal-head"><h2>Vérifier le dossier résident</h2><button aria-label="Fermer">×</button></div><p class="notice"><strong>${escape(r.residentCode)}</strong> · ${escape(r.residentSector)}<br>${dateFR(r.date)} · ${escape(r.practitioner)} · ${r.type==='initial'?'Bilan initial':'Réévaluation'}<br>Validé le ${r.finalizedAt?escape(new Date(r.finalizedAt).toLocaleString('fr-FR')):'—'} · ${escape(r.finalizedBy)}</p><p>Le PDF ne comportera aucun identifiant résident. L’absence d’identifiant ne garantit pas l’anonymisation du texte clinique. Vérifier le bon dossier Titan et les éventuels éléments identifiants saisis en texte libre.</p><label class="check"><input id="assessment-confirm-resident" type="checkbox">Je confirme le résident et le bilan sélectionnés.</label><button id="assessment-download" class="primary" disabled>Voir / Télécharger ce PDF</button>`;dialog.showModal();dialog.querySelector('button').onclick=()=>dialog.close();dialog.querySelector('#assessment-confirm-resident').onchange=e=>dialog.querySelector('#assessment-download').disabled=!e.target.checked;dialog.querySelector('#assessment-download').onclick=async()=>{const button=dialog.querySelector('#assessment-download');button.disabled=true;try{const data=await request('/api/assessments/'+r.id+'/export','POST',{confirmResidentId:r.residentId});if(user?.id!==sentUser||!dialog.open)return;if(data.assessmentId!==r.id)throw Error('Le document reçu ne correspond pas au bilan sélectionné.');const url=URL.createObjectURL(new Blob([Uint8Array.from(atob(data.file),c=>c.charCodeAt(0))],{type:'application/pdf'}));dialog.innerHTML='<div class="modal-head"><h2>PDF du bilan sélectionné</h2><button aria-label="Fermer">×</button></div><p>PDF sans identifiant résident. Cette consultation ne confirme aucune saisie dans Titan.</p>';const info=document.createElement('p');info.textContent=r.residentCode+' · '+dateFR(r.date)+' · '+r.practitioner;dialog.append(info);const preview=document.createElement('a');preview.href=url;preview.target='_blank';preview.rel='noopener';preview.textContent='Ouvrir le PDF';const download=document.createElement('a');download.href=url;download.download=data.filename;download.textContent='Télécharger le PDF';dialog.append(preview,document.createElement('br'),download);download.click();dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});}catch(e){notify(e.message);if(button.isConnected)button.disabled=false;}};}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
