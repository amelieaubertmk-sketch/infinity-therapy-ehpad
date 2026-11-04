import {appendFileSync,statSync,renameSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
export function technicalLog(event,extra={}){
 const directory=process.env.INFINITY_DATA_DIR||path.join(os.homedir(),'InfinityTherapyDemo');const file=path.join(directory,'technical.log');
 const entry=JSON.stringify({at:new Date().toISOString(),event,...extra});
 console.log(entry);
 try{mkdirSync(directory,{recursive:true,mode:0o700});try{if(statSync(file).size>1000000)renameSync(file,file+'.previous');}catch{}appendFileSync(file,entry+'\n',{mode:0o600});}catch{console.error('technical-log.unavailable');}
}
