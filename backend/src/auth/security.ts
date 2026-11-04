import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export function hashPassword(password:string):string { const salt=randomBytes(16).toString('hex'); const hash=scryptSync(password,salt,64).toString('hex'); return `scrypt:${salt}:${hash}`; }
export function verifyPassword(password:string, stored:string):boolean { try { const [alg,salt,hex]=stored.split(':'); if (alg!=='scrypt'||!salt||!hex) return false; const expected=Buffer.from(hex,'hex'); const actual=scryptSync(password,salt,expected.length); return timingSafeEqual(expected,actual); } catch {return false;} }
export const newToken=()=>randomBytes(32).toString('hex');
export const hashToken=(t:string)=>createHash('sha256').update(t).digest('hex');
