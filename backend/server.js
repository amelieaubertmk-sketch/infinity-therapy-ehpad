import http from 'node:http';
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
 const allowed=new URL(origin);if(allowed.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(allowed.hostname))throw Error('HTTPS requis hors localhost.');const db=database(directory);let closed=false,activeLogins=0;
 const cookie=(token,expire=false)=>`infinity_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${expire?0:28800}${allowed.protocol==='https:'?'; Secure':''}`;
 const server=http.createServer(async(req,res)=>{
 const json=(code,data,headers={})=>{res.writeHead(code,{...security,'Content-Type':'application/json; charset=utf-8',...headers});res.end(JSON.stringify(data));};
 try{
 const backendHosts=[allowed.host,`127.0.0.1:${req.socket.localPort}`,`localhost:${req.socket.localPort}`];
 if(!backendHosts.includes(req.headers.host))return json(403,{error:'Hôte non autorisé.'});
 const url=new URL(req.url,allowed),route=url.pathname;
 if(!route.startsWith('/api/')){const files={'/':'index.html','/index.html':'index.html','/src/app.js':'src/app.js','/src/store.js':'src/store.js','/src/demo-store.js':'src/demo-store.js','/src/domain.js':'src/domain.js','/src/style.css':'src/style.css'};if(!files[route]||req.method!=='GET')return json(404,{error:'Introuvable.'});const file=files[route];res.writeHead(200,{...security,'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});res.end(await readFile(path.join(root,file)));return;}
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
 if(route==='/api/me'&&req.method==='GET')return json(200,{user:publicUser(user),csrf:user.csrf});
 if(route==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE token=?').run(user.token);audit(db,user.id,'logout');return json(200,{ok:true},{'Set-Cookie':cookie('',true)});}
 const visible=snap=>user.role==='secretariat'?{...snap,state:{...snap.state,residents:snap.state.residents.map(r=>({...r,templates:{}}))}}:snap;
 if(route==='/api/state'&&req.method==='GET')return json(200,visible(snapshot(db)));
 if(route==='/api/state'&&req.method==='PUT'){
 db.exec('BEGIN IMMEDIATE');try{const current=snapshot(db);if(body.revision!==current.revision){db.exec('ROLLBACK');return json(409,{error:'Une autre personne a modifié les données. Rechargez les données avant de réessayer ; votre formulaire est conservé.'});}let proposed=body.state;if(user.role==='secretariat'){if(!isDeepStrictEqual(body.state?.residents,visible(current).state.residents)){db.exec('ROLLBACK');return json(403,{error:'Modification des résidents interdite.'});}proposed={...body.state,residents:current.state.residents};}const result=mutation(current.state,proposed,user);db.prepare('UPDATE state SET revision=revision+1,data=? WHERE id=1').run(JSON.stringify(result.state));audit(db,user.id,result.action,result.target);db.exec('COMMIT');if(result.action==='resident.delete'||result.action==='transmission.completedAndDeleted'||result.action==='transmission.purgeTitan'){try{db.exec('PRAGMA wal_checkpoint(TRUNCATE)');}catch{technicalLog('checkpoint.deferred');}}return json(200,visible(snapshot(db)));}catch(e){db.exec('ROLLBACK');return json(/réservée/.test(e.message)?403:400,{error:e.message});}}
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
