import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {seed} from '../src/domain.js';
export function database(directory=process.env.INFINITY_DATA_DIR||path.join(os.homedir(),'InfinityTherapyDemo')){
 mkdirSync(directory,{recursive:true,mode:0o700});
 const file=path.join(directory,'demo.sqlite');
 const db=new DatabaseSync(file);try{chmodSync(file,0o600);}catch{}
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,password TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at TEXT NOT NULL,actor TEXT,action TEXT NOT NULL,target TEXT);
 CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);`);
 if(!db.prepare('SELECT id FROM state').get())db.prepare('INSERT INTO state VALUES(1,1,?)').run(JSON.stringify(seed()));
 return db;
}
export function snapshot(db){const row=db.prepare('SELECT * FROM state WHERE id=1').get();return {revision:row.revision,state:JSON.parse(row.data)};}
export function audit(db,actor,action,target=null){db.prepare('INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)').run(new Date().toISOString(),actor,action,target);}
