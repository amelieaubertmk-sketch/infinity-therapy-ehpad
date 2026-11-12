// Public GitHub Pages remains an explicitly separate, fictitious local demo.
// The private server never falls back to browser storage, even on network failure.
export const demo=location.hostname.endsWith('.github.io');
const local=demo?await import('./demo-store.js?v=2.5.1'):null;
export const key=local?.key;
let csrf='',revision=0;
export let user=null;
export async function request(url,method='GET',body){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);let response;try{response=await fetch(url,{method,signal:controller.signal,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{throw Error('Serveur inaccessible. Rien n’est confirmé : votre saisie est conservée. Vérifiez la connexion et le PC du cabinet.');}finally{clearTimeout(timeout);}
 let data;try{data=await response.json();}catch{throw Error('Serveur privé indisponible. Ouvrez l’adresse du PC via Tailscale.');}
 if(!response.ok){const e=Error(data.error||'Erreur serveur.');e.status=response.status;e.code=data.code;throw e;}return data;
}
export function clearIdentity(){user=null;csrf='';}
export async function identify(){if(demo){user={name:'Démonstration',role:'admin'};return user;}const data=await request('/api/me');user=data.user;csrf=data.csrf;return user;}
export async function login(username,password){const data=await request('/api/login','POST',{username,password});user=data.user;csrf=data.csrf;return user;}
export async function logout(){if(!demo)await request('/api/logout','POST',{});user=null;csrf='';}
export async function readSnapshot(){return request('/api/state');}
export async function load(){if(demo)return local.load();const data=await readSnapshot();revision=data.revision;return data.state;}
export function acceptSnapshot(data){revision=data.revision;return data.state;}
export function currentRevision(){return revision;}
export async function save(db){if(demo){local.save(db);return local.load();}const data=await request('/api/state','PUT',{revision,state:db});revision=data.revision;return data.state;}
