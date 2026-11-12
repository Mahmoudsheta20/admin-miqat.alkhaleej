// Isolated browser-test backend. Never imports application secrets or connects to a database.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const day = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const id='11111111-1111-4111-8111-111111111111';
const admin={id:'admin-fixture',name:'Fixture Administrator',email:'miqatalkhaleej@gmail.com',role:'ADMIN',active:true,mustChangePassword:false};
const captain={id,name:'Fixture Captain',email:'captain@example.test',role:'CAPTAIN',active:true,mustChangePassword:false,phone:'0551234567',nationalId:'1234567890',licenseNumber:'FIX-001',licenseExpiry:'2028-12-31',assignedVehiclePlate:'أ ب ج 1234',hasTodayInspection:true,contractCount:1};
const vehicle={id,plateNumberAr:'أ ب ج 1234',plateNumberEn:'ABC 1234',make:'Toyota',model:'Hiace',category:'VAN',year:2025,capacity:12,status:'AVAILABLE',registrationExpiry:'2028-12-31',insuranceExpiry:'2028-12-31'};
const checks=Object.fromEntries(['fuelGauge','tempGauge','oilPressure','checkEngine','absLight','warningLights','tires','headlights','signals','mirrors','noLeaks','fireExtinguisher','warningTriangle','firstAidKit','glassHammer','seatBelts'].map(key=>[key,true]));
const inspection={id,captainId:id,captainName:captain.name,vehiclePlate:vehicle.plateNumberAr,inspectionDate:`${day}T09:00:00+03:00`,createdAt:new Date().toISOString(),...checks,driverDeclared:true,contractCount:1};
const contract={id,referenceNumber:'MQ-FIXTURE-001',customerName:'Fixture Guest',customerPhone:'0551234567',operationType:'AIRPORT_TRANSFER',origin:'جدة',destination:'مكة المكرمة',tripDate:day,tripTime:'12:00',captainId:id,captain,vehiclePlate:vehicle.plateNumberAr,issueDate:day,inspectionId:id,inspection,passengers:[{id,name:'Fixture Passenger',nationality:'SA',idNumber:'1234567890'}],status:'APPROVED',createdAt:new Date().toISOString()};
const company={legalName:'شركة الاختبار — بيانات تجريبية',vatNumber:'310000000000003',commercialRegistration:'1010000000',address:{street:'Test street',building:'1234',district:'Test district',city:'Jeddah',postalCode:'12345',country:'SA'},presentation:{englishName:'Fixture Transport',website:'https://example.test',showSeal:false}};
const invoice={id,invoiceNumber:'TAX-000001',customerName:'Fixture Customer',netAmount:'100.00',vatAmount:'15.00',totalAmount:'115.00',invoiceDate:`${day}T09:00:00+03:00`,createdAt:new Date().toISOString(),status:'SAVED',documentType:'TAX',taxDocument:{kind:'INVOICE',profile:'SIMPLIFIED',supplyDate:day},contractId:id,verificationUrl:`http://127.0.0.1:3419/verify/invoice/${id}`,snapshot:{issuer:company,input:{documentType:'TAX',invoiceDate:`${day}T09:00:00+03:00`,buyer:{name:'Fixture Customer'},taxDocument:{kind:'INVOICE',profile:'SIMPLIFIED',supplyDate:day},paymentCode:'30',accountingApproved:true,lines:[{code:'TRP',description:'Fixture trip',quantity:'1',unitPrice:'100',discount:'0',category:'S',rate:'15',component:'OWN_SUPPLY',taxReviewed:true}],transport:{}},totals:{net:'100.00',vat:'15.00',gross:'115.00'}}};
const customer={id,type:'INDIVIDUAL',name:'Fixture Customer',phone:'0551234567',email:'customer@example.test',vatRegistered:false,active:true,version:1};
const member={id,captainId:id,name:captain.name,kind:'DRIVER',isRepresentative:false,active:true,version:1};
const financial={range:{start:`${day.slice(0,4)}-01-01`,endInclusive:day},profit:{revenue:'100.00',expenses:'20.00',beforeTax:'80.00',taxExpense:'0.00',afterTax:'80.00'},trial:[],totals:{debit:'100.00',credit:'100.00',closingDebit:'100.00',closingCredit:'100.00'},vehicles:[],unpostedInvoices:[],entries:[],generatedAt:new Date().toISOString()};
let vehicles=[vehicle],contracts=[contract],inspections=[inspection],customers=[customer],invoices=[invoice],payments=[];
function minimalPdf(){const objects=['<</Type /Catalog /Pages 2 0 R>>','<</Type /Pages /Kids [3 0 R] /Count 1>>','<</Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>>','<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>','<</Length 48>>\nstream\nBT /F1 14 Tf 20 100 Td (Fixture document) Tj ET\nendstream'];let s='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(s));s+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=Buffer.byteLength(s);s+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer <</Root 1 0 R /Size 6>>\nstartxref\n${xref}\n%%EOF`;return s;}
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),path=url.pathname.replace(/^\/api/,'');let body={};
 for await(const chunk of req){body.raw=(body.raw||'')+chunk;}try{body=JSON.parse(body.raw||'{}');}catch{body={};}
 const json=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({success:status<400,...(status<400?{data}:{error:typeof data==='string'?data:'Fixture error'})}));};
 if(path==='/health')return json({status:'ok'});
 if(path==='/auth/login'){
  if(body.password!=='fixture-password')return json('بيانات الدخول غير صحيحة',401);
  const role=body.email==='captain@example.test'?'CAPTAIN':'ADMIN',temporary=body.email==='temporary@example.test';
  res.setHeader('set-cookie',`miqat_token=fixture-${temporary?'temporary':role}; Path=/; HttpOnly; SameSite=Lax${body.rememberMe?'; Max-Age=3600':''}`);
  return json({user:{...(role==='ADMIN'?admin:captain),mustChangePassword:temporary},mustChangePassword:temporary});
 }
 if(path==='/auth/logout'){res.setHeader('set-cookie','miqat_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');return json({});}
 if(['/auth/forgot-password','/auth/verify-reset-token','/auth/reset-password'].includes(path))return json({valid:true,message:'تم تنفيذ الطلب'});
 const cookie=req.headers.cookie||'',role=cookie.includes('fixture-CAPTAIN')?'CAPTAIN':cookie.includes('fixture-ADMIN')?'ADMIN':null;
 if(path==='/auth/complete-password-change'&&cookie.includes('fixture-temporary')){res.setHeader('set-cookie','miqat_token=fixture-ADMIN; Path=/; HttpOnly; SameSite=Lax');return json({user:admin});}
 if(path==='/contracts/verify/MQ-FIXTURE-001')return json({referenceNumber:contract.referenceNumber,status:'APPROVED',issueDate:day});
 if(path===`/inspections/verify/${id}`)return json({id,inspectionDate:inspection.inspectionDate,driverDeclared:true});
 if(path===`/invoices/verify/${id}`||path===`/invoices/public/${id}`)return json({invoiceNumber:'TAX-000001',invoiceDate:invoice.invoiceDate,companyName:company.legalName,currency:'SAR',totals:invoice.snapshot.totals,documentType:'TAX',taxDocument:invoice.taxDocument});
 if(!role)return json('يرجى تسجيل الدخول',401);
 if(path==='/auth/session')return json(role==='ADMIN'?admin:captain);
 if(path==='/auth/change-password'||path==='/auth/profile')return json(role==='ADMIN'?admin:captain);
 if(role==='CAPTAIN'&&['/admins','/dashboard/stats','/accounting/financial-report','/invoices'].includes(path))return json('غير مصرح',403);
 if(path.endsWith('/pdf')||path.endsWith('/receipt')){res.writeHead(200,{'content-type':'application/pdf','content-disposition':'inline; filename="fixture.pdf"'});return res.end(minimalPdf());}
 if(path.endsWith('qr.png')){res.writeHead(200,{'content-type':'image/png'});return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jI2YAAAAASUVORK5CYII=','base64'));}
 if(path==='/dashboard/stats')return json({totalCaptains:1,totalVehicles:vehicles.length,activeVehicles:vehicles.length,totalContracts:contracts.length,todayInspections:inspections.length,recentContracts:contracts.map(c=>({...c,captainName:captain.name,passengersCount:1}))});
 if(path==='/fleet'){if(req.method==='POST'){const row={...vehicle,...body,id:randomUUID()};vehicles.push(row);return json(row,201);}return json(vehicles);}
 if(path.startsWith('/fleet/')){const target=path.split('/').at(-1);if(req.method==='DELETE')vehicles=vehicles.filter(v=>v.id!==target);if(req.method==='PUT')vehicles=vehicles.map(v=>v.id===target?{...v,...body}:v);return json(vehicles.find(v=>v.id===target)||{});}
 if(path==='/captains')return json([captain]);
 if(path==='/admins')return json({admins:[{...admin,isSuperAdmin:true}],total:1,isCallerSuperAdmin:true});
 if(path==='/inspections/today')return json(inspections.at(-1)||null);
 if(path==='/inspections/overview')return json({captains:[{...captain,todayInspection:inspections.at(-1),hasTodayInspection:inspections.length>0,totalInspections:inspections.length}],stats:{totalCaptains:1,inspectedToday:inspections.length?1:0,pendingToday:inspections.length?0:1,totalInspections:inspections.length}});
 if(path==='/inspections'){if(req.method==='POST'){const row={...inspection,...body,id:randomUUID()};inspections.push(row);return json(row,201);}return json(inspections);}
 if(path.startsWith('/inspections/'))return json(inspection);
 if(path==='/contracts'){if(req.method==='POST'){const row={...contract,...body,id:randomUUID(),status:role==='ADMIN'?'ACTIVE':'PENDING_REVIEW',referenceNumber:`MQ-FIXTURE-${contracts.length+1}`};contracts.push(row);return json(row,201);}return json(contracts);}
 if(path.startsWith('/contracts/')){if(req.method==='PUT')contracts=contracts.map(c=>c.id===path.split('/')[2]?{...c,...body}:c);return json(contracts.find(c=>c.id===path.split('/')[2])||contract);}
 if(path==='/invoices/settings')return json({company});
 if(path==='/invoices'){if(req.method==='POST'){const row={...invoice,...body,id:randomUUID()};invoices.push(row);return json(row,201);}return json({items:invoices,total:invoices.length,page:Number(url.searchParams.get('page')||1)});}
 if(path==='/invoices/contracts')return json({items:contracts});
 if(path.startsWith('/invoices/transport-defaults/')){const targetId=path.split('/')[3];const target=contracts.find(c=>c.id===targetId)||contract;return json({customerName:target.customerName,transport:{serviceType:target.operationType||'AIRPORT_TRANSFER',contractReference:target.referenceNumber,origin:target.origin||'',destination:target.destination||'',tripDate:target.tripDate||day,departureTime:(target.tripTime||'12:00').slice(0,5),contactName:target.customerName,contactPhone:target.customerPhone,vehiclePlate:target.vehiclePlate,distanceUnit:'KM',passengers:target.passengers||[]}});}
 if(path.startsWith('/invoices/'))return json(invoice);
 if(path==='/zatca/settings')return json({issuers:[],egs:[],sdkConfigured:false,productionPermitted:false});
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
