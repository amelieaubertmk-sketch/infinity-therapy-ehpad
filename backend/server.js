import {reconcileLegacyTopaze,invalidateMissingPointages} from './topaze.js';
import http from 'node:http';
import {initializeAssessments,assessmentRoute} from './assessments.js';
import {exportWorkbook} from './xlsx.js';
import {isDeepStrictEqual} from 'node:util';
import {technicalLog} from './log.js';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {database,snapshot,audit} from './database.js';
import {roles,hashPassword,verifyPassword,publicUser,session,newSession,digest} from './auth.js';
import {mutation} from './mutations.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const security={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
export function createApp({directory,origin='http://localhost:3000'}={}){
 const allowed=new URL(origin);if(allowed.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(allowed.hostname))throw Error('HTTPS requis hors localhost.');const db=database(directory);try{reconcileLegacyTopaze(db);}catch(e){db.close();throw e;}initializeAssessments(db);let closed=false,activeLogins=0;
 const cookie=(token,expire=false)=>`infinity_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${expire?0:28800}${allowed.protocol==='https:'?'; Secure':''}`;
 const server=http.createServer(async(req,res)=>{
 const json=(code,data,headers={})=>{res.writeHead(code,{...security,'Content-Type':'application/json; charset=utf-8',...headers});res.end(JSON.stringify(data));};
 try{
 const backendHosts=[allowed.host,`127.0.0.1:${req.socket.localPort}`,`localhost:${req.socket.localPort}`];
 if(!backendHosts.includes(req.headers.host))return json(403,{error:'Hôte non autorisé.'});
 const url=new URL(req.url,allowed),route=url.pathname;
 if(!route.startsWith('/api/')){const files={'/':'index.html','/index.html':'index.html','/src/app.js':'src/app.js','/src/store.js':'src/store.js','/src/demo-store.js':'src/demo-store.js','/src/domain.js':'src/domain.js','/src/style.css':'src/style.css','/src/assessments.js':'src/assessments.js','/src/assessments-domain.js':'src/assessments-domain.js','/src/assessments-compact.js':'src/assessments-compact.js'};if(!files[route]||req.method!=='GET')return json(404,{error:'Introuvable.'});const file=files[route];let content;try{content=await readFile(path.join(root,file));}catch(error){if(error.code==='ENOENT')return json(404,{error:'Fichier statique absent : '+file});throw error;}res.writeHead(200,{...security,'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});res.end(content);return;}
 if(!['GET','POST','PUT'].includes(req.method))return json(405,{error:'Méthode interdite.'});
 let body={};if(req.method!=='GET'){if(req.headers.origin!==allowed.origin||req.headers['content-type']?.split(';')[0]!=='application/json')return json(403,{error:'Origine ou format non autorisé.'});let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>2000000)return json(413,{error:'Requête trop volumineuse.'});}try{body=JSON.parse(text);}catch{return json(400,{error:'JSON invalide.'});}}
 if(route==='/api/login'&&req.method==='POST'){
 if(typeof body.username!=='string'||typeof body.password!=='string'||body.password.length>256||body.username.length>80)return json(400,{error:'Identifiants invalides.'});
 const key=digest((req.socket.remoteAddress||'')+body.username.toLowerCase()),now=Date.now();db.prepare('DELETE FROM attempts WHERE until<?').run(now);const attempt=db.prepare('SELECT * FROM attempts WHERE key=?').get(key);if(attempt&&attempt.until>now&&attempt.count>=8)return json(429,{error:'Trop de tentatives. Réessayez dans 15 minutes.'});
 db.prepare('INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END').run(key,now+900000,now,now);
 // A shared limit also bounds parallel password hashing via the local HTTPS reverse proxy.
 const global=db.prepare("SELECT * FROM attempts WHERE key='global'").get();if(global&&global.until>now&&global.count>=60)return json(429,{error:'Réessayez dans quelques minutes.'});db.prepare("INSERT INTO attempts VALUES('global',1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END").run(now+60000,now,now);
 const user=db.prepare('SELECT * FROM users WHERE username=?').get(body.username.toLowerCase());if(activeLogins>=4)return json(429,{error:'Connexions en cours. Réessayez dans quelques secondes.'});let valid;activeLogins++;try{valid=await verifyPassword(body.password,user?.password||'00000000000000000000000000000000:'+ '00'.repeat(64));}finally{activeLogins--;}if(!user?.active||!valid){audit(db,null,'login.failed');return json(401,{error:'Identifiants incorrects.'});}
 // Recheck after asynchronous hashing in case an administrator deactivated/reset the account.
 const fresh=db.prepare('SELECT * FROM users WHERE id=?').get(user.id);if(!fresh.active||fresh.password!==user.password)return json(401,{error:'Identifiants incorrects.'});db.prepare('DELETE FROM attempts WHERE key=?').run(key);const s=newSession(db,user.id);audit(db,user.id,'login');return json(200,{user:publicUser(user),csrf:s.csrf},{'Set-Cookie':cookie(s.token)});
 }
 const user=session(db,req);if(!user)return json(401,{error:'Connexion requise.'});if(req.method!=='GET'&&req.headers['x-csrf-token']!==user.csrf)return json(403,{error:'Session invalide. Reconnectez-vous.'});
 if(assessmentRoute({db,user,route,method:req.method,body,json}))return;
 if(route==='/api/me'&&req.method==='GET')return json(200,{user:publicUser(user),csrf:user.csrf});
 if(route==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE token=?').run(user.token);audit(db,user.id,'logout');return json(200,{ok:true},{'Set-Cookie':cookie('',true)});}
 const visible=snap=>user.role==='secretariat'?{...snap,state:{...snap.state,residents:snap.state.residents.map(r=>({...r,templates:{}}))}}:snap;
 if(route==='/api/trash'&&req.method==='GET'){
 if(user.role!=='admin')return json(403,{error:'Administration réservée.'});
 return json(200,{entries:db.prepare('SELECT * FROM trash ORDER BY deleted_at DESC').all().map(e=>{const t=JSON.parse(e.data);return {id:e.id,deletedAt:e.deleted_at,residentCode:t.residentCode,date:t.date,practitioner:t.practitioner};})});}
 if(['/api/transmissions/trash','/api/transmissions/restore','/api/transmissions/export'].includes(route)&&req.method==='POST'){
 const exporting=route.endsWith('/export'),restoring=route.endsWith('/restore');
 if(!exporting&&user.role!=='admin')return json(403,{error:'Suppression et restauration réservées à l’administratrice.'});
 if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>1000||body.ids.some(id=>typeof id!=='string')||new Set(body.ids).size!==body.ids.length)return json(400,{error:'Sélection invalide (1 à 1000 lignes).'});
 if(!exporting&&body.confirmation!==(restoring?'RESTAURER':'CORBEILLE'))return json(400,{error:'Confirmation requise.'});
 db.exec('BEGIN IMMEDIATE');try{
 const current=snapshot(db);if(body.revision!==current.revision){db.exec('ROLLBACK');return json(409,{error:'Données modifiées : rechargez puis vérifiez la sélection.'});}
 const rows=body.ids.map(id=>restoring?JSON.parse(db.prepare('SELECT data FROM trash WHERE id=?').get(id)?.data||'null'):current.state.transmissions.find(t=>t.id===id));
 if(rows.some(t=>!t)||(restoring&&rows.some(t=>!current.state.residents.some(r=>r.id===t.residentId)||current.state.transmissions.some(x=>x.id===t.id)))){db.exec('ROLLBACK');return json(400,{error:'Sélection indisponible ou résident supprimé. Aucune modification.'});}
 if(exporting){const file=exportWorkbook(rows);audit(db,user.id,'transmission.export',JSON.stringify(body.ids));db.exec('COMMIT');return json(200,{file:file.toString('base64')});}
 const at=new Date().toISOString();for(const t of rows){if(restoring)db.prepare('DELETE FROM trash WHERE id=?').run(t.id);else db.prepare('INSERT INTO trash VALUES(?,?,?,?)').run(t.id,at,user.id,JSON.stringify(t));audit(db,user.id,restoring?'transmission.restore':'transmission.trash',t.id);}
 const next={...current.state,transmissions:restoring?[...current.state.transmissions,...rows]:current.state.transmissions.filter(t=>!body.ids.includes(t.id))};
 db.prepare('UPDATE state SET revision=revision+1,data=? WHERE id=1').run(JSON.stringify(invalidateMissingPointages(next,user)));db.exec('COMMIT');return json(200,visible(snapshot(db)));
 }catch{if(db.isTransaction)db.exec('ROLLBACK');return json(400,{error:'Opération refusée. Aucune modification.'});}}


 // Both operations read and write under the same SQLite write lock.
 if(['/api/transmissions/create','/api/transmissions/topaze'].includes(route)&&req.method==='POST'){
 db.exec('BEGIN IMMEDIATE');try{
 const current=snapshot(db);let next,action,target;
 if(route.endsWith('/create')){
 const input=body.transmission;
 const result=mutation(current.state,{...current.state,transmissions:[input,...current.state.transmissions]},user,{confirmDuplicate:body.confirmDuplicate});
 next=result.state;action=result.action;target=result.target;
 }else{
 const t=current.state.transmissions.find(t=>t.id===body.id);
 if(!t)throw Error('Transmission introuvable.');
 if(current.state.residents.find(r=>r.id===t.residentId)?.prescription?.status==='missing')throw Error('Pointage impossible : ordonnance manquante');
 if(t.topaze){db.exec('COMMIT');return json(200,visible(current));}
 const topaze={at:new Date().toISOString(),userId:user.id,userName:user.name};
 next={...current.state,transmissions:current.state.transmissions.map(row=>row.id===t.id?{...row,topaze}:row)};
 action='transmission.topaze';target=t.id;
 }
 db.prepare('UPDATE state SET revision=revision+1,data=? WHERE id=1').run(JSON.stringify(next));audit(db,user.id,action,target);db.exec('COMMIT');return json(200,visible(snapshot(db)));
 }catch(e){if(db.isTransaction)db.exec('ROLLBACK');return json(e.code==='DUPLICATE_TRANSMISSION'?409:/réservée/.test(e.message)?403:400,{error:e.message,code:e.code});}}

 if(route==='/api/state'&&req.method==='GET')return json(200,visible(snapshot(db)));
 if(route==='/api/state'&&req.method==='PUT'){
 db.exec('BEGIN IMMEDIATE');try{const current=snapshot(db);if(body.revision!==current.revision){db.exec('ROLLBACK');return json(409,{error:'Une autre personne a modifié les données. Rechargez les données avant de réessayer ; votre formulaire est conservé.'});}let proposed=body.state;if(user.role==='secretariat'){if(!isDeepStrictEqual(body.state?.residents,visible(current).state.residents)){db.exec('ROLLBACK');return json(403,{error:'Modification des résidents interdite.'});}proposed={...body.state,residents:current.state.residents};}const result=mutation(current.state,proposed,user,{confirmDuplicate:body.confirmDuplicate});db.prepare('UPDATE state SET revision=revision+1,data=? WHERE id=1').run(JSON.stringify(result.state));audit(db,user.id,result.action,result.target);db.exec('COMMIT');if(result.action==='transmission.cancelled.delete'||result.action==='transmission.summary.delete'||result.action==='residents.clear'||result.action==='resident.delete'||result.action==='transmission.completedContentDeleted'||result.action==='transmission.purgeTitan'){try{db.exec('PRAGMA wal_checkpoint(TRUNCATE)');}catch{technicalLog('checkpoint.deferred');}}return json(200,visible(snapshot(db)));}catch(e){db.exec('ROLLBACK');return json(e.code==='DUPLICATE_TRANSMISSION'?409:/réservée/.test(e.message)?403:400,{error:e.message,code:e.code});}}
 if(route==='/api/users'){
 if(user.role!=='admin')return json(403,{error:'Administration réservée.'});if(req.method==='GET')return json(200,{users:db.prepare('SELECT * FROM users ORDER BY username').all().map(publicUser)});
 if(req.method!=='POST')return json(405,{error:'Méthode interdite.'});
 const existing=body.id?db.prepare('SELECT * FROM users WHERE id=?').get(body.id):null;if(body.id&&!existing)return json(404,{error:'Compte introuvable.'});
 if(typeof body.username!=='string'||!/^[a-z0-9._-]{3,50}$/.test(body.username)||typeof body.name!=='string'||!body.name.trim()||body.name.length>80||!roles.includes(body.role)||typeof body.active!=='boolean')return json(400,{error:'Compte invalide : identifiant de 3 à 50 caractères minuscules, nom et rôle requis.'});
 const password=body.password?await hashPassword(body.password):existing?.password;if(!password)return json(400,{error:'Mot de passe requis.'});
 // Recheck authority after hashing, which yields to other requests.
 if(!session(db,req)||db.prepare('SELECT role FROM users WHERE id=?').get(user.id)?.role!=='admin')return json(403,{error:'Droits modifiés. Reconnectez-vous.'});
 if(existing?.id===user.id&&(!body.active||body.role!=='admin'))return json(400,{error:'Vous ne pouvez pas retirer vos propres droits administrateur.'});
 const id=existing?.id||randomUUID();try{db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,name=excluded.name,role=excluded.role,password=excluded.password,active=excluded.active').run(id,body.username,body.name.trim(),body.role,password,body.active?1:0);}catch{return json(400,{error:'Identifiant déjà utilisé.'});}
 if(existing)db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);audit(db,user.id,existing?'user.update':'user.create',id);return json(200,{ok:true});}
 if(route==='/api/audit'&&req.method==='GET'){if(user.role!=='admin')return json(403,{error:'Administration réservée.'});return json(200,{events:db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all()});}
 json(404,{error:'Introuvable.'});
 }catch{technicalLog('request.failed');if(!res.headersSent)json(500,{error:'Erreur serveur. Enregistrement non confirmé ; vérifiez la liste avant de réessayer.'});else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.maxConnections=50;
 return {server,db,close(){if(!closed){closed=true;db.close();}}};
}
