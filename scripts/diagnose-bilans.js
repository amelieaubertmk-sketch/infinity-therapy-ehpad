// Read-only deployment diagnosis. Never imports createApp/database(), never reads clinical rows.
import {readFileSync,existsSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {planStaticRouteRepair} from './repair-static-routes.js';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const schema={state:['id','revision','data'],assessments:['id','resident_id','owner','status','revision','data'],assessment_tracking:['assessment_id','deleted_at','deleted_by','titan_at','titan_by','titan_name'],assessment_versions:['id','assessment_id','at','actor','data'],assessment_documents:['assessment_id','pdf','created_at','format_version']};
export async function diagnoseBilans({project,base,manifest,checkSyntax=true,dataFile}){
 const root=realpathSync(project),result={project:root,node:process.version,checks:[],routes:null,http:[],schema:null,conclusions:[]};
 for(const [file,expected] of Object.entries(manifest.files)){
  if(file.includes('..')||path.isAbsolute(file)||!(/^(src|backend|assets\/fonts)\//.test(file)||['server.js','index.html','package.json'].includes(file)))throw Error('Chemin de manifeste non autorisé.');
  const target=path.join(root,file);if(!existsSync(target)){result.checks.push({file,state:'missing'});continue;}const hash=digest(readFileSync(target));const check={file,state:hash===expected.sha256?'target':hash===expected.base260?'official-2.6.0':'different'};
  if(checkSyntax&&file.endsWith('.js')){try{execFileSync(process.execPath,['--check',target],{stdio:'pipe',timeout:5000});check.syntax='valid';}catch{check.syntax='invalid';}}
  result.checks.push(check);
 }
 const server=path.join(root,'backend','server.js');if(existsSync(server)){try{result.routes={missing:planStaticRouteRepair(readFileSync(server,'utf8')).missing};}catch(e){result.routes={error:e.message};}}
 if(base){const address=new URL(base);if(!['http:','https:'].includes(address.protocol)||address.username||address.password)throw Error('Adresse de diagnostic invalide.');result.origin=address.origin;
  result.http=await Promise.all(['app.js','store.js','domain.js','demo-store.js','assessments.js','assessments-domain.js','assessments-compact.js'].map(async file=>{const relative='src/'+file,url=new URL('/'+relative+'?v=2.6.1&diagnostic='+Date.now(),address),check={file:relative};try{const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4000)});check.status=response.status;check.mime=response.headers.get('content-type')||'';if(response.ok){const bytes=Buffer.from(await response.arrayBuffer());check.javascript=/^(text|application)\/javascript(?:;|$)/i.test(check.mime);check.matchesDisk=existsSync(path.join(root,relative))&&digest(bytes)===digest(readFileSync(path.join(root,relative)));}}catch{check.network='unreachable';}return check;}));
 }
 if(dataFile){if(!existsSync(dataFile))result.schema={error:'Le fichier de base configuré n’existe pas ; aucune base créée.'};else{let db;try{const {DatabaseSync}=await import('node:sqlite');db=new DatabaseSync(dataFile,{readOnly:true});result.schema={};for(const [table,columns] of Object.entries(schema)){const actual=new Set(db.prepare('PRAGMA table_info('+table+')').all().map(row=>row.name));result.schema[table]={present:actual.size>0,missingColumns:columns.filter(column=>!actual.has(column))};}}catch{result.schema={error:'Schéma non inspectable en lecture seule ; aucune réparation SQLite exécutée.'};}finally{db?.close();}}}
 const [major,minor]=process.versions.node.split('.').map(Number);if(major<24||major===24&&minor<13)result.conclusions.push('Node.js 24.13 ou supérieur requis par cette application. Aucun runtime installé automatiquement.');
 for(const item of result.http)if(item.status!==undefined&&item.status!==200)result.conclusions.push(item.file+' : HTTP '+item.status);
 const compact=result.http.find(x=>x.file==='src/assessments-compact.js'),compactDisk=result.checks.find(x=>x.file==='src/assessments-compact.js');
 if(compactDisk?.state==='missing')result.conclusions.push('Fichier src/assessments-compact.js absent du projet configuré.');
 if(result.routes?.missing?.includes('/src/assessments-compact.js'))result.conclusions.push('La liste statique sur disque n’autorise pas assessments-compact.js : route manquante confirmée.');
 if(compact?.status===404&&compactDisk?.state!=='missing'&&!result.routes?.missing?.length&&!result.routes?.error)result.conclusions.push('Fichier et route présents sur disque mais HTTP 404 : processus encore chargé avec une ancienne version, ou autre projet réellement servi. Arrêter le bon processus puis redémarrer la tâche existante.');
 if(result.http.some(x=>x.matchesDisk===false))result.conclusions.push('Le contenu HTTP diffère du projet configuré : vérifier la copie réellement utilisée par Node.');
 if(result.http.some(x=>x.status===502))result.conclusions.push('HTTP 502 observé : requête en échec côté serveur/proxy ; aucune modification Tailscale automatique.');
 if(result.http.some(x=>x.network))result.conclusions.push('Connexion au serveur non établie. Vérifier le processus, son port et les fichiers backend/assets.');
 if(result.checks.some(x=>x.syntax==='invalid'))result.conclusions.push('Au moins un fichier ne passe pas node --check.');
 if(result.checks.some(x=>x.state==='different'))result.conclusions.push('Des fichiers diffèrent de la version officielle 2.6.0 et du correctif ciblé : installation mélangée ou personnalisée.');
 if(result.checks.some(x=>x.state==='missing'))result.conclusions.push('Au moins une dépendance src/backend/assets manque.');
 if(result.http.some(x=>x.status===200&&x.javascript===false))result.conclusions.push('Une URL de module renvoie un type MIME non JavaScript.');
 if(result.schema&&!result.schema.error&&Object.values(result.schema).some(x=>!x.present||x.missingColumns.length))result.conclusions.push('Le schéma configuré est incomplet pour 2.6.0. Ne pas réinitialiser : vérifier le backend réellement chargé et l’initialisation additive originale.');
 if(!result.conclusions.length)result.conclusions.push('Les contrôles statiques concordent. Vérifier les requêtes API authentifiées dans Chrome si le chargement échoue encore.');
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),arg=key=>args.includes(key)?args[args.indexOf(key)+1]:undefined;
 try{const configPath=arg('--config')||(process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'InfinityTherapyDemo','config.json'):null),config=configPath&&existsSync(configPath)?JSON.parse(readFileSync(configPath,'utf8')):{};const project=arg('--project')||config.project;if(!project)throw Error('Indiquer --project ou utiliser le compte Windows qui possède config.json.');const manifest=JSON.parse(readFileSync(arg('--manifest')||new URL('./bilans-runtime-manifest.json',import.meta.url),'utf8'));const result=await diagnoseBilans({project,base:arg('--base')||(config.port?'http://127.0.0.1:'+config.port:undefined),manifest,dataFile:args.includes('--schema')&&config.dataDir?path.join(config.dataDir,'demo.sqlite'):undefined});console.log(JSON.stringify(result,null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
