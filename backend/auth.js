import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export const roles=['admin','kine','secretariat'];
export async function hashPassword(password){if(typeof password!=='string'||password.length<12||password.length>256)throw Error('Mot de passe : entre 12 et 256 caractères.');const salt=randomBytes(16).toString('hex');return `${salt}:${(await scrypt(password,salt,64)).toString('hex')}`;}
export async function verifyPassword(password,stored){const [salt,hex]=stored.split(':');const actual=await scrypt(password,salt,64);return timingSafeEqual(actual,Buffer.from(hex,'hex'));}
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const publicUser=u=>({id:u.id,username:u.username,name:u.name,role:u.role,active:!!u.active});
export function session(db,req){const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('infinity_session='))?.slice(17);if(!cookie)return null;return db.prepare('SELECT users.*,sessions.csrf,sessions.token FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>? AND users.active=1').get(digest(cookie),Date.now());}
export function newSession(db,userId){const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token),userId,csrf,Date.now()+8*3600000);return {token,csrf};}
