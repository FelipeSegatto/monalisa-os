// Integração HTTP: use somente em banco de desenvolvimento; cria dados reais.
import 'dotenv/config';
import assert from 'node:assert/strict';
const BASE=process.env.TEST_URL||'http://localhost:3333';
const email=process.env.ADMIN_EMAIL,password=process.env.ADMIN_PASSWORD;
if(!email||!password)throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD no backend/.env');
let cookie='';
async function call(method,path,body,expected=200){
 const res=await fetch(BASE+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await res.json().catch(()=>({}));
 if(res.status!==expected)throw new Error(`${method} ${path}: HTTP ${res.status}, expected ${expected}. ${JSON.stringify(data)}`);
 return {data,res};
}
async function run(){
 await call('GET','/api/v1/me',null,401);
 const login=await call('POST','/api/v1/auth/login',{email,password});
 cookie=login.res.headers.get('set-cookie')?.split(';')[0]||'';assert.match(cookie,/^clinic_session=/);
 const me=(await call('GET','/api/v1/me')).data;assert.equal(me.role,'ADMIN');
 const date=Date.now().toString(36);
 const client=(await call('POST','/api/v1/customers',{name:'Teste E2E '+date,phone:'829999'+date.slice(-6),email:null,birthDate:null,acquisitionSource:'OUTRO'},201)).data;
 const pro=(await call('POST','/api/v1/professionals',{name:'Prof E2E '+date,phone:null,email:null,color:'#22aa99',active:true},201)).data;
 const categories=(await call('GET','/api/v1/procedure-categories')).data.categories;assert.ok(categories.length);
 const procedure=(await call('POST','/api/v1/procedures',{categoryId:categories[0].id,name:'Procedimento E2E '+date,description:null,durationMinutes:60,price:80,active:true,variations:[]},201)).data;
 const start=new Date();start.setUTCDate(start.getUTCDate()+14);start.setUTCHours(13,0,0,0);
 const body={customerId:client.id,professionalId:pro.id,procedureId:procedure.id,startsAt:start.toISOString()};
 const created=(await call('POST','/api/v1/agenda',body,201)).data;
 assert.ok(created.id);
 await call('POST','/api/v1/agenda',body,409);
 const dateKey=new Date(start.getTime()-3*3600000).toISOString().slice(0,10);
 const agenda=(await call('GET',`/api/v1/agenda?date=${dateKey}`)).data;
 assert.ok(agenda.appointments.some(x=>x.id===created.id));
 await call('PATCH',`/api/v1/agenda/${created.id}/status`,{status:'COMPLETED'});
 const x=(await call('GET',`/api/v1/customers/${client.id}`)).data;assert.ok(x.history.some(x=>x.id===created.id));
 await call('POST','/api/v1/auth/logout');
 await call('GET','/api/v1/me',null,401);
 console.log('PASS: login, cookie, admin, clientes, profissionais, procedimentos, não sobreposição, status, histórico, logout');
}
run().catch(e=>{console.error(e);process.exitCode=1});
