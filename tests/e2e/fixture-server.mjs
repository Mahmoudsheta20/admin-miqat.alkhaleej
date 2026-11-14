// Isolated browser-test backend. Never imports application secrets or connects to a database.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const day = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const id='11111111-1111-4111-8111-111111111111';
const admin={id:'admin-fixture',name:'Fixture Administrator',email:'miqatalkhaleej@gmail.com',role:'ADMIN',active:true,mustChangePassword:false,isSuperAdmin:true,permissions:null};
const financePerms={customers:{view:true},invoices:{view:true,write:true,delete:true},purchases:{view:true,write:true,delete:true},accounting:{view:true,write:true,approve:true},accounts:{view:true,write:true},vatReturns:{view:true,write:true},companySettings:{view:true,write:true},zatca:{view:true,write:true,approve:true}};
const financeAdmin={id:'admin-finance-fixture',name:'Finance Accountant',email:'finance@example.test',role:'ADMIN',active:true,mustChangePassword:false,phone:'+966501112233',isSuperAdmin:false,permissions:financePerms};
let fixtureAdmins=[admin,financeAdmin];
const captain={id,name:'Fixture Captain',email:'captain@example.test',role:'CAPTAIN',active:true,mustChangePassword:false,phone:'0551234567',nationalId:'1234567890',licenseNumber:'FIX-001',licenseExpiry:'2028-12-31',assignedVehiclePlate:'أ ب ج 1234',hasTodayInspection:true,contractCount:1};
const vehicle={id,plateNumberAr:'أ ب ج 1234',plateNumberEn:'ABC 1234',make:'Toyota',model:'Hiace',category:'VAN',year:2025,capacity:12,status:'AVAILABLE',registrationExpiry:'2028-12-31',insuranceExpiry:'2028-12-31'};
const checks=Object.fromEntries(['fuelGauge','tempGauge','oilPressure','checkEngine','absLight','warningLights','tires','headlights','signals','mirrors','noLeaks','fireExtinguisher','warningTriangle','firstAidKit','glassHammer','seatBelts'].map(key=>[key,true]));
const inspection={id,captainId:id,captainName:captain.name,captainPhone:captain.phone,vehiclePlate:vehicle.plateNumberAr,inspectionDate:`${day}T09:00:00+03:00`,createdAt:new Date().toISOString(),...checks,driverDeclared:true,contractCount:1};
const contract={id,referenceNumber:'MQ-FIXTURE-001',customerName:'Fixture Guest',customerPhone:'0551234567',operationType:'AIRPORT_TRANSFER',origin:'جدة',destination:'مكة المكرمة',tripDate:day,tripTime:'12:00',captainId:id,captain,vehiclePlate:vehicle.plateNumberAr,issueDate:day,inspectionId:id,inspection,passengers:[{id,name:'Fixture Passenger',nationality:'SA',idNumber:'1234567890'}],status:'APPROVED',createdAt:new Date().toISOString()};
const company={legalName:'شركة الاختبار — بيانات تجريبية',vatNumber:'310000000000003',commercialRegistration:'1010000000',address:{street:'Test street',building:'1234',district:'Test district',city:'Jeddah',postalCode:'12345',country:'SA'},presentation:{englishName:'Fixture Transport',website:'https://example.test',showSeal:false}};
const invoice={id,invoiceNumber:'TAX-000001',customerName:'Fixture Customer',netAmount:'100.00',vatAmount:'15.00',totalAmount:'115.00',invoiceDate:`${day}T09:00:00+03:00`,createdAt:new Date().toISOString(),status:'SAVED',documentType:'TAX',taxDocument:{kind:'INVOICE',profile:'SIMPLIFIED',supplyDate:day},contractId:id,verificationUrl:`http://127.0.0.1:3419/verify/invoice/${id}`,snapshot:{issuer:company,input:{documentType:'TAX',invoiceDate:`${day}T09:00:00+03:00`,buyer:{name:'Fixture Customer'},taxDocument:{kind:'INVOICE',profile:'SIMPLIFIED',supplyDate:day},paymentCode:'30',accountingApproved:true,lines:[{code:'TRP',description:'Fixture trip',quantity:'1',unitPrice:'100',discount:'0',category:'S',rate:'15',component:'OWN_SUPPLY',taxReviewed:true}],transport:{}},totals:{net:'100.00',vat:'15.00',gross:'115.00'}}};
const customer={id,type:'INDIVIDUAL',name:'Fixture Customer',phone:'0551234567',email:'customer@example.test',vatRegistered:false,active:true,version:1};
const member={id,captainId:id,name:captain.name,kind:'DRIVER',isRepresentative:false,active:true,version:1};
const financial={range:{start:`${day.slice(0,4)}-01-01`,endInclusive:day},profit:{revenue:'100.00',expenses:'20.00',beforeTax:'80.00',taxExpense:'0.00',afterTax:'80.00'},trial:[],totals:{debit:'100.00',credit:'100.00',closingDebit:'100.00',closingCredit:'100.00'},vehicles:[],unpostedInvoices:[],entries:[],generatedAt:new Date().toISOString()};
let vehicles=[vehicle],contracts=[contract],inspections=[inspection],customers=[customer],invoices=[invoice],payments=[];
const defaultCaptainButtons=[
 {id:'confirm_receipt',emoji:'👍',code:'1',labelAr:'تأكيد استلام العقد',labelEn:'Confirm Receipt',replyTextAr:'تم تسجيل تأكيد استلام العقد وإشعار الإدارة',adminNoticeTitleAr:'أكد الكابتن استلام العقد',targetStatus:'ACKNOWLEDGED',enabled:true},
 {id:'captain_arrived',emoji:'📍',code:'2',labelAr:'وصلت لموقع العميل',labelEn:'Arrived at Pickup',replyTextAr:'تم تسجيل وصولك لموقع العميل بنجاح',adminNoticeTitleAr:'وصل الكابتن لموقع العميل',targetStatus:'ARRIVED',enabled:true},
 {id:'trip_started',emoji:'🚐',code:'3',labelAr:'بدأت الرحلة',labelEn:'Trip Started',replyTextAr:'تم تسجيل انطلاق الرحلة',adminNoticeTitleAr:'انطلقت الرحلة',targetStatus:'STARTED',enabled:true},
 {id:'trip_completed',emoji:'✅',code:'4',labelAr:'تم إتمام الرحلة',labelEn:'Trip Completed',replyTextAr:'تم إغلاق الرحلة بنجاح',adminNoticeTitleAr:'أتم الكابتن الرحلة بنجاح',targetStatus:'COMPLETED',enabled:true},
 {id:'need_support',emoji:'🆘',code:'5',labelAr:'طلب مساعدة عاجلة',labelEn:'Request Support',replyTextAr:'تم إرسال تنبيه عاجل للإدارة',adminNoticeTitleAr:'طلب مساعدة عاجلة من الكابتن',targetStatus:'SUPPORT_NEEDED',enabled:true},
];
const defaultAdminActionButtons=[
 {id:'admin_ack',code:'A1',labelAr:'تأكيد استلام الإشعار',labelEn:'Acknowledge Alert',captainMessageTemplateAr:'استلمت الإدارة التحديث — بالتوفيق',enabled:true},
 {id:'admin_contact_captain',code:'A2',labelAr:'التواصل مع الكابتن فوراً',labelEn:'Call Captain Now',captainMessageTemplateAr:'ستتواصل معك الإدارة الآن بخصوص العقد',enabled:true},
 {id:'admin_close_flow',code:'A3',labelAr:'إغلاق التدفق',labelEn:'Close Flow',captainMessageTemplateAr:'تم إغلاق متابعة التدفق من الإدارة',nextStatus:'CLOSED',enabled:true},
];
const nowIso=new Date().toISOString();
const waFixtureFlow={
 config:{
  enabled:true,
  adminPhone:'+966577842926',
  notifyOnContractSent:true,
  notifyOnInvoiceSent:true,
  notifyOnCaptainAction:true,
  autoReplyToCaptain:true,
  includeActionMenuOnContract:true,
  includeAdminActionButtons:true,
  interactiveMode:'reactions_and_links',
  autoSendContractDefault:false,
  autoSendInvoiceDefault:false,
  captainButtons:defaultCaptainButtons,
  adminActionButtons:defaultAdminActionButtons,
 },
 sessions:[{
  id:'flow_sess_fixture_1',
  contractId:id,
  referenceNumber:contract.referenceNumber,
  captainId:id,
  captainName:captain.name,
  captainPhone:captain.phone,
  customerName:contract.customerName,
  origin:contract.origin,
  destination:contract.destination,
  tripDate:contract.tripDate,
  tripTime:contract.tripTime,
  vehiclePlate:contract.vehiclePlate,
  status:'SENT',
  lastActionId:'contract_sent',
  lastActionLabel:'تم إرسال العقد للكابتن',
  lastActionAt:nowIso,
  createdAt:nowIso,
  updatedAt:nowIso,
 }],
 events:[{
  id:'flow_evt_fixture_1',
  sessionId:'flow_sess_fixture_1',
  entityType:'CONTRACT',
  entityId:id,
  referenceNumber:contract.referenceNumber,
  type:'CONTRACT_SENT',
  actorRole:'SYSTEM',
  actorPhone:captain.phone,
  label:'إرسال عقد للكابتن',
  summary:`تم إرسال العقد ${contract.referenceNumber} للكابتن وتنبيه ${'+966577842926'}`,
  timestamp:nowIso,
 }],
};
function flowOverview(){
 const activeSessions=waFixtureFlow.sessions.filter(s=>!['COMPLETED','CLOSED'].includes(s.status)).length;
 const arrivedSessions=waFixtureFlow.sessions.filter(s=>s.status==='ARRIVED').length;
 return {success:true,config:waFixtureFlow.config,sessions:waFixtureFlow.sessions,events:waFixtureFlow.events,stats:{activeSessions,arrivedSessions,totalEvents:waFixtureFlow.events.length}};
}
function minimalPdf(){const objects=['<</Type /Catalog /Pages 2 0 R>>','<</Type /Pages /Kids [3 0 R] /Count 1>>','<</Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>>','<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>','<</Length 48>>\nstream\nBT /F1 14 Tf 20 100 Td (Fixture document) Tj ET\nendstream'];let s='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(s));s+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=Buffer.byteLength(s);s+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer <</Root 1 0 R /Size 6>>\nstartxref\n${xref}\n%%EOF`;return s;}
const fixtureQrDataUrl='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jI2YAAAAASUVORK5CYII=';
let waFixtureState={status:'qr_ready',qrImage:fixtureQrDataUrl,queueLength:0,recovery:{failedQueueJobs:0,pendingDriverReplies:0,pausedContracts:0}};
const waFixtureTrips=[{
 id:'11111111-1111-4111-8111-111111111111',
 contractId:id,
 tripId:id,
 driverName:captain.name,
 driverPhone:captain.phone,
 status:'ASSIGNED',
 scheduledAt:`${day}T12:00:00+03:00`,
 updatedAt:nowIso,
 arrivedAt:null,
 completedAt:null,
 lateAlerted:false,
 pollDispatch:'PENDING',
 masterDispatch:'PENDING',
 contract:{referenceNumber:contract.referenceNumber,origin:contract.origin,destination:contract.destination},
}];
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),path=url.pathname.replace(/^\/api/,'');let body={};
 for await(const chunk of req){body.raw=(body.raw||'')+chunk;}try{body=JSON.parse(body.raw||'{}');}catch{body={};}
 const json=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({success:status<400,...(status<400?{data}:{error:typeof data==='string'?data:'Fixture error'})}));};
 const rawJson=(payload,status=200)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(payload));};
 if(path==='/health')return json({status:'ok'});
 if(path==='/auth/login'){
  if(body.password!=='fixture-password')return json('بيانات الدخول غير صحيحة',401);
  const email=String(body.email||'').trim().toLowerCase();
  const role=email==='captain@example.test'?'CAPTAIN':'ADMIN',temporary=email==='temporary@example.test';
  const matchedAdmin=fixtureAdmins.find(a=>a.email.toLowerCase()===email);
  const loginAdmin=(matchedAdmin&&!matchedAdmin.isSuperAdmin)?matchedAdmin:admin;
  const tokenVal=temporary?'fixture-temporary':role==='CAPTAIN'?'fixture-CAPTAIN':loginAdmin.isSuperAdmin?'fixture-ADMIN':`fixture-ADMIN:${loginAdmin.id}`;
  res.setHeader('set-cookie',`miqat_token=${tokenVal}; Path=/; HttpOnly; SameSite=Lax${body.rememberMe?'; Max-Age=3600':''}`);
  return json({user:{...(role==='ADMIN'?loginAdmin:captain),mustChangePassword:temporary},mustChangePassword:temporary});
 }
 if(path==='/auth/logout'){res.setHeader('set-cookie','miqat_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');return json({});}
 if(['/auth/forgot-password','/auth/verify-reset-token','/auth/reset-password'].includes(path))return json({valid:true,message:'تم تنفيذ الطلب'});
 const cookie=req.headers.cookie||'',role=cookie.includes('fixture-CAPTAIN')?'CAPTAIN':cookie.includes('fixture-ADMIN')?'ADMIN':null;
 const adminIdMatch=cookie.match(/fixture-ADMIN:([^;\s]+)/);
 const currentAdmin=(adminIdMatch&&fixtureAdmins.find(a=>a.id===adminIdMatch[1]))||admin;
 const hasPerm=(mod,act='view')=>{
  if(role!=='ADMIN')return false;
  if(currentAdmin.isSuperAdmin||!currentAdmin.permissions)return true;
  const entry=currentAdmin.permissions[mod];
  if(!entry)return false;
  if(entry[act]===true)return true;
  return act==='view'&&Boolean(entry.write||entry.delete||entry.approve);
 };
 if(path==='/auth/complete-password-change'&&cookie.includes('fixture-temporary')){res.setHeader('set-cookie','miqat_token=fixture-ADMIN; Path=/; HttpOnly; SameSite=Lax');return json({user:admin});}
 if(path==='/contracts/verify/MQ-FIXTURE-001')return json({referenceNumber:contract.referenceNumber,status:'APPROVED',issueDate:day});
 if(path===`/inspections/verify/${id}`)return json({id,inspectionDate:inspection.inspectionDate,driverDeclared:true});
 if(path===`/invoices/verify/${id}`||path===`/invoices/public/${id}`)return json({invoiceNumber:'TAX-000001',invoiceDate:invoice.invoiceDate,companyName:company.legalName,currency:'SAR',totals:invoice.snapshot.totals,documentType:'TAX',taxDocument:invoice.taxDocument});
 if(!role)return json('يرجى تسجيل الدخول',401);
 if(path==='/auth/session')return json(role==='ADMIN'?currentAdmin:captain);
 if(path==='/auth/change-password'||path==='/auth/profile')return json(role==='ADMIN'?currentAdmin:captain);
 if(role==='CAPTAIN'&&['/admins','/dashboard/stats','/accounting/financial-report','/invoices'].includes(path))return json('غير مصرح',403);
 if(role==='ADMIN'&&!currentAdmin.isSuperAdmin){
  if(path==='/admins'||path.startsWith('/admins/'))return json('محصور بالمدير العام الأساسي',403);
  if(path==='/dashboard/stats'&&!hasPerm('dashboard','view'))return json('ليس لديك صلاحية لوحة التحكم',403);
  if((path==='/contracts'||path.startsWith('/contracts/'))&&!hasPerm('contracts',req.method==='GET'?'view':'write'))return json('ليس لديك صلاحية العقود',403);
  const canWhatsApp=()=>{
   if(path==='/whatsapp/status')return hasPerm('whatsapp','view')||hasPerm('contracts','write')||hasPerm('invoices','write')||hasPerm('inspections','write');
   if(path==='/whatsapp/send-contract')return hasPerm('whatsapp','write')||hasPerm('contracts','write');
   if(path==='/whatsapp/send-invoice')return hasPerm('whatsapp','write')||hasPerm('invoices','write');
   if(path==='/whatsapp/send-inspection')return hasPerm('whatsapp','write')||hasPerm('inspections','write');
   return hasPerm('whatsapp',req.method==='GET'?'view':'write');
  };
  if(path.startsWith('/whatsapp')&&!canWhatsApp())return rawJson({success:false,error:'ليس لديك صلاحية الواتساب'},403);
 }
 if(path.endsWith('/pdf')||path.endsWith('/receipt')){res.writeHead(200,{'content-type':'application/pdf','content-disposition':'inline; filename="fixture.pdf"'});return res.end(minimalPdf());}
 if(path.endsWith('qr.png')){res.writeHead(200,{'content-type':'image/png'});return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jI2YAAAAASUVORK5CYII=','base64'));}
 if(path==='/dashboard/stats')return json({totalCaptains:1,totalVehicles:vehicles.length,activeVehicles:vehicles.length,totalContracts:contracts.length,todayInspections:inspections.length,recentContracts:contracts.map(c=>({...c,captainName:captain.name,passengersCount:1}))});
 if(path==='/fleet'){if(req.method==='POST'){const row={...vehicle,...body,id:randomUUID()};vehicles.push(row);return json(row,201);}return json(vehicles);}
 if(path.startsWith('/fleet/')){const target=path.split('/').at(-1);if(req.method==='DELETE')vehicles=vehicles.filter(v=>v.id!==target);if(req.method==='PUT')vehicles=vehicles.map(v=>v.id===target?{...v,...body}:v);return json(vehicles.find(v=>v.id===target)||{});}
 if(path==='/captains')return json([captain]);
 if(path==='/admins'){
  if(req.method==='POST'){
   const created={id:randomUUID(),name:body.name||'Scoped Admin',email:String(body.email||'').trim().toLowerCase(),phone:body.phone||undefined,role:'ADMIN',active:true,mustChangePassword:true,isSuperAdmin:false,permissions:body.permissions??null};
   fixtureAdmins.push(created);
   return json({admin:created,temporaryPassword:'TempPass#2026!'},201);
  }
  return json({admins:fixtureAdmins,isCallerSuperAdmin:currentAdmin.isSuperAdmin});
 }
 if(path.startsWith('/admins/')){
  const parts=path.split('/').filter(Boolean);const targetId=parts[1];const action=parts[2];
  if(req.method==='PUT'&&action==='permissions'){
   let updated=null;
   fixtureAdmins=fixtureAdmins.map(a=>{if(a.id!==targetId||a.isSuperAdmin)return a;updated={...a,permissions:body.permissions??null};return updated;});
   return updated?json({admin:updated}):json('المسؤول غير موجود',404);
  }
  if(req.method==='PATCH'&&action==='status'){
   let nextActive=false;
   fixtureAdmins=fixtureAdmins.map(a=>{if(a.id!==targetId||a.isSuperAdmin)return a;nextActive=!a.active;return {...a,active:nextActive};});
   return json({active:nextActive});
  }
  if(req.method==='POST'&&action==='reset-password'){
   const target=fixtureAdmins.find(a=>a.id===targetId);
   return target?json({temporaryPassword:'ResetPass#2026!'}):json('المسؤول غير موجود',404);
  }
  if(req.method==='DELETE'&&!action){
   fixtureAdmins=fixtureAdmins.filter(a=>a.id!==targetId||a.isSuperAdmin);
   return json({});
  }
 }
 if(path==='/inspections/today')return json(inspections.at(-1)||null);
 if(path==='/inspections/overview')return json({captains:[{...captain,todayInspection:inspections.at(-1),hasTodayInspection:inspections.length>0,totalInspections:inspections.length}],stats:{totalCaptains:1,inspectedToday:inspections.length?1:0,pendingToday:inspections.length?0:1,totalInspections:inspections.length}});
 if(path==='/inspections'){if(req.method==='POST'){const row={...inspection,...body,id:randomUUID()};inspections.push(row);return json(row,201);}return json(inspections);}
 if(path.startsWith('/inspections/'))return json(inspection);
 if(path==='/contracts'){if(req.method==='POST'){const{autoSendWhatsApp,whatsAppPhone,...contractBody}=body;const row={...contract,...contractBody,id:randomUUID(),status:role==='ADMIN'?'ACTIVE':'PENDING_REVIEW',referenceNumber:`MQ-FIXTURE-${contracts.length+1}`};contracts.push(row);if(autoSendWhatsApp){const ts=new Date().toISOString();const phone=whatsAppPhone||captain.phone;const adminNotified=Boolean(waFixtureFlow.config.enabled&&waFixtureFlow.config.notifyOnContractSent);const session={id:`flow_sess_${contracts.length}`,contractId:row.id,referenceNumber:row.referenceNumber,captainId:row.captainId||captain.id,captainName:captain.name,captainPhone:phone,customerName:row.customerName,origin:row.origin||'',destination:row.destination||'',tripDate:row.tripDate||day,tripTime:row.tripTime||'12:00',vehiclePlate:row.vehiclePlate||'',status:'SENT',lastActionId:'contract_sent',lastActionLabel:'تم إرسال العقد للكابتن',lastActionAt:ts,createdAt:ts,updatedAt:ts};waFixtureFlow.sessions.unshift(session);waFixtureFlow.events.unshift({id:`flow_evt_${randomUUID()}`,sessionId:session.id,entityType:'CONTRACT',entityId:row.id,referenceNumber:row.referenceNumber,type:'CONTRACT_SENT',actorRole:'ADMIN',actorPhone:phone,label:'إرسال تلقائي للعقد',summary:`تم إرسال العقد ${row.referenceNumber} وتنبيه ${waFixtureFlow.config.adminPhone}`,timestamp:ts});row.whatsAppAutoSend={attempted:true,success:true,phone,messageId:`wa_contract_${contracts.length}`,flowSessionId:session.id,interactiveSent:Boolean(waFixtureFlow.config.enabled&&waFixtureFlow.config.includeActionMenuOnContract),adminNotified,adminPhone:adminNotified?waFixtureFlow.config.adminPhone:undefined};}return json(row,201);}return json(contracts);}
 if(path.startsWith('/contracts/')){if(req.method==='PUT')contracts=contracts.map(c=>c.id===path.split('/')[2]?{...c,...body}:c);return json(contracts.find(c=>c.id===path.split('/')[2])||contract);}
 if(path==='/invoices/settings')return json({company});
 if(path==='/invoices'){if(req.method==='POST'){const{autoSendWhatsApp,whatsAppPhone,...invoiceBody}=body;const row={...invoice,...invoiceBody,id:randomUUID()};invoices.push(row);if(autoSendWhatsApp){const ts=new Date().toISOString();const phone=whatsAppPhone||'0551234567';const adminNotified=Boolean(waFixtureFlow.config.enabled&&waFixtureFlow.config.notifyOnInvoiceSent);waFixtureFlow.events.unshift({id:`flow_evt_${randomUUID()}`,entityType:'INVOICE',entityId:row.id,referenceNumber:row.invoiceNumber,type:'INVOICE_SENT',actorRole:'ADMIN',actorPhone:phone,label:'إرسال تلقائي للفاتورة',summary:`تم إرسال الفاتورة ${row.invoiceNumber} وتنبيه ${waFixtureFlow.config.adminPhone}`,timestamp:ts});row.whatsAppAutoSend={attempted:true,success:true,phone,messageId:`wa_invoice_${invoices.length}`,adminNotified,adminPhone:adminNotified?waFixtureFlow.config.adminPhone:undefined};}return json(row,201);}return json({items:invoices,total:invoices.length,page:Number(url.searchParams.get('page')||1)});}
 if(path==='/invoices/contracts')return json({items:contracts});
 if(path.startsWith('/invoices/transport-defaults/')){const targetId=path.split('/')[3];const target=contracts.find(c=>c.id===targetId)||contract;return json({customerName:target.customerName,transport:{serviceType:target.operationType||'AIRPORT_TRANSFER',contractReference:target.referenceNumber,origin:target.origin||'',destination:target.destination||'',tripDate:target.tripDate||day,departureTime:(target.tripTime||'12:00').slice(0,5),contactName:target.customerName,contactPhone:target.customerPhone,vehiclePlate:target.vehiclePlate,distanceUnit:'KM',passengers:target.passengers||[]}});}
 if(path.startsWith('/invoices/'))return json(invoice);
 if(path==='/zatca/settings')return json({issuers:[],egs:[],sdkConfigured:false,productionPermitted:false});
 if(path==='/whatsapp/status')return rawJson({success:true,data:waFixtureState});
 if(path==='/whatsapp/trips'&&req.method==='GET')return json(waFixtureTrips);
 if(path==='/whatsapp/trips/notices'&&req.method==='GET')return json([]);
 if(path.startsWith('/whatsapp/trips/')&&path.endsWith('/assign')&&req.method==='POST'){
  const contractId=path.split('/')[3];
  const trip=waFixtureTrips.find(t=>t.contractId===contractId)||waFixtureTrips[0];
  if(trip){trip.pollDispatch='SENT';trip.masterDispatch='SENT';trip.status='IN_PROGRESS';trip.updatedAt=new Date().toISOString();}
  return json({pollMessageId:'wa_poll_fixture_1',managementDispatched:true});
 }
 if(path==='/whatsapp/qr')return rawJson({success:true,status:waFixtureState.status,qr:waFixtureState.qrImage,qrImage:waFixtureState.qrImage});
 if(path==='/whatsapp/send'&&req.method==='POST')return rawJson({success:true,message:'تمت إضافة الرسالة إلى طابور الإرسال الآمن بنجاح',data:{jobId:'wa_fixture_1',position:1,status:waFixtureState.status}});
 if(path==='/whatsapp/send-contract'&&req.method==='POST'){const targetContract=contracts.find(c=>c.id===body.contractId)||contract;const phone=body.phone||targetContract.captain?.phone||captain.phone;return rawJson({success:true,dispatchKind:'contract_document',messageId:'wa_contract_1',phone,hasPdfAttachment:true,preview:`*شركة ميقات الخليج للنقل البري*\n🚘 *تفاصيل رحلة النقل*\nرقم العقد: *${targetContract.referenceNumber}*\n📎 عقد النقل مرفق بصيغة PDF للاطلاع على التفاصيل.`,message:'تم إرسال العقد عبر الواتساب بنجاح',data:{jobId:'wa_contract_1',position:1,status:waFixtureState.status}});}
 if(path==='/whatsapp/send-invoice'&&req.method==='POST'){const targetInvoice=invoices.find(inv=>inv.id===body.invoiceId)||invoice;const phone=body.phone||customer.phone;return rawJson({success:true,dispatchKind:'invoice_document',messageId:'wa_invoice_1',phone,hasPdfAttachment:true,preview:`*شركة ميقات الخليج للنقل البري*\n🧾 *فاتورة ضريبية مبسطة*\nرقم الفاتورة: *${targetInvoice.invoiceNumber}*\n📎 الفاتورة مرفقة بصيغة PDF للاطلاع على التفاصيل.`,message:'تم إرسال الفاتورة عبر الواتساب بنجاح',data:{jobId:'wa_invoice_1',position:1,status:waFixtureState.status}});}
 if(path==='/whatsapp/send-inspection'&&req.method==='POST'){const targetInspection=inspections.find(item=>item.id===body.inspectionId)||inspection;const phone=body.phone||targetInspection.captainPhone||captain.phone;const shortCode=String(targetInspection.id||id).replace(/-/g,'').slice(0,8).toUpperCase();return rawJson({success:true,dispatchKind:'inspection_document',messageId:'wa_inspection_1',phone,hasPdfAttachment:true,preview:`*شركة ميقات الخليج للنقل البري*\n🛠️ *تقرير الفحص اليومي للمركبة*\nرقم التقرير: *INSP-${shortCode}*\n🚗 لوحة المركبة: ${targetInspection.vehiclePlate||vehicle.plateNumberAr}\n✅ نتيجة الفحص: اجتياز كامل (16/16)\n📎 تقرير الفحص مرفق بصيغة PDF للاطلاع والاحتفاظ بنسخة.`,message:'تم إرسال تقرير الفحص عبر الواتساب بنجاح',data:{jobId:'wa_inspection_1',position:1,status:waFixtureState.status}});}
 if(path==='/whatsapp/flow'&&req.method==='GET'){const overview=flowOverview();return rawJson({...overview,data:overview});}
 if(path==='/whatsapp/flow/config'&&req.method==='PUT'){waFixtureFlow.config={...waFixtureFlow.config,...body,captainButtons:Array.isArray(body.captainButtons)?body.captainButtons:waFixtureFlow.config.captainButtons,adminActionButtons:Array.isArray(body.adminActionButtons)?body.adminActionButtons:waFixtureFlow.config.adminActionButtons};return rawJson({success:true,message:'تم حفظ إعدادات نظام التدفق والأزرار التفاعلية بنجاح',config:waFixtureFlow.config});}
 if(path==='/whatsapp/flow/trigger'&&req.method==='POST'){
  const sess=waFixtureFlow.sessions.find(s=>s.id===body.sessionId||s.contractId===body.contractId)||waFixtureFlow.sessions[0];
  if(!sess)return json('جلسة التدفق غير موجودة',404);
  const ts=new Date().toISOString();
  if(body.role==='ADMIN'){
   const btn=waFixtureFlow.config.adminActionButtons.find(b=>b.id===body.actionId);
   if(!btn)return json('زر الإدارة غير موجود',404);
   if(btn.nextStatus)sess.status=btn.nextStatus;
   sess.lastActionId=btn.id;sess.lastActionLabel=btn.labelAr;sess.lastActionAt=ts;sess.updatedAt=ts;
   waFixtureFlow.events.unshift({id:`flow_evt_${randomUUID()}`,sessionId:sess.id,entityType:'CONTRACT',entityId:sess.contractId,referenceNumber:sess.referenceNumber,type:'ADMIN_ACTION',actorRole:'ADMIN',actorPhone:waFixtureFlow.config.adminPhone,actionId:btn.id,label:btn.labelAr,summary:`نفذت الإدارة (${btn.labelAr}) للعقد ${sess.referenceNumber}`,timestamp:ts});
   return rawJson({success:true,message:`تم تنفيذ إجراء الإدارة: ${btn.labelAr}`,session:sess,button:btn});
  }
  const btn=waFixtureFlow.config.captainButtons.find(b=>b.id===body.actionId);
  if(!btn)return json('زر الكابتن غير موجود',404);
  sess.status=btn.targetStatus;sess.lastActionId=btn.id;sess.lastActionLabel=btn.labelAr;sess.lastActionAt=ts;sess.updatedAt=ts;
  waFixtureFlow.events.unshift({id:`flow_evt_${randomUUID()}`,sessionId:sess.id,entityType:'CONTRACT',entityId:sess.contractId,referenceNumber:sess.referenceNumber,type:'CAPTAIN_ACTION',actorRole:'CAPTAIN',actorPhone:sess.captainPhone,actionId:btn.id,label:btn.labelAr,summary:`${btn.adminNoticeTitleAr} — ${sess.referenceNumber} (تم إشعار ${waFixtureFlow.config.adminPhone})`,timestamp:ts});
  return rawJson({success:true,message:`تم تنفيذ خطوة التدفق وإشعار ${waFixtureFlow.config.adminPhone}`,session:sess,button:btn});
 }
 if(path==='/whatsapp/flow/test'&&req.method==='POST'){
  const ts=new Date().toISOString();
  waFixtureFlow.events.unshift({id:`flow_evt_${randomUUID()}`,entityType:'SYSTEM',type:'TEST_SENT',actorRole:'ADMIN',actorPhone:waFixtureFlow.config.adminPhone,label:'رسالة اختبار التدفق',summary:`تمت جدولة رسالة اختبار إلى ${waFixtureFlow.config.adminPhone}`,timestamp:ts});
  return rawJson({success:true,message:`تمت إضافة رسالة اختبار التدفق إلى الطابور (${waFixtureFlow.config.adminPhone})`,data:{jobId:'wa_flow_test_1',position:1,adminPhone:waFixtureFlow.config.adminPhone}});
 }
 if(path==='/whatsapp/logout'&&req.method==='POST'){waFixtureState={status:'qr_ready',qrImage:fixtureQrDataUrl,queueLength:0,recovery:{failedQueueJobs:0,pendingDriverReplies:0,pausedContracts:0}};return rawJson({success:true,message:'تم تسجيل الخروج من الواتساب',data:waFixtureState});}
 if(path==='/whatsapp/reconnect'&&req.method==='POST'){waFixtureState={status:'qr_ready',qrImage:fixtureQrDataUrl,queueLength:0,recovery:{failedQueueJobs:0,pendingDriverReplies:0,pausedContracts:0}};return rawJson({success:true,data:waFixtureState});}
 if(path==='/accounting/financial-report')return json(financial);
 if(path==='/accounting/vat-return')return json({year:Number(day.slice(0,4)),quarter:1,period:{start:day,endExclusive:day,endInclusive:day,dueDate:day},company,generatedAt:new Date().toISOString(),settings:{version:1,previousCorrection:'0',carriedCredit:'0',notes:'',filedOn:null,updatedAt:null},rows:Array.from({length:16},(_,i)=>({box:i+1,label:`Fixture VAT ${i+1}`,section:i<6?'SALES':i<12?'PURCHASES':'NET',amount:'0.00',adjustment:'0.00',vat:'0.00',isTotal:[6,12,16].includes(i+1)})),sales:[],purchases:[],warnings:[],coverage:{legacyCount:0,proformaCount:0,otherIssuerCount:0,basis:'Fixture',domesticPurchasesOnly:true},summary:{netSales:'0.00',outputVat:'0.00',netPurchases:'0.00',recordedInputVat:'0.00',recoverableInputVat:'0.00',nonRecoverableInputVat:'0.00',currentVatDue:'0.00',netVatDue:'0.00',creditNet:'0.00',debitNet:'0.00',excludedOutsideScope:'0.00'}});
 if((path.startsWith('/accounting/balance')||path.startsWith('/accounting/document-balance')))return json({balance:'115.00',direction:'RECEIVABLE'});
 if(path==='/accounting/payments'&&req.method==='POST'){payments.push(body);return json({id:randomUUID(),...body},201);}
 if(path==='/accounting/purchases'&&req.method==='POST')return json({id:randomUUID(),...body},201);
 if(path.startsWith('/accounting/'))return json({items:[],total:0,page:1,totals:{netAmount:'0.00',vatAmount:'0.00',totalAmount:'0.00',recoverableVat:'0.00'},report:financial});
 if(path==='/workforce/customers'){if(req.method==='POST'){const row={...customer,...body,id:randomUUID()};customers.push(row);return json(row,201);}return json({items:customers.filter(c=>c.name.toLowerCase().includes((url.searchParams.get('search')||'').toLowerCase())),total:customers.length});}
 if(path.startsWith('/workforce/customers/'))return json({customer,contracts:[],invoices:[],payments:[],balances:[],outstanding:'0.00'});
 if(path==='/workforce/members')return json({items:[member]});
 if(path.startsWith('/workforce/members/')||path.startsWith('/workforce/captains/'))return json({member,balances:{entitlement:'0.00',custody:'0.00',advance:'0.00'},operations:[],salaryTerms:[],payroll:[],commissions:[],legacy:[]});
 if(path.startsWith('/workforce/contracts/'))return json({contractId:id,version:1,executionStatus:'PENDING',customerId:id,netAmount:'100.00',taxCategory:'S',driverCommission:{mode:'NONE',amount:'0',base:'0',percent:'0'},representativeId:null,representativeCommission:{mode:'NONE',amount:'0',base:'0',percent:'0'}});
 if(path==='/workforce/selections/report')return json({title:'Fixture report',period:{start:day,endInclusive:day},sales:[],selectedNet:'0.00',selectedOutputVat:'0.00',fullNet:'0.00',fullOutputVat:'0.00',difference:'0.00',warnings:[],excludedCount:0});
 if(path.startsWith('/workforce/'))return json({items:[]});
 return json('Fixture endpoint not implemented: '+path,404);
});
server.listen(5109,'127.0.0.1',()=>process.stdout.write('Miqat fixture backend ready on 5109\n'));
