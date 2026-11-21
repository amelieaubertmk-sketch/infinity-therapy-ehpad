import {walkingFields,anamnesisFields,jointFields,testDefinitions,testResult,tinettiScores,comparison,balanceItems,gaitItems} from '../src/assessments-domain.js';
import {muscleRows,findingOptions,effectiveAids,effectiveTug,compactTinetti,tinettiStatus,tinettiGroups,tinettiFields,tinettiRisk,tinettiContext,tinettiIncomplete,tinettiNotEvaluable,tinettiAssistanceWarning,reviewLabel,
 recordedTugDetails,tugRisk,tugContext,tugVigilance,tugPhysicalAssistance,tugLegacyAdaptation,chairStatus,chairResult,chairArms} from '../src/assessments-compact.js';
import {pdfFonts,measuredWidth} from './pdf-font.js';

const pageWidth=595.28,pageHeight=841.89,margin=46,width=pageWidth-2*margin,top=745,bottom=51;
const leading=14,bodySize=10.4;
const dateFR=value=>new Date(value+'T12:00:00Z').toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'});
const stamp=value=>new Date(value).toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
const normalize=value=>String(value??'').replace(/\s+/g,' ').trim();

function wrap(value,max,size,bold=false){
 const lines=[];
 for(const paragraph of value.split('\n')){
  let line='';
  for(let word of paragraph.trim().split(/\s+/)){
   const combined=line?line+' '+word:word;
   if(measuredWidth(combined,size,bold)<=max){line=combined;continue;}
   if(line){lines.push(line);line='';}
   while(measuredWidth(word,size,bold)>max){
    let cut=0,total=0;
    for(const char of word){
     total+=measuredWidth(char,size,bold);
     if(total>max)break;
     cut+=char.length;
    }
    lines.push(word.slice(0,cut));
    word=word.slice(cut);
   }
   line=word;
  }
  if(line)lines.push(line);
 }
 return lines;
}

function anonymizer(record,previous){
 const tokens=[record,previous,record.privacyResident].filter(Boolean)
  .flatMap(item=>[item.id,item.residentId,item.residentCode,item.code,item.residentSector,item.sector,item.name,item.firstName,item.lastName,item.initials])
  .filter(value=>typeof value==='string'&&value.trim()).sort((a,b)=>b.length-a.length);
 const c=record.clinical;
 const hidden=c.schema===2?[!c.observationsEnabled&&c.observations,!c.jointsEnabled&&c.joints].filter(Boolean):[];
 const word=char=>char&&/[\p{L}\p{N}]/u.test(char);
 return value=>{
  let text=String(value??'');
  for(const omit of hidden)text=text.split(omit).join('');
  for(const token of tokens){
   let offset=0;
   while(offset<text.length){
    const found=text.toLocaleLowerCase('fr-FR').indexOf(token.toLocaleLowerCase('fr-FR'),offset);
    if(found<0)break;
    if(!word(text[found-1])&&!word(text[found+token.length])){
     const marker='[information retirée]';
     text=text.slice(0,found)+marker+text.slice(found+token.length);
     offset=found+marker.length;
    }else offset=found+token.length;
   }
  }
  return text;
 };
}

function documentLayout(record,clean){
 const {encode,build}=pdfFonts(),pages=[];
 let commands,y;
 const textCommands=(value,x,at,size,bold=false)=>encode(value,bold).map(({index,hex,width:advance})=>{
  const command=`BT /F${index} ${size} Tf ${x.toFixed(2)} ${at.toFixed(2)} Td <${hex}> Tj ET`;
  x+=advance*size/1000;
  return command;
 }).join('\n');
 const text=(value,x,at,size=bodySize,bold=false)=>commands.push(bold?'0 g':'0.12 g',textCommands(value,x,at,size,bold));
 const rule=(at,grey='0.82')=>commands.push(`${grey} G 0.5 w ${margin} ${at} m ${pageWidth-margin} ${at} l S`);
 const page=()=>{
  commands=[];
  pages.push(commands);
  y=top;
  text('BILAN DIAGNOSTIQUE KINÉSITHÉRAPIQUE',margin,800,18,true);
  text(clean(`Date : ${dateFR(record.date)}   ·   Examinateur : ${record.practitioner}   ·   ${record.type==='initial'?'Bilan initial':'Réévaluation'}`),margin,778);
  rule(765);
 };
 const available=()=>y-bottom;
 const ensure=height=>{if(available()<height)page();};
 function paragraph(value,{bullet=false,justify=false}={}){
  const indent=bullet?13:0,lineWidth=width-indent;
  const groups=clean(value).trim().split(/\n\s*\n/).map(block=>wrap(block,lineWidth,bodySize)).filter(lines=>lines.length);
  if(!groups.length)return null;
  return {
   min:Math.min(2,groups[0].length)*leading+4,
   height:groups.reduce((total,lines)=>total+lines.length*leading+4,0),
   draw(){
    for(const lines of groups){
     for(let i=0;i<lines.length;i++){
      const remaining=lines.length-i;
      ensure((remaining===2||i===0&&remaining>1?2:1)*leading);
      if(bullet&&i===0)text('•',margin,y-10);
      const words=lines[i].split(' '),extra=words.length>1?(lineWidth-measuredWidth(lines[i],bodySize))/(words.length-1):0;
      if(justify&&i<lines.length-1&&extra>0&&extra<=2.5){
       let x=margin+indent;
       for(const word of words){
        text(word,x,y-10);
        x+=measuredWidth(word+' ',bodySize)+extra;
       }
      }else text(lines[i],margin+indent,y-10);
      y-=leading;
     }
     y-=4;
    }
   }
  };
 }
 function table(headers,rows,ratios=[0.34,0.66],showHeader=true){
  const cellSize=9.7,cellLeading=12.5,headerHeight=19,rowPadding=5,after=6;
  const widths=ratios.map(ratio=>width*ratio);
  const positions=widths.map((_,i)=>margin+widths.slice(0,i).reduce((total,v)=>total+v,0)+9);
  const cells=rows.filter(row=>row.slice(1).some(value=>clean(value).trim())).map(row=>
   row.map((value,i)=>wrap(clean(value),widths[i]-18,cellSize,i===0))
  );
  if(!cells.length)return null;
  const heights=cells.map(row=>Math.max(...row.map(col=>col.length)));
  const initialHeader=showHeader?headerHeight:0;
  const total=initialHeader+heights.reduce((sum,count)=>sum+rowPadding+count*cellLeading,0)+after;
  const min=total<=165?total:initialHeader+rowPadding+Math.min(2,heights[0])*cellLeading;
  const header=(repeat=false)=>{
   if(!showHeader&&!repeat){rule(y);return;}
   commands.push(`0.95 g ${margin} ${y-headerHeight} ${width} ${headerHeight} re f`);
   headers.forEach((label,i)=>text(label,positions[i],y-13,cellSize,true));
   y-=headerHeight;
   rule(y);
  };
  return {min,draw(){
   ensure(min);
   header();
   for(let r=0;r<cells.length;r++){
    let offset=0;
    while(offset<heights[r]){
     const remaining=heights[r]-offset;
     const fullHeight=remaining*cellLeading+rowPadding;
     const keepRow=offset===0&&r>0&&fullHeight<=110;
     if(available()<rowPadding+Math.min(2,remaining)*cellLeading||keepRow&&available()<fullHeight){
      page();
      header(true);
     }
     const count=Math.min(remaining,Math.floor((available()-rowPadding)/cellLeading));
     for(let i=0;i<count;i++){
      for(let col=0;col<positions.length;col++){
       const value=cells[r][col][offset+i]||(col===0&&offset>0&&i===0?'(suite)':'');
       if(value)text(value,positions[col],y-12-i*cellLeading,cellSize,col===0);
      }
     }
     y-=count*cellLeading+rowPadding;
     rule(y,'0.86');
     offset+=count;
    }
   }
   y-=after;
  }};
 }
 function section(title,blocks,major=false,keepTogether=false){
  const items=blocks.filter(Boolean);
  if(!items.length)return null;
  const spacing=major?29:20;
  const groupHeight=keepTogether?items.reduce((total,item)=>total+item.height,0):Infinity;
  const min=spacing+(groupHeight<=160?groupHeight:items[0].min);
  return {min,draw(){
   ensure(min);
   if(major)rule(y-4);
   text(title,margin,y-(major?22:14),major?13:11,true);
   y-=spacing;
   for(const item of items)item.draw();
  }};
 }
 function finish(){
  pages.forEach((content,i)=>{
   const label=`Page ${i+1} / ${pages.length}`;
   content.push('0.24 g',textCommands(label,(pageWidth-measuredWidth(label,9))/2,27,9));
  });
  return serializePDF(pages,build);
 }
 page();
 return {paragraph,section,table,finish};
}

function compactSections(c,{section,paragraph,table}){
 const subsection=(title,rows,column='Élément',showHeader=false)=>section(title,[table([column,'Résultat'],rows,undefined,showHeader)]);
 const history=note=>paragraph(note,{justify:true});
 const context=section('01 — Anamnèse et contexte clinique',[
  c.reason.trim()&&history('Motif : '+c.reason),c.observationsEnabled&&history(c.observations)
 ],true);
 const mrc=[];
 if(c.mrc.status==='Non réalisable'){
  const extra=c.mrc.reason==='Autre motif'&&c.mrc.other?' : '+c.mrc.other:'';
  mrc.push(paragraph('Testing musculaire non réalisable'+(c.mrc.reason?' — '+c.mrc.reason+extra:'')));
 }else if(c.mrc.status==='Réalisable'){
  for(const [group,label] of [['upper','Membres supérieurs'],['lower','Membres inférieurs']]){
   const side=cell=>cell.value==='NE'?'NE'+(cell.reason?' ('+cell.reason+')':''):cell.value?cell.value+'/5':'';
   const measures=muscleRows.filter(([, ,area])=>area===group)
    .map(([id,movement])=>[movement,side(c.mrc.cells[id+'R']),side(c.mrc.cells[id+'L'])]);
   mrc.push(table([label,'Droite','Gauche'],measures,[0.44,0.28,0.28]));
  }
  if(mrc.some(Boolean)&&Object.values(c.mrc.cells).some(cell=>cell.value==='NE'))mrc.push(paragraph('NE : non évaluable.'));
  if(!mrc.some(Boolean))mrc.push(paragraph('Testing indiqué comme réalisable.'));
 }
 const walk=[
  ['Possibilité de marche',c.walk.possible],
  ['Aide utilisée',c.walk.possible==='Possible'?effectiveAids(c).join(', '):''],
  ['Périmètre',c.walk.possible==='Possible'&&c.walk.distance!==''?c.walk.distance+' m':''],
  ['Fauteuil roulant habituel',c.walk.wheelchair]
 ];
 const tinetti=[],test=c.tinetti,status=tinettiStatus(test),scores=compactTinetti(c);
 if(status==='Impossible')tinetti.push(['Résultat',test.reason?'Impossible — '+test.reason:'Impossible']);
 if(status==='Non réalisé')tinetti.push(['Résultat',status]);
 if(status==='Réalisé'){
  for(const [key,label,max] of tinettiGroups){
   const points=scores.groups[key].points;
   if(points!==null)tinetti.push([scores.groups[key].complete?label:label+' (provisoire)',points+'/'+max]);
  }
  if(scores.provisionalTotal!==null)tinetti.push([scores.partial?'Total provisoire':'Total',scores.provisionalTotal+'/28']);
  if(scores.partial)tinetti.push(['Évaluation',tinettiIncomplete]);
 }
 if(scores.interpretation)tinetti.push(['Interprétation',scores.interpretation]);
 if(scores.description)tinetti.push(['Description clinique',scores.description+'\n'+tinettiContext]);
 for(const [key,label] of tinettiFields)tinetti.push([label,test.details?.[key]]);
 if(test.details?.humanAssistance==='Aide physique')tinetti.push(['Précaution',tinettiAssistanceWarning]);
 if(!test.details&&status==='Réalisé'&&test.aidsOverride)tinetti.push(['Aides utilisées',effectiveAids(c,test).join(', ')]);
 tinetti.push(['Observations complémentaires',test.details?.notes]);
 const tug=effectiveTug(c),tugRows=[];
 if(tug.status==='Réalisé'){
  if(tug.time)tugRows.push(['Temps',tug.time+' secondes']);
  if(tugRisk(tug))tugRows.push(['Interprétation',tugRisk(tug)+'. '+tugContext+' '+tugVigilance]);
  if(!tug.details){
   tugRows.push(['Aides utilisées',effectiveAids(c,tug).join(', ')]);
   if(tug.protocol==='Adapté')tugRows.push(['Précaution',tugLegacyAdaptation]);
  }
  if(tug.details?.humanAssistance==='Aide physique')tugRows.push(['Précaution',tugPhysicalAssistance]);
 }else if(tug.status==='Non réalisable'){
  tugRows.push(['Résultat',tug.reason?'Non réalisable — '+tug.reason:'Test impossible']);
  tugRows.push(['Interprétation',tugRisk(tug)]);
 }
 if(tug.status)tugRows.push(...recordedTugDetails(tug));

 const chair=c.chair,sts=chairStatus(chair),chairRows=[];
 if(sts==='Réalisé'){
  chairRows.push(['Temps',chair.time?chair.time+' secondes':'']);
  chairRows.push(['Utilisation des bras',chairArms.find(([value])=>value===chair.arms)?.[1]]);
  chairRows.push(['Assistance humaine',chair.humanAssistance]);
 }else if(sts==='Non réalisé')chairRows.push(['Résultat',sts]);
 if(sts==='Impossible'&&chair.reason)chairRows.push(['Motif',chair.reason]);
 if(sts){
  chairRows.push(['Interprétation',chairResult(chair).messages.join('. ')]);
  chairRows.push(['Observations complémentaires',chair.notes]);
 }

 const exam=section('02 — Examen clinique et fonctionnel',[
  section('2.1 — Testing musculaire',mrc),
  subsection('2.2 — Marche',walk),
  subsection('2.3 — Tinetti POMA 28',tinetti,'Mesure',c.tinetti.status==='Réalisé'),
  subsection('2.4 — Timed Up and Go (TUG)',tugRows,'TUG · Mesure ou observation'),
  subsection('2.5 — Five Times Sit-to-Stand (5xSTS)',chairRows),
  c.jointsEnabled&&section('2.6 — Bilan articulaire',[history(c.joints)]),
  subsection('2.7 — Transferts',[['Lit-fauteuil',c.transfers.bedChair],['Assis-debout',c.transfers.sitStand]]),
  section('2.8 — Constats retenus par l’évaluateur',findingOptions.filter(([id])=>c.findings.includes(id)).map(([,label])=>paragraph(label,{bullet:true})),false,true)
 ],true);
 return [context,exam];
}

function historicalSections(c,{section,paragraph,table}){
 const history=section('01 — Anamnèse et contexte clinique',anamnesisFields.map(([id,label])=>
  c.anamnesis[id].trim()&&paragraph(label+' : '+c.anamnesis[id],{justify:true})
 ),true);
 const walkTest=testDefinitions.find(def=>def.id==='walk');
 const walking=section('2.1 — Marche',[table(['Élément','Résultat'],[
  ...walkingFields.map(([id,label])=>[label,c.walking[id]]),
  ['Évaluation fonctionnelle',c.tests.walk.status==='Réalisé'?testResult(walkTest,c.tests.walk):''],
  ['Observations',c.tests.walk.conditions]
 ])]);
 const groups=[
  ['Testing musculaire',testDefinitions.filter(def=>def.label.startsWith('MRC'))],
  ['Tinetti POMA 28',testDefinitions.filter(def=>def.id==='tinetti')],
  ['Timed Up and Go (TUG)',testDefinitions.filter(def=>def.id==='tug')],
  ['Five Times Sit-to-Stand (5xSTS)',testDefinitions.filter(def=>def.id==='fiveChair')],
  ['Autres observations fonctionnelles',testDefinitions.filter(def=>!def.label.startsWith('MRC')&&!['walk','tinetti','tug','fiveChair'].includes(def.id))]
 ];
 const tests=groups.map(([label,definitions])=>section(label,[table(['Élément','Résultat'],definitions.filter(def=>c.tests[def.id].status==='Réalisé'||['tug','tinetti'].includes(def.id)&&['Non réalisable','Contre-indiqué'].includes(c.tests[def.id].status)).flatMap(def=>{
  const result=c.tests[def.id];
  const includeConditions=!['tinetti','tug','fiveChair'].includes(def.id);
  const details=includeConditions&&result.conditions?' — '+result.conditions:'';
  if(def.id==='tinetti'){
   if(result.status!=='Réalisé')return [['Résultat',testResult(def,result)],['Interprétation',tinettiNotEvaluable]];
   const {balance,gait,total}=tinettiScores(result),risk=tinettiRisk(total);
   const rows=[['Équilibre',balance+'/16'],['Marche',gait+'/12'],['Total',total+'/28'],
    ['Interprétation',risk.interpretation],['Description clinique',risk.description],['Repère clinique',tinettiContext]];
   for(const [id,item,max] of [...balanceItems,...gaitItems])rows.push([item,result.items[id]+'/'+max]);
   return rows;
  }
  if(def.id==='tug'){
   if(result.status!=='Réalisé')return [['Résultat',testResult(def,result)],['Interprétation',tugRisk({status:'Non réalisable'})]];
   const risk=tugRisk({status:result.status,time:result.value});
   return [['Temps',result.value+' secondes'],['Interprétation',risk?risk+'. '+tugContext:'']];
  }
  return [[def.label,testResult(def,result)+details]];
 }),undefined,false)]));
 const unperformed=new Map();
 for(const def of testDefinitions){
  const test=c.tests[def.id];
  if(test.status==='Réalisé'||['tug','tinetti'].includes(def.id)&&['Non réalisable','Contre-indiqué'].includes(test.status))continue;
  const result=testResult(def,test);
  const details=!['tinetti','tug','fiveChair'].includes(def.id)&&test.conditions?' — '+test.conditions:'';
  const label=result+details;
  if(!unperformed.has(label))unperformed.set(label,[]);
  unperformed.get(label).push(def.label);
 }
 const unperformedTests=section('Tests non réalisés ou non évaluables',[
  table(['Statut et motif','Tests'],[...unperformed].map(([label,tests])=>[label,tests.join(' · ')]),undefined,false)
 ]);
 const joints=section('Bilan articulaire',[table(['Élément','Résultat'],jointFields.map(([id,label])=>[label,c.joints?.[id]]))]);
 const findings=section('Constats retenus par l’évaluateur',[
  ...findingOptions.filter(([id])=>c.findings.includes(id)).map(([,label])=>paragraph(label,{bullet:true})),
  paragraph(c.evidence,{justify:true})
 ]);
 return [history,section('02 — Examen clinique et fonctionnel',[walking,...tests,unperformedTests,joints,findings],true)];
}

export function assessmentPDF(record,previous){
 const clean=anonymizer(record,previous),layout=documentLayout(record,clean);
 const {section,paragraph,table}=layout;
 const clinical=record.clinical.schema===2?compactSections(record.clinical,layout):historicalSections(record.clinical,layout);
 const objectives=[...new Set(clean(record.project).split('\n').map(line=>normalize(line.replace(/^\s*(?:[•*–-]|\d+[.)])\s+/,''))).filter(Boolean))];
 const validation=(date,author)=>date&&paragraph('Validation : '+stamp(date)+(author?' — '+author:''));
 const sectionValidation=(date,author)=>date===record.finalizedAt&&author===record.finalizedBy?null:validation(date,author);
 const review=record.clinical.schema===2?
  record.reviewWindow&&paragraph('Échéance de réévaluation : '+reviewLabel(record)):
  record.reviewDate&&paragraph('Échéance de réévaluation : '+dateFR(record.reviewDate));
 const blocks=[
  validation(record.finalizedAt,record.finalizedBy),...clinical,
  section('03 — Diagnostic kinésithérapique',[paragraph(normalize(clean(record.diagnosis)),{justify:true}),sectionValidation(record.diagnosisValidatedAt,record.diagnosisValidatedBy)],true),
  section('04 — Projet thérapeutique',[
   ...objectives.map(value=>paragraph(value,{bullet:true})),
   record.clinical.schema!==2&&record.frequency&&paragraph('Fréquence : '+record.frequency),
   record.clinical.schema!==2&&record.duration&&paragraph('Durée : '+record.duration),
   review,sectionValidation(record.projectValidatedAt,record.projectValidatedBy)
  ],true)
 ];
 if(previous){
  const rows=comparison(previous.clinical,record.clinical).map(item=>[item.label,item.previous,item.current,item.delta]);
  blocks.push(section('05 — Comparaison avec le bilan du '+dateFR(previous.date),[
   table(['Mesure','Antérieur','Actuel','Évolution'],rows,[0.28,0.24,0.24,0.24]),
   paragraph(record.evolution,{justify:true})
  ],true));
 }else if(record.evolution)blocks.push(section('05 — Évolution clinique',[paragraph(record.evolution,{justify:true})],true));
 for(const block of blocks.filter(Boolean))block.draw();
 return layout.finish();
}

function serializePDF(pages,buildFonts){
 const objects=[],add=value=>objects.push(value),catalog=add(''),tree=add('');
 const fonts=buildFonts(add),kids=pages.map(commands=>{
  const bytes=Buffer.from(commands.join('\n'),'latin1');
  const stream=add(Buffer.concat([Buffer.from(`<< /Length ${bytes.length} >>\nstream\n`),bytes,Buffer.from('\nendstream')]));
  return add(`<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << ${fonts} >> >> /Contents ${stream} 0 R >>`);
 });
 objects[catalog-1]=`<< /Type /Catalog /Pages ${tree} 0 R >>`;
 objects[tree-1]=`<< /Type /Pages /Count ${kids.length} /Kids [${kids.map(id=>id+' 0 R').join(' ')}] >>`;
 const parts=[Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n','latin1')],offsets=[0];
 let length=parts[0].length;
 objects.forEach((obj,i)=>{
  offsets.push(length);
  const chunk=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),Buffer.isBuffer(obj)?obj:Buffer.from(obj,'latin1'),Buffer.from('\nendobj\n')]);
  parts.push(chunk);
  length+=chunk.length;
 });
 const xref=length;
 parts.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
 return Buffer.concat(parts);
}
