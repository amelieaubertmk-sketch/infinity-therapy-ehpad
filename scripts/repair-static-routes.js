// Run manually on Windows. This tool never imports the application/database or starts a server.
import {readFileSync,writeFileSync,existsSync,realpathSync,statSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createConnection} from 'node:net';
import {randomUUID} from 'node:crypto';
const additions=[['/src/assessments.js','src/assessments.js'],['/src/assessments-domain.js','src/assessments-domain.js'],['/src/assessments-compact.js','src/assessments-compact.js']];
export function planStaticRouteRepair(source){
 const matches=[...source.matchAll(/\bconst\s+files\s*=\s*\{([^{}]*)\}\s*;/g)];
 if(matches.length!==1)throw Error('Liste statique non reconnue ou ambiguë : aucune modification.');
 const match=matches[0],content=match[1],missing=[];
 for(const [url,file] of additions){const escaped=url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const key=new RegExp(`(['"])${escaped}\\1\\s*:`),mapping=new RegExp(`(['"])${escaped}\\1\\s*:\\s*(['"])${file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\2`);if(key.test(content)){if(!mapping.test(content))throw Error('Route existante inattendue : aucune modification.');}else missing.push([url,file]);}
 if(!missing.length)return {source,missing:[]};
 const separator=content.trim()&&!content.trim().endsWith(',')?',':'';
 const open=match[0].indexOf('{');
 const replacement=match[0].slice(0,open+1)+content+separator+missing.map(([url,file])=>`'${url}':'${file}'`).join(',')+match[0].slice(open+1+content.length);
 return {source:source.slice(0,match.index)+replacement+source.slice(match.index+match[0].length),missing:missing.map(([url])=>url)};
}
async function requireStopped(port){await new Promise((resolve,reject)=>{const socket=createConnection({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();reject(Error('Le port est encore ouvert. Arrêter la tâche et tout serveur manuel avant réparation.'));});socket.once('error',e=>e.code==='ECONNREFUSED'?resolve():reject(Error('Impossible de vérifier l’arrêt du serveur : '+e.code)));socket.setTimeout(2000,()=>{socket.destroy();reject(Error('Vérification du port expirée : aucune modification.'));});});}
export async function repairStaticRoutes({project,apply=false,backup,port}){
 const root=realpathSync(project),serverFile=path.join(root,'backend','server.js');
 if(!readFileSync(path.join(root,'server.js'),'utf8').includes('./backend/server.js'))throw Error('Point d’entrée inattendu : aucune modification.');
 for(const [,file] of additions)if(!statSync(path.join(root,file)).isFile())throw Error('Module absent : '+file);
 const source=readFileSync(serverFile,'utf8'),plan=planStaticRouteRepair(source);
 console.log('Projet vérifié : '+root);console.log('Fichier de routes : '+serverFile);
 if(!plan.missing.length){console.log('Les trois routes sont déjà présentes. Aucun fichier modifié. Vérifier le dossier du processus actif puis redémarrer Node.');return;}
 console.log('Routes manquantes : '+plan.missing.join(', '));if(!apply){console.log('Diagnostic uniquement. Aucun fichier modifié.');return;}
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Port de l’application requis (--port).');
 if(!backup||!path.isAbsolute(backup)||existsSync(backup))throw Error('Un nouveau chemin absolu de sauvegarde du code est requis (--backup).');
 await requireStopped(port);
 if(readFileSync(serverFile,'utf8')!==source)throw Error('Le fichier a changé pendant le diagnostic : aucune modification.');
 writeFileSync(backup,source,{flag:'wx',mode:0o600});
 const temporary=serverFile+'.static-repair-'+randomUUID();
 try{writeFileSync(temporary,plan.source,{flag:'wx',mode:statSync(serverFile).mode&0o777});renameSync(temporary,serverFile);}catch(e){if(existsSync(temporary))unlinkSync(temporary);throw e;}
 console.log('Correction limitée aux trois routes statiques appliquée. Sauvegarde : '+backup);console.log('Aucune base ouverte ; aucun serveur démarré.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),value=name=>args[args.indexOf(name)+1];
 try{if(!args.includes('--project')||!value('--project'))throw Error('Usage : node repair-static-routes.js --project CHEMIN [--apply --port PORT --backup NOUVEAU_FICHIER]');await repairStaticRoutes({project:value('--project'),apply:args.includes('--apply'),port:args.includes('--port')?Number(value('--port')):undefined,backup:args.includes('--backup')?value('--backup'):undefined});}catch(e){console.error(e.message);process.exitCode=1;}
}
