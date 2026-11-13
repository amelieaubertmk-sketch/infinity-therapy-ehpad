import {isDeepStrictEqual} from 'node:util';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {chmodSync} from 'node:fs';
import {snapshot,audit} from './database.js';

export function invalidateMissingPointages(state,user={id:null,name:'Correction au démarrage'}){
 const missing=new Set(state.residents.filter(r=>r.prescription?.status==='missing').map(r=>r.id));
 const at=new Date().toISOString();
 return {...state,transmissions:state.transmissions.map(t=>{
 if(!t.topaze||!missing.has(t.residentId))return t;
 const {topaze,...rest}=t;
 return {...rest,topazeHistory:[...(t.topazeHistory||[]),{pointage:topaze,cancelledAt:at,cancelledBy:user.id,cancelledByName:user.name,reason:'Ordonnance manquante',externalCorrectionRequired:true}]};
 })};
}

// Repair older inconsistent records once, with a coherent SQLite backup first.
export function reconcileLegacyTopaze(db){
 const current=snapshot(db);if(isDeepStrictEqual(current.state,invalidateMissingPointages(current.state)))return;
 const file=db.prepare('PRAGMA database_list').all().find(r=>r.name==='main').file;
 const backup=path.join(path.dirname(file),`before-topaze-correction-${randomUUID()}.sqlite`);
 db.prepare('VACUUM INTO ?').run(backup);chmodSync(backup,0o600);
 db.exec('BEGIN IMMEDIATE');try{
 const fresh=snapshot(db),next=invalidateMissingPointages(fresh.state);
 if(!isDeepStrictEqual(fresh.state,next)){db.prepare('UPDATE state SET revision=revision+1,data=? WHERE id=1').run(JSON.stringify(next));audit(db,null,'transmission.topaze.legacyCorrection');}
 db.exec('COMMIT');
 }catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}
}
