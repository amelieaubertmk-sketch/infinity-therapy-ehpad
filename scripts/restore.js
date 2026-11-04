import {DatabaseSync} from 'node:sqlite';
import {copyFileSync,existsSync,mkdirSync,unlinkSync,chmodSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
// Only run after stopping the Windows scheduled task and all application processes.
const source=process.argv[2];if(!source||process.argv[3]!=='--server-stopped')throw Error('Arrêtez le serveur, puis : node scripts/restore.js sauvegarde.sqlite --server-stopped');
const check=new DatabaseSync(source,{readOnly:true});try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Sauvegarde endommagée.');if(!check.prepare('SELECT data FROM state WHERE id=1').get()||!check.prepare('SELECT id FROM users LIMIT 1').get())throw Error('Sauvegarde incompatible ou sans compte.');}finally{check.close();}
const dir=process.env.INFINITY_DATA_DIR||path.join(os.homedir(),'InfinityTherapyDemo');mkdirSync(dir,{recursive:true,mode:0o700});const dest=path.join(dir,'demo.sqlite');if(path.resolve(source)===path.resolve(dest))throw Error('Choisissez une sauvegarde extérieure au dossier de données.');if(existsSync(dest)){copyFileSync(dest,dest+'.before-restore-'+Date.now());}
for(const ext of ['-wal','-shm'])if(existsSync(dest+ext))unlinkSync(dest+ext);copyFileSync(source,dest);try{chmodSync(dest,0o600);}catch{}
const db=new DatabaseSync(dest);db.exec('DELETE FROM sessions; DELETE FROM attempts;');db.close();console.log('Restauration terminée. Les sessions ont été fermées. Redémarrez le serveur.');
