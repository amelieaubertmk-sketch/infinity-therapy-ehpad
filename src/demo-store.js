import {seed,purgeTitan} from './domain.js?v=retention1';
const key='infinity-therapy-demo-v1';
export function load(){const raw=localStorage.getItem(key);if(!raw){const db=seed();save(db);return db;}const db=JSON.parse(raw);if(db.version!==1||!Array.isArray(db.residents)||!Array.isArray(db.transmissions))throw Error('Sauvegarde locale non reconnue.');return db;}
export function save(db){localStorage.setItem(key,JSON.stringify(purgeTitan(db)));}
export {key};
