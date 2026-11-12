// Manual deployment repair only. Never imports the application, SQLite or patient data.
import {readFileSync,writeFileSync,existsSync,realpathSync,mkdirSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createConnection} from 'node:net';
import {planStaticRouteRepair} from './repair-static-routes.js';
import {diagnoseBilans} from './diagnose-bilans.js';
const here=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const modules=['src/assessments.js','src/assessments-domain.js','src/assessments-compact.js'];
function syntax(file){execFileSync(process.execPath,['--check',file],{stdio:'pipe',timeout:5000});}
function replace(file,bytes){const temporary=file+'.repair-'+randomUUID();try{writeFileSync(temporary,bytes,{flag:'wx'});renameSync(temporary,file);}finally{if(existsSync(temporary))unlinkSync(temporary);}}
export function prepareRepair({project,packageRoot=here}){
 const root=realpathSync(project),release=realpathSync(packageRoot);
 if(root===release)throw Error('Extraire la reparation dans un dossier distinct du projet actif.');
 const manifest=JSON.parse(readFileSync(path.join(release,'scripts/bilans-runtime-manifest.json'),'utf8'));
 const replacements=[];
 for(const [file,expected] of Object.entries(manifest.files)){
  const source=path.join(root,file);
  if(file==='backend/server.js'){syntax(source);continue;}
  if(modules.includes(file)){
   const bundled=path.join(release,file),bytes=readFileSync(bundled);
   if(hash(bytes)!==expected.sha256)throw Error('Archive alteree : '+file);
   syntax(bundled);
   if(!existsSync(source)||hash(readFileSync(source))!==expected.sha256)replacements.push({file,bytes});
  }else{
   if(!existsSync(source))throw Error('Dependance manquante : '+file+'. Restaurer cette dependance officielle avant reparation.');
   const actual=hash(readFileSync(source));
   if(actual!==expected.sha256&&actual!==expected.base260)throw Error('Version incompatible ou personnalisee : '+file+'. Aucune modification.');
   if(file.endsWith('.js'))syntax(source);
  }
 }
 const server=path.join(root,'backend/server.js'),original=readFileSync(server,'utf8');
 if(!readFileSync(path.join(root,'server.js'),'utf8').includes('./backend/server.js'))throw Error('Point d entree inattendu.');
 const plan=planStaticRouteRepair(original);
 // Check the four shared modules as well, without exposing arbitrary files.
 for(const name of ['app','store','domain','demo-store'])if(!original.includes("'/src/"+name+".js':'src/"+name+".js'"))throw Error('Route commune absente ou inattendue : '+name+'.js. Aucune modification.');
 if(plan.missing.length)replacements.push({file:'backend/server.js',bytes:Buffer.from(plan.source)});
 return {root,release,manifest,missingRoutes:plan.missing,replacements};
}
async function requireStopped(port){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Port configure invalide.');
 await new Promise((resolve,reject)=>{const socket=createConnection({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();reject(Error('Serveur encore actif : aucune modification.'));});socket.once('error',e=>e.code==='ECONNREFUSED'?resolve():reject(Error('Arret du serveur non verifiable.')));socket.setTimeout(2000,()=>{socket.destroy();reject(Error('Verification du port expiree.'));});});
}
export async function applyRepair({project,packageRoot=here,backup,port}){
 const plan=prepareRepair({project,packageRoot});await requireStopped(port);
 if(!backup||!path.isAbsolute(backup)||existsSync(backup))throw Error('Choisir un nouveau dossier absolu de sauvegarde du code.');
 const relative=path.relative(plan.root,backup);if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Sauvegarde requise hors du projet.');
 mkdirSync(backup,{recursive:true,mode:0o700});
 const before=new Map();
 for(const entry of plan.replacements){const file=path.join(plan.root,entry.file),bytes=existsSync(file)?readFileSync(file):null;before.set(entry.file,bytes);if(bytes){const target=path.join(backup,entry.file);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,bytes,{flag:'wx'});}}
 writeFileSync(path.join(backup,'manifest.json'),JSON.stringify({project:plan.root,files:plan.replacements.map(e=>({file:e.file,existed:before.get(e.file)!==null})),missingRoutes:plan.missingRoutes},null,2),{flag:'wx'});
 try{for(const entry of plan.replacements){const target=path.join(plan.root,entry.file);if(!existsSync(path.dirname(target)))throw Error('Dossier src/backend absent.');replace(target,entry.bytes);syntax(target);}}
 catch(error){for(const [file,bytes] of before){const target=path.join(plan.root,file);if(bytes)replace(target,bytes);else if(existsSync(target))unlinkSync(target);}throw error;}
 return {project:plan.root,backup,changed:plan.replacements.map(e=>e.file),missingRoutes:plan.missingRoutes};
}
export async function verifyRepair({project,packageRoot=here,base}){
 if(!base)throw Error('Adresse locale requise pour verifier le serveur reel.');
 const manifest=JSON.parse(readFileSync(path.join(packageRoot,'scripts/bilans-runtime-manifest.json'),'utf8'));
 const report=await diagnoseBilans({project,base,manifest});
 const failed=report.http.filter(x=>x.status!==200||!x.javascript||!x.matchesDisk);
 return {ok:report.http.length===7&&failed.length===0,project:report.project,http:report.http,conclusions:report.conclusions};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];
 try{
  if(!args.includes('--project'))throw Error('--project requis.');const project=value('--project');
  if(args.includes('--verify')){const result=await verifyRepair({project,base:value('--base')});console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
  else if(args.includes('--apply'))console.log(JSON.stringify(await applyRepair({project,backup:value('--backup'),port:Number(value('--port'))}),null,2));
  else{const plan=prepareRepair({project});console.log(JSON.stringify({project:plan.root,missingRoutes:plan.missingRoutes,filesToReplace:plan.replacements.map(e=>e.file),readOnly:true},null,2));}
 }catch(error){console.error(error.message);process.exitCode=1;}
}
