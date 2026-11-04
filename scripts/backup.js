import {backup} from 'node:sqlite';
import {database} from '../backend/database.js';
import path from 'node:path';
import {mkdirSync,existsSync,chmodSync} from 'node:fs';
const target=process.argv[2];if(!target)throw Error('Indiquez le chemin du nouveau fichier de sauvegarde .sqlite.');if(existsSync(target))throw Error('La destination existe déjà. Choisissez un nouveau nom.');mkdirSync(path.dirname(path.resolve(target)),{recursive:true,mode:0o700});const db=database();try{await backup(db,path.resolve(target));try{chmodSync(target,0o600);}catch{}console.log('Sauvegarde SQLite cohérente terminée. Conservez ce fichier sur un support privé protégé.');}finally{db.close();}
