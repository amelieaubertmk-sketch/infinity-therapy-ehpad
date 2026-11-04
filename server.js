import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname;
 if(!['/','/index.html','/src/app.js','/src/domain.js','/src/store.js','/src/style.css'].includes(name)){res.writeHead(404);res.end('Introuvable');return;}
 try {const data=await readFile(path.join(root,name==='/'?'index.html':name));res.writeHead(200,{'Content-Type':types[path.extname(name==='/'?'index.html':name)],'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});res.end(data);}catch{res.writeHead(500);res.end('Erreur serveur');}
}).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Infinity Therapy — serveur démarré sur le port '+(process.env.PORT||3000)));
