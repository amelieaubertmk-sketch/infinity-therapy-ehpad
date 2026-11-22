// Compact assessment schema v2. Local deterministic rules; legacy documents are never converted.
export const assessmentRulesVersion='2.6.2';
export const muscleRows=[['pull','Traction','upper'],['push','Poussée','upper'],['grip','Préhension','upper'],['hip','Flexion de hanche','lower'],['kneeFlex','Flexion de genou','lower'],['kneeExt','Extension de genou','lower'],['ankleDorsi','Releveurs du pied','lower'],['anklePlantar','Flexion plantaire','lower']];
export const assistanceOptions=['Aide humaine','Canne anglaise (béquille)','Canne simple','Canne tripode','Déambulateur 2 roues','Déambulateur 4 roues'];
export const reasons=['Difficultés de compréhension ou d’exécution de la consigne','Douleur limitant l’évaluation','Fatigabilité','Refus du résident','Autre motif'];
export const findingOptions=[['strength','Déficit de force musculaire'],['balance','Troubles de l’équilibre'],['walking','Difficultés à la marche'],['distance','Limitation du périmètre de marche'],['transfer','Difficultés de transfert'],['conditioning','Déconditionnement fonctionnel'],['joints','Limitation articulaire'],['pain','Douleur avec retentissement fonctionnel'],['autonomy','Perte d’autonomie'],['instructions','Difficultés de compréhension ou d’exécution des consignes']];
// POMA 28: the 360-degree turn has two independent one-point observations.
export const pomaItems=[
 ['sitting','Équilibre assis','balance',['S’incline ou glisse','Stable et sûr']],
 ['arising','Lever de chaise','balance',['Incapable sans aide','Utilise les bras','Sans utilisation des bras']],
 ['attempts','Tentatives de lever','balance',['Incapable sans aide','Plus d’une tentative','Une seule tentative']],
 ['immediate','Équilibre debout immédiat (5 premières secondes)','balance',['Instable','Stable avec aide technique','Stable sans aide technique']],
 ['standing','Équilibre debout','balance',['Instable','Stable, appui large ou aide technique','Appui étroit sans aide technique']],
 ['nudged','Réponse à trois légères poussées sternales','balance',['Commence à tomber','Vacille, se rattrape','Stable']],
 ['eyes','Yeux fermés debout','balance',['Instable','Stable']],
 ['turnSteps','Rotation à 360° : pas','balance',['Discontinus','Continus']],
 ['turnSteady','Rotation à 360° : stabilité','balance',['Instable','Stable']],
 ['sitDown','Retour assis','balance',['Peu sûr ou chute sur la chaise','Utilise les bras ou mouvement brusque','Mouvement sûr et fluide']],
 ['start','Initiation de la marche','gait',['Hésitations ou plusieurs tentatives','Sans hésitation']],
 ['lengthR','Longueur du pas droit','gait',['Ne dépasse pas le pied gauche en appui','Dépasse le pied gauche']],
 ['clearR','Hauteur du pas droit','gait',['Ne décolle pas complètement','Décolle complètement']],
 ['lengthL','Longueur du pas gauche','gait',['Ne dépasse pas le pied droit en appui','Dépasse le pied droit']],
 ['clearL','Hauteur du pas gauche','gait',['Ne décolle pas complètement','Décolle complètement']],
 ['symmetry','Symétrie des pas','gait',['Longueurs différentes','Longueurs semblables']],
 ['continuity','Continuité des pas','gait',['Arrêts ou discontinuité','Pas continus']],
 ['path','Trajectoire (environ 3 mètres)','gait',['Déviation marquée','Déviation modérée ou aide technique','Trajectoire droite sans aide technique']],
 ['trunk','Tronc','gait',['Balancement marqué ou aide technique','Sans balancement, flexion ou bras écartés','Sans balancement, flexion, aide technique ou bras écartés']],
 ['stance','Écartement des pieds','gait',['Talons écartés','Talons se rapprochent pendant la marche']]
];
export const tugFields=[
 ['technicalAid','Aide technique',['Aucune','Canne simple','Canne tripode','Cadre fixe','Déambulateur deux roues','Déambulateur quatre roues']],
 ['humanAssistance','Assistance humaine',['Aucune','Simple surveillance','Aide physique']],
 ['sitToStand','Transfert assis-debout',['Sans utilisation des accoudoirs','Avec utilisation des accoudoirs']]
];
export const tugObservations=['Instabilité','Difficulté au demi-tour','Petits pas','Hésitation'];
export const tugContext='Interprétation indicative à confronter à l’évaluation clinique globale du résident.';
export const tugVigilance='À partir d’un risque modéré, une vigilance adaptée et une évaluation clinique globale sont recommandées.';
export const tugPhysicalAssistance='Résultat chronométrique à interpréter avec prudence en présence d’une assistance physique.';
export const tugLegacyAdaptation='Des adaptations sont consignées dans ce bilan historique. Interprétation à confronter aux conditions de mesure.';
export function newTugDetails(){
 return {technicalAid:'',humanAssistance:'',sitToStand:'',observations:[],notes:''};
}
export const tinettiFields=[
 ['technicalAid','Aide technique utilisée',['Aucune','Canne simple','Canne tripode','Deux cannes','Cadre fixe','Déambulateur deux roues','Déambulateur quatre roues']],
 tugFields[1]
];
export const tinettiStatuses=['Réalisé','Non réalisé','Impossible'];
export const tinettiGroups=[['balance','Équilibre',16],['gait','Marche',12]];
export const tinettiContext='Classification indicative à confronter à l’évaluation clinique globale.';
export const tinettiAssistanceWarning='L’aide physique peut limiter la comparabilité avec les conditions habituelles de cotation.';
export const tinettiIncomplete='Score provisoire — évaluation incomplète';
export const tinettiNotEvaluable='Risque non évaluable par le Tinetti';
export function newTinettiDetails(){
 return {technicalAid:'',humanAssistance:'',notes:''};
}
export function tinettiStatus(test){
 return test.status==='Non réalisable'?'Impossible':test.status;
}
export const testDescriptions={tug:'Le résident se lève d’une chaise, marche 3 mètres, effectue un demi-tour, revient à la chaise et se rassoit. Le temps total est chronométré.',tinetti:'Le Tinetti POMA à 28 points évalue des tâches d’équilibre et de marche selon une cotation guidée.',chair:'Le résident réalise cinq passages consécutifs de la position assise à debout, aussi rapidement que possible. Le temps total est chronométré.'};
export const chairStatuses=[['Réalisé','Réalisé'],['Non réalisé','Non réalisé'],['Impossible','Impossible']];
export const chairArms=[['Non','Sans utilisation des bras'],['Oui','Avec utilisation des bras']];
export const chairAssistance=['Aucune','Simple surveillance','Aide physique'];
export const chairContext='Repères indicatifs à confronter à l’âge, aux capacités fonctionnelles et à l’évaluation clinique globale.';
export function chairStatus(chair){
 return chair.status==='Non réalisable'?'Impossible':chair.status;
}
export function chairResult(chair){
 const status=chairStatus(chair),messages=[];
 if(status==='Impossible')return {level:'',messages:['Test non évaluable — Performance non évaluable']};
 if(status!=='Réalisé')return {level:'',messages};
 if(chair.arms==='Oui')messages.push('Test réalisé avec utilisation des bras — résultat descriptif, non directement comparable aux références standardisées');
 if(chair.humanAssistance==='Aide physique')messages.push('Test réalisé avec assistance physique — interprétation standardisée non applicable');
 const seconds=decimalSeconds(chair.time);
 if(messages.length||seconds===null||chair.arms!=='Non'||!['Aucune','Simple surveillance'].includes(chair.humanAssistance))return {level:'',messages};
 const level=seconds<12?'satisfactory':seconds<=15?'slow':'verySlow';
 const label={satisfactory:'Performance fonctionnelle satisfaisante',slow:'Performance ralentie',verySlow:'Performance nettement ralentie'};
 return {level,messages:[label[level],chairContext]};
}
export function newCompactClinical(){return {schema:2,reason:'',observationsEnabled:false,observations:'',mrc:{status:'',reason:'',other:'',cells:Object.fromEntries(muscleRows.flatMap(([id])=>['R','L'].map(side=>[id+side,{value:'',reason:''}])) )},walk:{possible:'',aidEnabled:false,aids:[],distance:'',wheelchair:''},tug:{status:'',time:'',reason:'',aidsOverride:false,aids:[],aidsInitialized:false,protocol:'',conditions:'',details:newTugDetails()},tinetti:{status:'',reason:'',items:Object.fromEntries(pomaItems.map(([id])=>[id,''])),details:newTinettiDetails()},chair:{status:'',time:'',reason:'',arms:'',humanAssistance:'',notes:'',protocol:'',conditions:''},jointsEnabled:false,joints:'',transfers:{bedChair:'',sitStand:''},findings:[]};}
const isNumber=v=>typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
export const walkingPerimeterError='Saisir un périmètre entre 0 et 100 m, ou « > 100 m ».';
export function walkingPerimeter(value,{legacy=false}={}){
 if(typeof value!=='string')return null;
 const input=value.trim();
 if(/^>\s*100\s*m?$/i.test(input))return {meters:null,label:'> 100 m',description:'supérieur à 100 mètres'};
 const match=/^(\d+(?:[.,]\d+)?)\s*m?$/i.exec(input);
 const meters=match?Number(match[1].replace(',','.')):legacy&&isNumber(value)?Number(value):NaN;
 if(!Number.isFinite(meters))return null;
 const number=(match?.[1]??value.trim()).replace('.',',');
 return {meters,label:number+' m',description:'évalué à '+number+(meters===1?' mètre':' mètres')};
}
export function effectiveAids(c,test){return (test?.aidsOverride?[...test.aids]:c.walk.possible==='Possible'&&c.walk.aidEnabled?[...c.walk.aids]:[]).sort((a,b)=>assistanceOptions.indexOf(a)-assistanceOptions.indexOf(b));}
export function effectiveTug(c){return c.walk.possible==='Impossible'?{...c.tug,status:'Non réalisable',reason:'Marche impossible',time:''}:c.tug;}
export function decimalSeconds(value){
 const text=value.trim();
 if(!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text))return null;
 const seconds=Number(text.replace(',','.'));
 return Number.isFinite(seconds)&&seconds>0?seconds:null;
}
function testSeconds(test,key){
 if(key==='tug'&&test.details||key==='chair'&&test.humanAssistance!==undefined)return decimalSeconds(test.time);
 return isNumber(test.time)&&Number(test.time)>0?Number(test.time):null;
}
const riskLabels={low:'faible',moderate:'modéré',high:'élevé',veryHigh:'très élevé'};
export function tugRiskLevel(tug){
 if(tug.status==='Non réalisable')return 'unavailable';
 if(tug.status!=='Réalisé')return '';
 const seconds=testSeconds(tug,'tug');
 return seconds===null?'':seconds<12?'low':seconds<20?'moderate':seconds<30?'high':'veryHigh';
}
export function tugRisk(tug){
 const level=tugRiskLevel(tug);
 if(level==='unavailable')return 'Risque non évaluable par le TUG';
 return level?'Risque de chute '+riskLabels[level]:'';
}
export function recordedTugDetails(tug){
 if(!tug.details)return [];
 const details=tugFields.map(([key,label])=>[label,tug.details[key]]);
 details.push(['Observations',tugObservations.filter(value=>tug.details.observations.includes(value)).join(', ')]);
 details.push(['Observations complémentaires',tug.details.notes.trim()]);
 return details.filter(([,value])=>value);
}
export function tinettiRisk(total){
 const level=total<=18?'veryHigh':total<=24?'moderate':'low';
 const descriptions={
  low:'Bon équilibre et bonne qualité de la marche.',
  moderate:'Troubles de l’équilibre ou de la marche.',
  veryHigh:'Troubles importants de l’équilibre ou de la marche.'
 };
 return {level,interpretation:'Risque de chute '+riskLabels[level],description:descriptions[level]};
}
export function compactTinetti(c){
 const test=c.tinetti,status=tinettiStatus(test);
 const groups=Object.fromEntries(tinettiGroups.map(([key])=>{
  const items=pomaItems.filter(([, ,group])=>group===key);
  const blocked=key==='gait'&&c.walk.possible==='Impossible';
  const values=status==='Réalisé'&&!blocked?items.map(([id])=>test.items[id]):[];
  const scores=values.filter((value,i)=>/^[0-2]$/.test(value)&&Number(value)<items[i][3].length);
  const nonEvaluable=values.filter(value=>value==='NE').length;
  const points=scores.length?scores.reduce((sum,value)=>sum+Number(value),0):null;
  return [key,{points,entered:scores.length+nonEvaluable,count:items.length,nonEvaluable,blocked,complete:scores.length===items.length}];
 }));
 const balance=groups.balance.complete?groups.balance.points:null;
 const gait=groups.gait.complete?groups.gait.points:null;
 const total=balance!==null&&gait!==null?balance+gait:null;
 const provisionalTotal=groups.balance.points===null&&groups.gait.points===null?null:(groups.balance.points??0)+(groups.gait.points??0);
 const unavailable=status==='Impossible'||status==='Réalisé'&&Object.values(groups).some(group=>group.blocked||group.nonEvaluable>0);
 const result=total!==null?tinettiRisk(total):{level:unavailable?'unavailable':'',interpretation:unavailable?tinettiNotEvaluable:'',description:''};
 return {balance,gait,total,provisionalTotal,groups,partial:total===null,...result};
}
export function validateCompact(c,complete=false){
 const text=(v,max=10000)=>{if(typeof v!=='string'||v.length>max)throw Error('Champ clinique invalide.');};const choice=(v,values)=>{if(!values.includes(v))throw Error('Choix clinique invalide.');};const bool=v=>{if(typeof v!=='boolean')throw Error('Option clinique invalide.');};
 if(c?.schema!==2||!c.mrc?.cells||!c.walk||!c.tinetti?.items||!c.chair||!c.tug||!c.transfers)throw Error('Format clinique compact invalide.');text(c.reason);text(c.observations);text(c.joints);bool(c.observationsEnabled);bool(c.jointsEnabled);choice(c.mrc.status,['','Réalisable','Non réalisable']);text(c.mrc.reason);text(c.mrc.other);if(c.mrc.reason)choice(c.mrc.reason,reasons);
 for(const [id] of muscleRows)for(const side of ['R','L']){const cell=c.mrc.cells[id+side];if(!cell)throw Error('Cellule MRC absente.');choice(cell.value,['','0','1','2','3','4','5','NE']);choice(cell.reason,['',...reasons]);}
 choice(c.walk.possible,['','Possible','Impossible']);choice(c.walk.wheelchair,['','Oui','Non']);bool(c.walk.aidEnabled);text(c.walk.distance,30);if(c.walk.distance&&!walkingPerimeter(c.walk.distance,{legacy:true}))throw Error(walkingPerimeterError);const aids=a=>{if(!Array.isArray(a)||new Set(a).size!==a.length||a.some(v=>!assistanceOptions.includes(v)))throw Error('Aide de marche invalide.');};aids(c.walk.aids);
 for(const key of ['tug','tinetti','chair']){
  const test=c[key];
  const statuses=key==='chair'?chairStatuses.map(([status])=>status):key==='tinetti'?tinettiStatuses:['Réalisé'];
  choice(test.status,['','Non réalisable',...statuses]);
  text(test.reason);
  if(test.reason)choice(test.reason,[...reasons,'Marche impossible']);
  if(key==='tinetti')continue; // Historical protocol and conditions are optional archival data.
  if(test.protocol!==undefined)choice(test.protocol,['','Standard','Adapté']);
  if(test.conditions!==undefined)text(test.conditions);
  if(key==='tug'){bool(test.aidsOverride);aids(test.aids);}
  else choice(test.arms,['','Oui','Non']);
  text(test.time,30);
  if(test.time&&testSeconds(test,key)===null)throw Error('Temps invalide : une durée mesurée doit être positive.');
 }
 if(Object.hasOwn(c.tug,'details')){
  const t=c.tug,d=t.details;
  if(!d||typeof d!=='object')throw Error('Détails du TUG invalides.');
  for(const [key,,values] of tugFields)choice(d[key],['',...values]);
  if(!Array.isArray(d.observations)||new Set(d.observations).size!==d.observations.length||d.observations.some(value=>!tugObservations.includes(value)))throw Error('Observations du TUG invalides.');
  text(d.notes);
  if(t.status==='Non réalisable'&&t.time)throw Error('Aucun temps ne peut être enregistré pour un TUG impossible.');
 }
 if(Object.hasOwn(c.tinetti,'details')){
  const details=c.tinetti.details;
  if(!details||typeof details!=='object')throw Error('Détails du Tinetti invalides.');
  for(const [key,,values] of tinettiFields)choice(details[key],['',...values]);
  text(details.notes);
 }
 if(Object.hasOwn(c.chair,'humanAssistance')||Object.hasOwn(c.chair,'notes')){
  const t=c.chair;
  choice(t.humanAssistance,['',...chairAssistance]);
  text(t.notes);
  if(t.status!=='Réalisé'&&t.time)throw Error('Un temps de 5xSTS ne peut être enregistré que pour un test réalisé.');
 }
 for(const [id,,,options] of pomaItems)choice(c.tinetti.items[id],['','NE',...options.map((_,i)=>String(i))]);if(Object.keys(c.transfers).some(k=>!['bedChair','sitStand'].includes(k)))throw Error('Transfert non autorisé dans ce format.');for(const key of ['bedChair','sitStand'])choice(c.transfers[key],['','Autonome','Assistance partielle','Assistance totale']);if(!Array.isArray(c.findings)||new Set(c.findings).size!==c.findings.length||c.findings.some(id=>!findingOptions.some(f=>f[0]===id)))throw Error('Constat invalide.');
 if(complete){
  if(!c.reason.trim()||!c.mrc.status||!c.walk.possible)throw Error('Renseigner le motif, la réalisabilité du MRC et la marche.');
  if(c.mrc.status==='Non réalisable'&&!c.mrc.reason)throw Error('Préciser le motif du testing non réalisable.');
  if(c.mrc.status==='Non réalisable'&&c.mrc.reason==='Autre motif'&&!c.mrc.other.trim())throw Error('Préciser le motif du testing.');
  if(c.walk.possible==='Possible'&&c.walk.aidEnabled&&!c.walk.aids.length)throw Error('Choisir les aides utilisées ou décocher Aide à la marche.');
  const tug=effectiveTug(c),chair=c.chair;
  if(![tug,c.tinetti,chair].every(test=>test.status))throw Error('Préciser la réalisation des tests fonctionnels.');
  if(tug.status==='Non réalisable'&&!tug.reason&&!tug.details||
     chair.status==='Non réalisable'&&!chair.reason&&chair.humanAssistance===undefined)throw Error('Préciser le motif du test non réalisable.');
  if(tug.status==='Réalisé'&&testSeconds(tug,'tug')===null||
     chair.status==='Réalisé'&&testSeconds(chair,'chair')===null&&chair.humanAssistance!=='Aide physique')throw Error('Temps du test réalisé requis.');
  if(chair.status==='Réalisé'&&chair.humanAssistance===undefined&&!chair.arms)throw Error('Préciser l’utilisation des bras.');
  if(c.tinetti.status==='Réalisé'&&!pomaItems.some(([id,,group])=>(group!=='gait'||c.walk.possible!=='Impossible')&&c.tinetti.items[id]!=='')){
   throw Error('Renseigner un item du Tinetti ou indiquer que le test est impossible ou non réalisé.');
  }
 }
 return c;
}
const transferLabels={bedChair:'lit-fauteuil',sitStand:'assis-debout'};
const gaitObservations=[
 ['start','hésitation au départ'],['lengthR','pas droit raccourci'],['lengthL','pas gauche raccourci'],
 ['symmetry','asymétrie des pas'],['continuity','discontinuité des pas']
];
function jointEvidence(c){
 const note=c.jointsEnabled?c.joints.trim():'';
 const normal=/(?:^|[.!;]\s*)(?:(?:bilan articulaire|examen articulaire)(?:\s*:\s*|\s+)(?:normal|sans particularité)|amplitudes (?:articulaires )?normales|mobilité articulaire normale|aucune limitation articulaire|pas de limitation articulaire)(?=$|[.!;])/i.test(note);
 // Only explicit, affirmative mobility observations can drive an exercise proposal.
 const limits=note.split(/[.!;\n]/).map(part=>part.trim()).filter(part=>
  /(?:\blimi(?:tation|t[éeé])|\braideur)/i.test(part)&&
  !/(?:\bpas\b|\baucun|absence|sans restriction|sans limitation|\bnon\b|à vérifier|suspect|suspicion|possible|exclu|\?)/i.test(part)
 );
 return {note,limits,reported:c.findings.includes('joints'),conflict:normal&&(limits.length>0||c.findings.includes('joints'))};
}
function observedGait(c,tug){
 const sources=[c.observationsEnabled?c.observations:'',tug.details?.notes??''];
 const observations=tugObservations.filter(sign=>sources.some(note=>
  note.split(/[.!;\n]/).some(part=>!/(?:\bpas de\b|\baucun|absence|\bsans\b|\bnon\b|à vérifier|suspect|suspicion|possible|recherche de|antécédent|risque de|\?)/i.test(part)&&
   part.toLocaleLowerCase('fr-FR').includes(sign.toLocaleLowerCase('fr-FR')))
 ));
 return [...new Set([...(tug.details?.observations??[]),...observations])];
}
function clinicalEvidence(c){
 const has=id=>c.findings.includes(id);
 const scores=compactTinetti(c),tug=effectiveTug(c),chair=chairResult(c.chair);
 const pomaRisk=scores.total===null?'':scores.level;
 const tugLevel=tug.status==='Réalisé'&&tug.details?.humanAssistance!=='Aide physique'?tugRiskLevel(tug):'';
 const riskBand=level=>level==='veryHigh'?'high':level;
 const riskConflict=Boolean(pomaRisk&&tugLevel&&riskBand(pomaRisk)!==riskBand(tugLevel));
 const tugSigns=observedGait(c,tug);
 const gait=new Set(tugSigns.filter(sign=>sign!=='Instabilité').map(sign=>sign.toLocaleLowerCase('fr-FR')));
 if(c.tinetti.status==='Réalisé'&&c.walk.possible!=='Impossible'){
  for(const [id,label] of gaitObservations)if(c.tinetti.items[id]==='0')gait.add(label);
 }
 if(gait.has('petits pas')){
  gait.delete('pas droit raccourci');
  gait.delete('pas gauche raccourci');
 }
 if(gait.has('hésitation au départ'))gait.delete('hésitation');
 const walkConflict=c.walk.possible==='Impossible'&&(c.tug.status==='Réalisé'||has('walking')||gait.size>0||
  c.tinetti.status==='Réalisé'&&pomaItems.some(([id,,group])=>group==='gait'&&/^[0-2]$/.test(c.tinetti.items[id])));
 const balance=has('balance')||!walkConflict&&tugSigns.includes('Instabilité')||
  c.tinetti.status==='Réalisé'&&['immediate','standing','eyes','turnSteady'].some(id=>c.tinetti.items[id]==='0');
 const weak=[];
 if(c.mrc.status==='Réalisable'){
  for(const [id,label] of muscleRows){
   const sides=[['R','droite'],['L','gauche']].filter(([side])=>/^[0-4]$/.test(c.mrc.cells[id+side].value));
   if(sides.length)weak.push(label.toLocaleLowerCase('fr-FR')+' ('+sides.map(([side,name])=>name+' '+c.mrc.cells[id+side].value+'/5').join(', ')+')');
  }
 }
 const transfers=Object.entries(c.transfers).filter(([,value])=>value);
 const assisted=transfers.filter(([,value])=>value.startsWith('Assistance')).map(([id])=>transferLabels[id]);
 const transferConflict=has('transfer')&&transfers.length>0&&assisted.length===0;
 return {has,scores,tug,chair,pomaRisk,tugLevel,riskConflict,walkConflict,gait:[...gait],balance,weak,transfers,assisted,transferConflict,joints:jointEvidence(c)};
}
function testNotes(c){
 return [
  ['Observations du Tinetti',c.tinetti.details?.notes],
  ['Observations du TUG',c.tug.details?.notes],
  ['Observations du 5xSTS',c.chair.notes]
 ].filter(([,note])=>note?.trim());
}
const riskDisagreement='Les repères du Tinetti et du TUG diffèrent. Les rapprocher des conditions de passation et des autres observations avant de retenir un niveau de risque.';
const walkDisagreement='La marche est notée impossible alors que le bilan contient des observations de marche ou un résultat de test ambulatoire. Vérifier le contexte et la cohérence des saisies.';
const transferDisagreement='Les transferts renseignés sont autonomes et un constat de difficulté est coché. Préciser le transfert et la difficulté observée avant de fixer un objectif.';
const jointDisagreement='Le bilan articulaire est décrit comme normal et une limitation est signalée. Vérifier les données avant de cibler une articulation.';
const vigilance=' Une vigilance adaptée est recommandée lors des déplacements.';
const tugDiagnostic={
 low:'Cette performance traduit une mobilité fonctionnelle relativement préservée selon les repères retenus.',
 moderate:'Cette performance suggère une mobilité fonctionnelle légèrement ralentie selon les repères retenus.',
 high:'Le temps réalisé traduit un ralentissement important de la mobilité fonctionnelle, nécessitant une attention particulière lors des déplacements.',
 veryHigh:'La réalisation du test est fortement ralentie, suggérant des limitations importantes de mobilité fonctionnelle.'
};
const chairDiagnostic={
 satisfactory:' lors des passages assis-debout répétés.',
 slow:' lors des passages assis-debout répétés, pouvant traduire une diminution des capacités fonctionnelles des membres inférieurs.',
 verySlow:' lors des passages assis-debout répétés, suggérant une limitation fonctionnelle des membres inférieurs.'
};
function tinettiDiagnostic(scores){
 const {level,total,balance,gait,interpretation}=scores;
 const opening='Tinetti : '+total+'/28 — '+interpretation+'. ';
 if(level==='low')return opening+'Les performances aux épreuves d’équilibre et de marche sont globalement satisfaisantes.';
 const balanceAffected=balance<16,gaitAffected=gait<12;
 const area=balanceAffected&&gaitAffected?'d’équilibre et/ou de marche':balanceAffected?'d’équilibre':'de marche';
 const detail=' Équilibre : '+balance+'/16. Marche : '+gait+'/12.';
 if(level==='moderate')return opening+'Ce résultat suggère certaines difficultés '+area+', nécessitant une vigilance adaptée.'+detail;
 return opening+'Ce résultat traduit des difficultés importantes dans les épreuves '+area+
  ', justifiant une attention particulière à la sécurisation des déplacements et à la prévention des chutes.'+detail;
}
export function compactDiagnosis(c){
 validateCompact(c);
 const e=clinicalEvidence(c),lines=[];
 if(c.reason.trim())lines.push('Motif de prise en charge : '+c.reason);
 if(c.observationsEnabled&&c.observations.trim())lines.push('Observations complémentaires de l’anamnèse : '+c.observations);
 if(e.walkConflict)lines.push(walkDisagreement);
 else if(c.walk.possible==='Impossible')lines.push('La marche n’est pas réalisable lors de cette évaluation.');
 if(c.walk.possible==='Possible'){
  const aids=effectiveAids(c),perimeter=walkingPerimeter(c.walk.distance,{legacy:true});
  lines.push(aids.length?'Marche possible avec '+aids.join(', ')+'.':'Marche possible.');
  if(perimeter)lines.push('Périmètre de marche '+perimeter.description+'.');
 }
 if(c.walk.wheelchair==='Oui')lines.push('Utilisation habituelle d’un fauteuil roulant.');

 if(e.scores.total!==null)lines.push(tinettiDiagnostic(e.scores));
 else if(c.tinetti.status==='Réalisé')lines.push('Tinetti : évaluation incomplète.');
 const tugLevel=e.tug.status==='Réalisé'?tugRiskLevel(e.tug):'';
 if(e.tug.status==='Réalisé'&&testSeconds(e.tug,'tug')!==null){
  const time='TUG : '+e.tug.time+' secondes';
  if(tugLevel){
   const caution=e.tug.details?.humanAssistance==='Aide physique'?' '+tugPhysicalAssistance:
    !e.tug.details&&e.tug.protocol==='Adapté'?' '+tugLegacyAdaptation:'';
   lines.push(time+' — '+tugRisk(e.tug)+'. '+tugDiagnostic[tugLevel]+(tugLevel==='moderate'&&e.pomaRisk!=='moderate'?vigilance:'')+caution);
  }else lines.push(time+'. Temps descriptif.');
 }
 if(e.scores.total!==null||tugLevel)lines.push('Ces niveaux de risque sont des repères indicatifs à confronter à l’évaluation clinique globale.');
 if(e.riskConflict)lines.push(riskDisagreement);
 if(!e.walkConflict&&(e.gait.length||e.has('walking')||e.balance)){
  const signs=[...(e.balance?['instabilité ou trouble de l’équilibre documenté']:[]),...e.gait];
  if(!e.gait.length&&e.has('walking'))signs.push('difficulté à la marche signalée');
  lines.push('Observations d’équilibre et de marche : '+signs.join(', ')+'.');
 }

 if(chairStatus(c.chair)==='Impossible')lines.push('5xSTS : test non évaluable.');
 if(c.chair.status==='Réalisé'){
  const time=testSeconds(c.chair,'chair')===null?'':c.chair.time+' secondes';
  const result=e.chair.level?e.chair.messages[0]+chairDiagnostic[e.chair.level]:e.chair.messages.join('. ');
  if(time||result)lines.push('5xSTS : '+[time,result].filter(Boolean).join(' — '));
 }
 if(e.transfers.length)lines.push('Transferts : '+e.transfers.map(([id,value])=>transferLabels[id]+' ('+value.toLowerCase()+')').join(', ')+'.');
 if(e.transferConflict)lines.push(transferDisagreement);
 else if(e.has('transfer')&&!e.assisted.length)lines.push('Difficulté de transfert signalée par l’évaluateur.');
 if(e.joints.note)lines.push('Bilan articulaire : '+e.joints.note);
 if(e.joints.conflict)lines.push(jointDisagreement);
 else if(e.joints.reported&&!e.joints.limits.length)lines.push('Limitation articulaire signalée par l’évaluateur.');
 if(e.weak.length)lines.push('Le testing met en évidence un déficit de force : '+e.weak.join(', ')+'.');
 else if(e.has('strength'))lines.push('Déficit de force signalé par l’évaluateur.');
 if(c.mrc.status==='Réalisable'&&Object.values(c.mrc.cells).some(cell=>cell.value==='NE'))lines.push('Certains mouvements ne sont pas interprétables au testing.');
 if(c.mrc.status==='Non réalisable')lines.push('Testing musculaire non réalisable : '+c.mrc.reason+(c.mrc.other&&c.mrc.reason==='Autre motif'?' — '+c.mrc.other:'')+'.');
 if(e.has('instructions'))lines.push('Des difficultés de compréhension ou d’exécution des consignes sont observées, sans conclusion diagnostique médicale ou neuropsychologique.');
 const otherFindings=findingOptions.filter(([id])=>['distance','conditioning','pain','autonomy'].includes(id)&&e.has(id));
 if(otherFindings.length)lines.push('Autres constats : '+otherFindings.map(([,label])=>label.toLocaleLowerCase('fr-FR')).join(', ')+'.');
 for(const [label,note] of testNotes(c))lines.push(label+' : '+note.trim());
 return lines.join('\n\n')||'Les données disponibles ne permettent pas encore de proposer une synthèse fonctionnelle.';
}
export function compactProject(c){
 validateCompact(c);
 const e=clinicalEvidence(c),actions=[];
 const notes=[c.reason,c.observationsEnabled?c.observations:'',e.joints.note,...testNotes(c).map(([,note])=>note)].join(' ');
 if(/contre[- ]?indiqu|contre[- ]?indication|interdit|sans appui|appui proscrit|ne pas mobiliser/i.test(notes))return 'Une précaution ou restriction explicite est mentionnée dans les textes actifs. Aucune intervention n’est proposée automatiquement. Définir les moyens compatibles après vérification clinique.';
 if(e.riskConflict)actions.push(riskDisagreement);
 if(e.walkConflict)actions.push(walkDisagreement);
 if(e.transferConflict)actions.push(transferDisagreement);
 if(e.joints.conflict)actions.push(jointDisagreement);
 const highRisk=[e.pomaRisk,e.tugLevel].some(risk=>risk==='high'||risk==='veryHigh');
 if(highRisk&&!e.riskConflict&&!e.walkConflict)actions.push('Rééducation de l’équilibre et sécurisation des déplacements dans une démarche de prévention des chutes, selon le risque élevé documenté.');
 else if(e.balance)actions.push('Travail de l’équilibre statique et dynamique, avec progression adaptée aux capacités du résident et à l’instabilité observée.');
 if(c.walk.possible!=='Impossible'&&(e.gait.length||e.has('walking'))){
  const target=e.gait.length?' Difficultés à cibler : '+e.gait.join(', ')+'.':'';
  actions.push('Rééducation de la marche ciblant la stabilité, la qualité des pas et les changements de direction selon les difficultés observées.'+target);
 }
 if(c.walk.possible==='Possible'&&e.has('distance'))actions.push('Entretenir le périmètre de marche en progressant à partir de la distance tolérée.');
 if(c.walk.possible==='Impossible'&&!e.walkConflict)actions.push('La marche n’est pas réalisable lors de cette évaluation. Réévaluer avant de proposer un travail de marche.');
 if(e.assisted.length)actions.push('Entraînement fonctionnel pour améliorer l’autonomie et la sécurité des transferts nécessitant une assistance : '+e.assisted.join(', ')+'.');
 else if(e.has('transfer')&&!e.transferConflict)actions.push('Entraînement fonctionnel des transferts visant à améliorer l’autonomie et la sécurité, après repérage du transfert en difficulté.');
 if(e.chair.level==='slow'||e.chair.level==='verySlow')actions.push('Renforcement fonctionnel des membres inférieurs par des exercices de lever de chaise adaptés, en réponse au ralentissement au 5xSTS.');
 if(!e.joints.conflict){
  if(e.joints.limits.length)actions.push('Travail de mobilité articulaire ciblé sur les limitations documentées : '+e.joints.limits.join(', ')+'.');
  else if(e.joints.reported)actions.push('Préciser les articulations limitées pour cibler le travail de mobilité articulaire.');
 }
 if(e.weak.length)actions.push('Renforcement progressif ciblé sur les mouvements déficitaires au testing : '+e.weak.join(', ')+'.');
 else if(e.has('strength'))actions.push('Préciser les mouvements déficitaires pour cibler le renforcement.');
 if(e.has('conditioning'))actions.push('Travailler l’endurance fonctionnelle selon la tolérance à l’effort en réponse au déconditionnement observé.');
 if(e.has('pain'))actions.push('Adapter les activités au retentissement douloureux observé et contrôler leur tolérance.');
 if(e.has('autonomy'))actions.push('Repérer les activités touchées par la perte d’autonomie pour déterminer les objectifs fonctionnels.');
 if(e.has('instructions')||c.mrc.status==='Non réalisable'&&c.mrc.reason===reasons[0]||
    c.mrc.status==='Réalisable'&&Object.values(c.mrc.cells).some(cell=>cell.value==='NE'&&cell.reason===reasons[0]))actions.push('Adapter les consignes, leur présentation et le guidage aux difficultés observées.');
 return actions.join('\n\n')||'Aucun objectif ciblé ne ressort des éléments documentés. Compléter les observations utiles avant de proposer des exercices.';
}
export function reviewLabel(record){if(record.clinical?.schema!==2)return record.reviewDate||'Non renseignée';return record.reviewWindow==='clinical'?'Selon l’évolution clinique, réévaluation anticipée si nécessaire':`Dans ${record.reviewWindow==='6m'?'6':'3'} mois, ou plus tôt selon l’évolution clinique`;}
export function compactMeasurements(c){const rows=[];const add=(id,label,value,number=null,conditions='')=>rows.push({id,label,value,number,conditions});if(c.mrc.status==='Réalisable')for(const [id,label] of muscleRows)for(const side of ['R','L']){const x=c.mrc.cells[id+side];if(x.value)add(id+side,label+' '+(side==='R'?'droite':'gauche'),x.value==='NE'?'NE':x.value+'/5',/^[0-5]$/.test(x.value)?Number(x.value):null);}const perimeter=walkingPerimeter(c.walk.distance,{legacy:true});if(c.walk.possible==='Possible'&&perimeter)add('distance','Périmètre de marche',perimeter.label,perimeter.meters,effectiveAids(c).join('|'));for(const [key,id,label] of [['tug','tug','Timed Up and Go'],['chair','fiveChair','Cinq levers de chaise']]){const t=key==='tug'?effectiveTug(c):c.chair;const seconds=testSeconds(t,key);if(t.status==='Réalisé'&&seconds!==null){const conditions=key==='tug'&&t.details?['tug',...tugFields.map(([field])=>t.details[field])]:key==='chair'&&t.humanAssistance!==undefined?['chair',t.arms,t.humanAssistance]:[t.protocol,t.conditions,key==='tug'?effectiveAids(c,t):t.arms];add(id,label,t.time+' s',seconds,JSON.stringify(conditions));}else if(t.status)add(id,label,key==='chair'?chairResult(t).messages[0]||chairStatus(t):t.reason?'Non réalisable : '+t.reason:'Non réalisable');}const p=compactTinetti(c);if(c.tinetti.status==='Réalisé')add('tinetti','Tinetti',p.total!==null?p.total+'/28':'Partiel',p.total,JSON.stringify(c.tinetti.details?['tinetti',...tinettiFields.map(([key])=>c.tinetti.details[key]),c.tinetti.protocol,c.tinetti.conditions]:[c.tinetti.protocol,c.tinetti.conditions,effectiveAids(c,c.tinetti)]));for(const [key,label,id] of [['bedChair','Lit-fauteuil','transfer'],['sitStand','Assis-debout','stand']])if(c.transfers[key])add(id,label,c.transfers[key]);return rows;}
