import {isDeepStrictEqual as equal} from 'node:util';
import {activities,sectors,createTransmission,changeStatus,cancelTransmission} from '../src/domain.js';
const fail=m=>{throw Error(m);};
function residentValid(r){if(typeof r.id!=='string'||!r.id||typeof r.code!=='string'||!r.code.trim()||r.code.length>30||!sectors.includes(r.sector)||typeof r.archived!=='boolean'||!r.templates||Object.keys(r.templates).length!==4||activities.some(a=>typeof r.templates[a]!=='string'||r.templates[a].length>20000))fail('Résident ou modèles invalides.');return {id:r.id,code:r.code.trim(),sector:r.sector,archived:r.archived,templates:r.templates};}
// Apply one explicit change to a server-owned snapshot; never trust client historical fields.
export function mutation(current,proposed,user){
 if(!proposed||proposed.version!==1||!Array.isArray(proposed.residents)||!Array.isArray(proposed.transmissions))fail('Données invalides.');
 const residentsChanged=!equal(current.residents,proposed.residents),txChanged=!equal(current.transmissions,proposed.transmissions);
 if(residentsChanged&&txChanged||!residentsChanged&&!txChanged)fail('Une seule action est autorisée à la fois.');
 if(residentsChanged){if(user.role!=='admin')fail('Administration réservée à l’administratrice.');if(proposed.residents.length<current.residents.length||proposed.residents.length>current.residents.length+1)fail('Suppression de résident interdite.');
 const old=new Map(current.residents.map(r=>[r.id,r]));if(new Set(proposed.residents.map(r=>r.id)).size!==proposed.residents.length||current.residents.some(r=>!proposed.residents.some(n=>n.id===r.id)))fail('Identifiant invalide.');const changed=proposed.residents.filter(r=>!equal(r,old.get(r.id)));if(changed.length!==1)fail('Une seule modification de résident est autorisée.');const valid=residentValid(changed[0]);return {state:{...current,residents:proposed.residents.map(r=>r.id===valid.id?valid:old.get(r.id))},action:'resident.update',target:valid.id};}
 const old=new Map(current.transmissions.map(t=>[t.id,t]));if(new Set(proposed.transmissions.map(t=>t.id)).size!==proposed.transmissions.length||current.transmissions.some(t=>!proposed.transmissions.some(n=>n.id===t.id)))fail('Suppression de transmission interdite.');
 const changed=proposed.transmissions.filter(t=>!equal(t,old.get(t.id)));if(changed.length!==1)fail('Une seule modification de transmission est autorisée.');const t=changed[0],previous=old.get(t.id);let result,action;
 if(!previous){if(!['admin','kine'].includes(user.role))fail('Création réservée aux kinésithérapeutes.');if(proposed.transmissions.length!==current.transmissions.length+1)fail('Ajout invalide.');if(['text','observation','reason'].some(k=>typeof t[k]!=='string'||t[k].length>20000)||typeof t.notPerformed!=='boolean')fail('Texte invalide.');result={...createTransmission(current,t),createdBy:user.id};action='transmission.create';}
 else {if(proposed.transmissions.length!==current.transmissions.length)fail('Modification invalide.');
 if(t.status==='Annulée'){if(!['admin','kine'].includes(user.role))fail('Annulation réservée aux kinésithérapeutes.');result=cancelTransmission(previous,t.cancellation?.reason);action='transmission.cancel';}
 else {result=changeStatus(previous,t.status);action='transmission.status';}
 const permitted=['status','statusHistory',...(t.status==='Annulée'?['cancellation']:[])];for(const k of new Set([...Object.keys(previous),...Object.keys(t)]))if(!permitted.includes(k)&&!equal(previous[k],t[k]))fail('Le texte historique ne peut pas être modifié.');}
 return {state:{...current,transmissions:previous?current.transmissions.map(x=>x.id===previous.id?result:x):[result,...current.transmissions]},action,target:result.id};
}
