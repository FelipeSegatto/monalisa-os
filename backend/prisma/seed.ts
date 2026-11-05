import { assertDemoSeedAllowed } from './seed-safety';
import 'dotenv/config';
import { randomBytes, createHash } from 'node:crypto';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient, type AppointmentStatus, type AcquisitionSource } from '@prisma/client';
import { hashPassword } from '../src/auth/security';

/**
 * Seed demonstrativo do Agenda Clínica / NestJS.
 * - Só deve ser executado com NODE_ENV=development/test, nunca em produção.
 * - Não executa TRUNCATE, deleteMany nem apaga cadastros preexistentes.
 * - Repetível: procura registros de demonstração antes de inseri-los.
 * - Recupera os procedimentos e as imagens do catálogo original.
 * - Atualiza a senha do ADMIN para corresponder a ADMIN_PASSWORD do .env.
 */
const db = new PrismaClient();
const ASSETS = resolve(__dirname, 'seed-assets', 'catalog');
const UPLOADS = resolve(process.cwd(), 'uploads', 'procedure');
const PASSWORD_LENGTH = 12;

const catalog = [
  { category: 'Preenchimento', name: 'Preenchimento', duration: 45, price: 1800, image: 'preenchimento.jpg', description: 'Tratamento estético de preenchimento. Avaliação individual necessária.' },
  { category: 'Botox', name: 'Botox', duration: 30, price: 1200, image: 'botox-new.jpg', description: 'O rosto se expressa o tempo todo. A toxina botulínica pode suavizar linhas de expressão de forma individualizada.' },
  { category: 'Bioestimulador de Colágeno', name: 'Bioestimulador de Colágeno', duration: 40, price: 2200, image: 'botox.jpg', description: 'Estimula a produção de colágeno com resultado gradual, sujeito à avaliação profissional.' },
  { category: 'Ultrassom Microfocado', name: 'Ultrassom Microfocado', technology: 'HIFU', duration: 60, price: 900, image: 'ultrassom-microfocado.jpg', description: 'Procedimento estético com tecnologia de ultrassom microfocado.' },
  { category: 'Depilação a laser', name: 'Depilação a Laser', technology: 'LASER_HAIR_REMOVAL', duration: 20, price: 150, image: 'depilacao-laser.jpg', description: 'Depilação a laser com regiões e valores conforme a área.' },
  { category: 'Remoção de Tatuagens', name: 'Remoção de Tatuagem', technology: 'TATTOO_REMOVAL', duration: 60, price: 400, image: 'remocao-tatuagens.jpg', description: 'Remoção de tatuagens: valores ilustrativos por tamanho.' },
  { category: 'Peeling de Carbono', name: 'Peeling de Carbono', duration: 30, price: 350, image: 'peeling.jpg', description: 'Procedimento estético de peeling de carbono.' },
  { category: 'Clareamento', name: 'Clareamento de Pele', duration: 40, price: 380, image: 'clareamento.jpg', description: 'Protocolo estético de clareamento mediante avaliação individual.' },
  { category: 'Criolipólise', name: 'Criolipólise', duration: 45, price: 650, image: 'criolipolise.jpg', description: 'Tratamento estético de criolipólise mediante avaliação prévia.' },
  { category: 'Enzimas', name: 'Enzimas', duration: 30, price: 280, image: 'enzimas.jpg', description: 'Procedimento de aplicação conforme avaliação profissional.' },
  { category: 'Lipocavitação', name: 'Lipocavitação', duration: 45, price: 500, image: 'lipocavitacao.jpg', description: 'Protocolo estético de lipocavitação.' },
] as const;

const variations = [
  { procedure: 'Depilação a Laser', kind: 'AREA', groupName: 'Face', name: 'Buço', reference: null, price: 70 },
  { procedure: 'Depilação a Laser', kind: 'AREA', groupName: 'Corpo', name: 'Axilas', reference: null, price: 90 },
  { procedure: 'Depilação a Laser', kind: 'AREA', groupName: 'Corpo', name: 'Perna inteira', reference: null, price: 300 },
  { procedure: 'Remoção de Tatuagem', kind: 'SIZE', groupName: 'Tamanho', name: 'PP', reference: 'até 3 cm', price: 150 },
  { procedure: 'Remoção de Tatuagem', kind: 'SIZE', groupName: 'Tamanho', name: 'P', reference: '3–7 cm', price: 220 },
  { procedure: 'Remoção de Tatuagem', kind: 'SIZE', groupName: 'Tamanho', name: 'M', reference: '7–12 cm', price: 300 },
  { procedure: 'Botox', kind: 'OTHER', groupName: 'Áreas', name: '1 área', reference: null, price: 690 },
  { procedure: 'Botox', kind: 'OTHER', groupName: 'Áreas', name: '2 áreas', reference: null, price: 890 },
  { procedure: 'Botox', kind: 'OTHER', groupName: 'Áreas', name: '3 áreas', reference: null, price: 1090 },
] as const;

const professionals = [
  { name: 'Dra. Camila Rocha', phone: '82990000011', email: 'camila.demo@example.test', color: '#66705B' },
  { name: 'Carolina Reis', phone: '82990000012', email: 'carolina.demo@example.test', color: '#88707A' },
  { name: 'Dr. Marcos Lima', phone: '82990000013', email: 'marcos.demo@example.test', color: '#876444' },
];

const customers: {name:string;phone:string;source:AcquisitionSource;daysAgo:number}[] = [
  { name: 'Mariana Alves', phone: '82990001001', source: 'INDICACAO', daysAgo: 1 },
  { name: 'Juliana Prado', phone: '82990001002', source: 'INDICACAO', daysAgo: 4 },
  { name: 'Fernanda Souza', phone: '82990001003', source: 'INSTAGRAM', daysAgo: 7 },
  { name: 'Patrícia Lima', phone: '82990001004', source: 'WHATSAPP', daysAgo: 2 },
  { name: 'Beatriz Nogueira', phone: '82990001005', source: 'INSTAGRAM', daysAgo: 8 },
  { name: 'Camila Duarte', phone: '82990001006', source: 'GOOGLE', daysAgo: 12 },
  { name: 'Larissa Mendes', phone: '82990001007', source: 'WHATSAPP', daysAgo: 5 },
  { name: 'Renata Costa', phone: '82990001008', source: 'GOOGLE', daysAgo: 3 },
  { name: 'Vanessa Ramos', phone: '82990001009', source: 'OUTRO', daysAgo: 10 },
  { name: 'Aline Ferreira', phone: '82990001010', source: 'INDICACAO', daysAgo: 15 },
  { name: 'Débora Martins', phone: '82990001011', source: 'INSTAGRAM', daysAgo: 18 },
  { name: 'Carla Pereira', phone: '82990001012', source: 'WHATSAPP', daysAgo: 20 },
];

function localDay(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86400000 - 3 * 3600000);
  return now.toISOString().slice(0, 10);
}
function localDate(offsetDays:number,hour:number,minute=0):Date {
  return new Date(`${localDay(offsetDays)}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00-03:00`);
}
function fromLocalDay(dayOffset:number):Date {return new Date(`${localDay(dayOffset)}T12:00:00-03:00`);}
function deterministicImageName(name:string): string {
  const hex = createHash('sha256').update(`agenda-clinica-catalog:${name}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}.jpg`;
}
async function ensureImage(procedureName:string,originalFile:string):Promise<string>{
  await mkdir(UPLOADS,{recursive:true});
  const filename=deterministicImageName(procedureName);
  const target=resolve(UPLOADS,filename);
  const source=resolve(ASSETS,originalFile);
  await stat(source); // Falha claramente se o ZIP foi extraído sem as imagens.
  await copyFile(source,target);
  return `/uploads/procedure/${filename}`;
}

async function seedUsers(professionalIds:Map<string,number>) {
  const email=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
  const password=process.env.ADMIN_PASSWORD||'';
  if(!email || !email.includes('@') || password.length<PASSWORD_LENGTH) {
    throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD (12+ caracteres) em backend/.env antes de popular o banco.');
  }
  const adminName=(process.env.ADMIN_NAME||'Administrador').trim();
  // ATUALIZA passwordHash sempre. O seed anterior usava update:{} e deixava a senha antiga!
  await db.user.upsert({
    where:{email},
    create:{email,name:adminName,passwordHash:hashPassword(password),role:'ADMIN'},
    update:{name:adminName,passwordHash:hashPassword(password),role:'ADMIN'}
  });
  const demoEmail=(process.env.DEMO_EMPLOYEE_EMAIL||'carolina.demo@clinica.local').trim().toLowerCase();
  if(demoEmail===email)throw new Error('DEMO_EMPLOYEE_EMAIL deve ser diferente de ADMIN_EMAIL');
  const demoPassword=process.env.DEMO_EMPLOYEE_PASSWORD||randomBytes(12).toString('base64url');
  if(demoPassword.length<PASSWORD_LENGTH)throw new Error('DEMO_EMPLOYEE_PASSWORD precisa ter pelo menos 12 caracteres');
  let professionalId=professionalIds.get('Carolina Reis');
  if(!professionalId)throw new Error('Profissional demo não encontrada');
  const conflicting=await db.user.findFirst({where:{professionalId,email:{not:demoEmail}}});
  if(conflicting) {
    // Não rouba o vínculo de um profissional já associado a outro login.
    const fallbackName='Profissional de Demonstração';
    const fallback=await db.professional.findFirst({where:{name:fallbackName}})
      ||await db.professional.create({data:{name:fallbackName,color:'#2563eb',active:true}});
    const fallbackOwner=await db.user.findFirst({where:{professionalId:fallback.id,email:{not:demoEmail}}});
    if(fallbackOwner)throw new Error('Profissional de demonstração também está associado a outro login');
    professionalId=fallback.id;
    console.log('Carolina Reis já possui outro login; usando profissional de demonstração para proteger os dados existentes.');
  }
  const employeeExisting=await db.user.findUnique({where:{email:demoEmail}});
  if(employeeExisting && (employeeExisting.role==='ADMIN' || (employeeExisting.professionalId!==null && employeeExisting.professionalId!==professionalId))) {
    throw new Error('DEMO_EMPLOYEE_EMAIL está sendo usado por outra conta. Escolha um email de demonstração diferente.');
  }
  await db.user.upsert({
    where:{email:demoEmail},
    create:{name:'Carolina Reis',email:demoEmail,passwordHash:hashPassword(demoPassword),role:'FUNCIONARIO',professionalId},
    update:{name:'Carolina Reis',passwordHash:hashPassword(demoPassword),role:'FUNCIONARIO',professionalId}
  });
  console.log(`\nAdministrador: ${email} / senha = ADMIN_PASSWORD em backend/.env`);
  console.log(`Funcionária demo: ${demoEmail} / senha = ${process.env.DEMO_EMPLOYEE_PASSWORD?'DEMO_EMPLOYEE_PASSWORD em backend/.env':demoPassword}`);
  console.log('AVISO: se a senha de funcionário foi gerada, guarde-a agora; será alterada no próximo seed.');
}

async function seedCatalog(){
  const categoryIds=new Map<string,number>();
  const procedureIds=new Map<string,number>();
  for(const item of catalog){
    const category=await db.procedureCategory.upsert({where:{name:item.category},create:{name:item.category},update:{}});
    categoryIds.set(item.category,category.id);
    const existing=await db.procedure.findFirst({where:{name:item.name,categoryId:category.id}});
    const coverImageUrl=await ensureImage(item.name,item.image);
    const technology='technology' in item?item.technology:'GENERAL';
    const requiresEquipment=technology!=='GENERAL';
    const procedure= existing || await db.procedure.create({data:{categoryId:category.id,name:item.name,description:item.description,durationMinutes:item.duration,price:item.price,active:!requiresEquipment,technology,requiresEquipment,coverImageUrl,detailImageUrl:coverImageUrl}});
    if(existing && (!existing.coverImageUrl || !existing.detailImageUrl)){
      await db.procedure.update({where:{id:existing.id},data:{...(!existing.coverImageUrl?{coverImageUrl}:{}),...(!existing.detailImageUrl?{detailImageUrl:coverImageUrl}:{})}});
    }
    procedureIds.set(item.name,procedure.id);
  }
  const aval=await db.procedureCategory.upsert({where:{name:'Avaliações'},create:{name:'Avaliações'},update:{}});
  const exists=await db.procedure.findFirst({where:{name:'Avaliação gratuita',categoryId:aval.id}});
  if(!exists)await db.procedure.create({data:{categoryId:aval.id,name:'Avaliação gratuita',description:'Agendamento gratuito de avaliação presencial',durationMinutes:30,price:0,active:true}});
  for(const [i,v] of variations.entries()){
    const procedureId=procedureIds.get(v.procedure);
    if(!procedureId)throw new Error('Procedimento não encontrado: '+v.procedure);
    const existing=await db.procedureVariation.findFirst({where:{procedureId,name:v.name,groupName:v.groupName}});
    if(!existing)await db.procedureVariation.create({data:{procedureId,kind:v.kind,groupName:v.groupName,name:v.name,reference:v.reference,price:v.price,active:true,sortOrder:i}});
  }
  return {categoryIds,procedureIds};
}

async function seedProfessionals(){
  const ids=new Map<string,number>();
  for(const p of professionals){
    const existing=await db.professional.findFirst({where:{name:p.name}});
    const created=existing||await db.professional.create({data:{...p,active:true}});
    ids.set(p.name,created.id);
  }
  return ids;
}

async function seedCustomers(){
  const ids=new Map<string,number>();
  for(const c of customers){
    const existing=await db.customer.findFirst({where:{phone:c.phone}});
    if(existing && existing.name!==c.name)throw new Error(`Telefone fictício ${c.phone} já está cadastrado com outro nome. Não reutilizar dados reais.`);
    const saved=existing||await db.customer.create({data:{name:c.name,phone:c.phone,email:null,acquisitionSource:c.source,createdAt:fromLocalDay(-c.daysAgo)}});
    ids.set(c.name,saved.id);
  }
  return ids;
}

async function seedAgenda(customerIds:Map<string,number>,professionalIds:Map<string,number>,procedureIds:Map<string,number>){
  const rows:{customer:string;professional:string;procedure:string;day:number;hour:number;minute:number;status:AppointmentStatus}[]=[
    {customer:'Mariana Alves',professional:'Dra. Camila Rocha',procedure:'Botox',day:0,hour:9,minute:0,status:'COMPLETED'},
    {customer:'Juliana Prado',professional:'Carolina Reis',procedure:'Peeling de Carbono',day:0,hour:9,minute:30,status:'COMPLETED'},
    {customer:'Fernanda Souza',professional:'Dra. Camila Rocha',procedure:'Preenchimento',day:0,hour:11,minute:0,status:'CONFIRMED'},
    {customer:'Beatriz Nogueira',professional:'Dr. Marcos Lima',procedure:'Ultrassom Microfocado',day:0,hour:14,minute:0,status:'CONFIRMED'},
    {customer:'Patrícia Lima',professional:'Carolina Reis',procedure:'Lipocavitação',day:0,hour:14,minute:0,status:'CONFIRMED'},
    {customer:'Larissa Mendes',professional:'Carolina Reis',procedure:'Criolipólise',day:0,hour:15,minute:30,status:'SCHEDULED'},
    {customer:'Camila Duarte',professional:'Dra. Camila Rocha',procedure:'Enzimas',day:0,hour:15,minute:30,status:'SCHEDULED'},
    {customer:'Vanessa Ramos',professional:'Dra. Camila Rocha',procedure:'Depilação a Laser',day:1,hour:9,minute:0,status:'SCHEDULED'},
    {customer:'Débora Martins',professional:'Dr. Marcos Lima',procedure:'Botox',day:1,hour:10,minute:0,status:'SCHEDULED'},
    {customer:'Aline Ferreira',professional:'Dra. Camila Rocha',procedure:'Peeling de Carbono',day:2,hour:9,minute:30,status:'SCHEDULED'},
    {customer:'Carla Pereira',professional:'Dr. Marcos Lima',procedure:'Criolipólise',day:2,hour:10,minute:30,status:'CONFIRMED'},
    {customer:'Renata Costa',professional:'Dr. Marcos Lima',procedure:'Clareamento de Pele',day:-1,hour:10,minute:0,status:'COMPLETED'},
  ];
  const durations=new Map<string,number>(catalog.map(c=>[c.name,c.duration]));
  for(const row of rows){
    const customerId=customerIds.get(row.customer)!, professionalId=professionalIds.get(row.professional)!, procedureId=procedureIds.get(row.procedure)!;
    const priorDemo=await db.appointment.findFirst({where:{customerId,professionalId,procedureId}});
    if(priorDemo)continue;
    const start=localDate(row.day,row.hour,row.minute);
    const endsAt=new Date(start.getTime()+(durations.get(row.procedure)||30)*60000);
    // Nunca cria conflito com agendamentos preexistentes do mesmo profissional.
    const conflict=await db.appointment.findFirst({where:{professionalId,startsAt:{lt:endsAt},endsAt:{gt:start},status:{in:['SCHEDULED','CONFIRMED','COMPLETED']}}});
    const block=await db.agendaBlock.findFirst({where:{professionalId,startsAt:{lt:endsAt},endsAt:{gt:start}}});
    if(conflict||block){console.log(`Pulando horário ocupado: ${row.professional}, ${row.customer}`);continue;}
    await db.appointment.create({data:{customerId,professionalId,procedureId,startsAt:start,endsAt,status:row.status}});
  }
}

async function seedStock(procedureIds:Map<string,number>){
  const rows=[
    {name:'Luvas descartáveis',unit:'un',quantity:250,min:50},
    {name:'Algodão',unit:'g',quantity:600,min:200},
    {name:'Gaze estéril',unit:'un',quantity:18,min:30},
    {name:'Gel condutor',unit:'ml',quantity:900,min:150},
    {name:'Máscara descartável',unit:'un',quantity:85,min:30},
    {name:'Seringa estéril',unit:'un',quantity:80,min:20},
  ];
  const ids=new Map<string,number>();
  for(const item of rows){
    const existing=await db.stockItem.findFirst({where:{name:item.name}});
    const record=existing||await db.stockItem.create({data:{name:item.name,unit:item.unit,quantity:item.quantity,minQuantity:item.min,active:true,movements:{create:{type:'IN',quantityDelta:item.quantity,note:'Carga inicial de demonstração'}}}});
    ids.set(item.name,record.id);
  }
  const relations=[
    {procedure:'Botox',stock:'Luvas descartáveis',quantity:2},
    {procedure:'Botox',stock:'Seringa estéril',quantity:1},
    {procedure:'Ultrassom Microfocado',stock:'Gel condutor',quantity:30},
    {procedure:'Peeling de Carbono',stock:'Gaze estéril',quantity:2},
  ];
  for(const rel of relations){
    const procedureId=procedureIds.get(rel.procedure)!,stockItemId=ids.get(rel.stock)!;
    await db.procedureMaterial.upsert({where:{procedureId_stockItemId:{procedureId,stockItemId}},create:{procedureId,stockItemId,quantity:rel.quantity},update:{}});
  }
}

async function seedSales(customerIds:Map<string,number>,professionalIds:Map<string,number>,procedureIds:Map<string,number>){
  const examples=[
    {customer:'Mariana Alves',professional:'Dra. Camila Rocha',procedure:'Botox',amount:690,discount:0,payment:690,method:'PIX' as const,day:0},
    {customer:'Juliana Prado',professional:'Carolina Reis',procedure:'Peeling de Carbono',amount:350,discount:0,payment:350,method:'CASH' as const,day:0},
    {customer:'Fernanda Souza',professional:'Dra. Camila Rocha',procedure:'Preenchimento',amount:1800,discount:100,payment:850,method:'CARD' as const,day:0},
    {customer:'Beatriz Nogueira',professional:'Dr. Marcos Lima',procedure:'Ultrassom Microfocado',amount:900,discount:0,payment:0,method:'PIX' as const,day:0},
    {customer:'Patrícia Lima',professional:'Carolina Reis',procedure:'Lipocavitação',amount:500,discount:0,payment:500,method:'PIX' as const,day:-3},
  ];
  for(const row of examples){
    const customerId=customerIds.get(row.customer)!,professionalId=professionalIds.get(row.professional)!,procedureId=procedureIds.get(row.procedure)!;
    const prior=await db.sale.findFirst({where:{customerId,items:{some:{procedureId}}}});
    if(prior)continue;
    const createdAt=localDate(row.day,14,0);
    await db.sale.create({data:{customerId,professionalId,discount:row.discount,createdAt,items:{create:{procedureId,description:row.procedure,sessions:1,unitPrice:row.amount,finalPrice:row.amount}},payments:row.payment?{create:{amount:row.payment,method:row.method,paidAt:createdAt,installments:null}}:undefined}});
  }
}

async function seedExpenses(){
  const rows=[
    {description:'Demonstração — Compra de insumos',category:'INSUMOS' as const,amount:850,day:0,paid:true,method:'PIX' as const},
    {description:'Demonstração — Divulgação nas redes',category:'MARKETING' as const,amount:300,day:-1,paid:true,method:'CARD' as const},
    {description:'Demonstração — Manutenção de aparelho',category:'EQUIPAMENTOS_MANUTENCAO' as const,amount:650,day:7,paid:false,method:null},
    {description:'Demonstração — Aluguel da clínica',category:'ALUGUEL_ESTRUTURA' as const,amount:3200,day:10,paid:false,method:null},
  ];
  for(const row of rows){
    if(await db.expense.findFirst({where:{description:row.description}}))continue;
    await db.expense.create({data:{description:row.description,category:row.category,amount:row.amount,dueDate:fromLocalDay(row.day),paid:row.paid,paidAt:row.paid?fromLocalDay(row.day):null,method:row.method,recurrence:'ONCE'}});
  }
}

async function seedLeads(categoryIds:Map<string,number>){
  const rows=[
    {name:'Patrícia Nunes',phone:'82990002001',category:'Botox',message:'Gostaria de informações sobre aplicação de Botox.',status:'NEW' as const},
    {name:'Renata Souza',phone:'82990002002',category:'Depilação a laser',message:'Tenho interesse em depilação a laser.',status:'NEW' as const},
    {name:'Juliana Araújo',phone:'82990002003',category:'Criolipólise',message:'Gostaria de saber valores.',status:'CONTACTED' as const},
  ];
  for(const r of rows){
    if(await db.lead.findFirst({where:{phone:r.phone}}))continue;
    await db.lead.create({data:{name:r.name,phone:r.phone,procedureCategoryId:categoryIds.get(r.category)??null,message:r.message,status:r.status}});
  }
}

async function main(){
  assertDemoSeedAllowed(process.argv,process.env.NODE_ENV);
  const env=process.env.NODE_ENV||'development';
  if(env==='production')throw new Error('Este seed contém DADOS FICTÍCIOS e é proibido em NODE_ENV=production.');
  const professionalIds=await seedProfessionals();
  await seedUsers(professionalIds);
  const {categoryIds,procedureIds}=await seedCatalog();
  const customerIds=await seedCustomers();
  await seedAgenda(customerIds,professionalIds,procedureIds);
  await seedStock(procedureIds);
  await seedSales(customerIds,professionalIds,procedureIds);
  await seedExpenses();
  await seedLeads(categoryIds);
  const counts=await Promise.all([
    db.user.count(),db.professional.count(),db.procedureCategory.count(),db.procedure.count(),db.procedureVariation.count(),db.customer.count(),db.appointment.count(),db.stockItem.count(),db.sale.count(),db.expense.count(),db.lead.count()
  ]);
  console.log('\nSEED DA AGENDA CLÍNICA CONCLUÍDO (dados fictícios, sem limpar tabelas)');
  console.log('users/profissionais/categorias/procedimentos/variacoes/clientes/agendamentos/estoque/vendas/despesas/leads:');
  console.log(counts.join(' / '));
  console.log('Catálogo: http://localhost:3333/api/v1/public/catalog');
  console.log('Frontend: http://localhost:5199/login');
}
main().catch(error=>{console.error('Falha no seed:',error);process.exitCode=1;}).finally(async()=>{await db.$disconnect();});
