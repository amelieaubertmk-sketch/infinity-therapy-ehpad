import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {stdin,stdout} from 'node:process';
import {randomUUID} from 'node:crypto';
import {database,audit} from '../backend/database.js';
import {hashPassword,roles} from '../backend/auth.js';
const command=process.argv[2]||'create';
if(!['create','reset'].includes(command))throw Error('Utiliser create ou reset.');
const rl=createInterface({input:stdin,output:stdout});
let db;
try{
 const username=(await rl.question('Identifiant individuel (3-50 caractères minuscules) : ')).trim().toLowerCase();
 if(!/^[a-z0-9._-]{3,50}$/.test(username))throw Error('Identifiant invalide.');
 let name,role;if(command==='create'){name=(await rl.question('Nom affiché : ')).trim();role=(await rl.question('Rôle (admin, kine, secretariat) : ')).trim();if(!name||name.length>80||!roles.includes(role))throw Error('Nom ou rôle invalide.');}rl.close();
 async function secret(prompt){stdout.write(prompt);let muted=false;const output=new Writable({write(chunk,encoding,next){if(!muted)stdout.write(chunk);next();}});const input=createInterface({input:stdin,output,terminal:!!stdin.isTTY});muted=true;try{return await input.question('');}finally{input.close();stdout.write('\n');}}
 const password=await secret('Mot de passe (12 caractères minimum, masqué) : '),confirmation=await secret('Confirmer : ');if(password!==confirmation)throw Error('Les mots de passe diffèrent.');const hash=await hashPassword(password);db=database();const existing=db.prepare('SELECT * FROM users WHERE username=?').get(username);
 if(command==='reset'){if(!existing)throw Error('Compte introuvable.');db.prepare('UPDATE users SET password=?,active=1 WHERE id=?').run(hash,existing.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(existing.id);audit(db,null,'user.reset.local',existing.id);}else{if(existing)throw Error('Compte déjà existant.');const id=randomUUID();db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(id,username,name,role,hash);audit(db,null,'user.create.local',id);}console.log('Compte enregistré. Aucun mot de passe n’a été affiché ou enregistré en clair.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{rl.close();db?.close();}
