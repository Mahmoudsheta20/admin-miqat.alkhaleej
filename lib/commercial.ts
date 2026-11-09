import { backendRequest } from "./backend";
export interface Commission {mode:"NONE"|"FIXED"|"PERCENT";amount:string;base:string;percent:string}
export interface CommercialInput {customerId:string|null;netAmount:string;taxCategory:"S"|"Z"|"E"|"O";exemptionCode?:string;exemptionReason?:string;driverCommission:Commission;representativeId:string|null;representativeCommission:Commission}
export interface Commercial extends CommercialInput {contractId:string;version:number;executionStatus:"PENDING"|"COMPLETED"|"CANCELLED";reportedAt:string|null;executedOn:string|null}
export interface Customer {id:string;type:"INDIVIDUAL"|"COMPANY";name:string;phone:string|null;email:string|null;vatRegistered:boolean;vatNumber:string|null;identification:string|null;address:{street:string;building:string;district:string;city:string;postalCode:string;country:"SA"}|null;active:boolean;version:number}
export interface Member {id:string;captainId:string|null;name:string;kind:"DRIVER"|"EMPLOYEE"|"EXTERNAL_INDIVIDUAL"|"EXTERNAL_COMPANY";isRepresentative:boolean;phone:string|null;vatNumber:string|null;bankDetails:{bankName:string;accountHolder:string;iban:string}|null;active:boolean;version:number}
export interface StaffOperation {id:string;kind:string;amount:string;entitlementDelta:string;custodyDelta:string;advanceDelta:string;effectiveDate:string;description:string;reversalOfId:string|null}
export interface Payroll {id:string;month:string;amount:string;adjustmentReason:string;status:"DRAFT"|"APPROVED";version:number}
export interface StaffStatement {member:Member;balances:{entitlement:string;custody:string;advance:string};operations:StaffOperation[];salaryTerms:{id:string;effectiveFrom:string;amount:string}[];payroll:Payroll[];commissions:{contractId:string;contract?:{referenceNumber:string;tripDate:string};amount:string;status:string;paidAmount:string;remainingAmount:string;paymentStatus:string}[];legacy:{id:string;effectiveDate:string;description:string;direction:string;amount:string}[]}
export const emptyCommission=():Commission=>({mode:"NONE",amount:"0",base:"0",percent:"0"});
export const emptyCommercial=():CommercialInput=>({customerId:null,netAmount:"0",taxCategory:"S",driverCommission:emptyCommission(),representativeId:null,representativeCommission:emptyCommission()});
export async function commercialRequest<T>(path:string,method="GET",body?:unknown):Promise<T>{const r=await backendRequest<T>(`/workforce${path}`,method,body);if(!r.success||r.data===undefined)throw new Error(r.error||"تعذر تحميل البيانات");return r.data;}
export function csvDownload(name:string,rows:unknown[][]){const cell=(v:unknown)=>`"${String(v??"").replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')}"`;const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function commissionPreview(value:Commission):string{
 const cents=(v:string)=>{if(!/^\d{1,12}(\.\d{1,2})?$/.test(v))return null;const [n,f=""]=v.split('.');return BigInt(n)*BigInt(100)+BigInt(f.padEnd(2,'0'));};
 if(value.mode==="NONE")return "0.00";
 const base=cents(value.mode==="FIXED"?value.amount:value.base),percent=cents(value.percent);if(base===null||percent===null||percent>BigInt(10000))return "—";
 const result=value.mode==="FIXED"?base:(base*percent+BigInt(5000))/BigInt(10000);return `${result/BigInt(100)}.${String(result%BigInt(100)).padStart(2,'0')}`;
}

const MONEY_RE=/^\d{1,12}(\.\d{1,2})?$/;
const PERCENT_RE=/^\d{1,3}(\.\d{1,2})?$/;

function toCents(value?:string|null):bigint|null{
 const clean=(value??"").trim();
 if(!MONEY_RE.test(clean))return null;
 const [whole,frac=""]=clean.split('.');
 return BigInt(whole)*BigInt(100)+BigInt(frac.padEnd(2,'0'));
}

function formatCents(cents:bigint):string{
 return `${cents/BigInt(100)}.${String(cents%BigInt(100)).padStart(2,'0')}`;
}

export function hasPositiveMoney(value?:string|null):boolean{
 const cents=toCents(value);
 return cents!==null&&cents>BigInt(0);
}

export function hasActivePricing(value:Pick<CommercialInput,"netAmount"|"taxCategory">):boolean{
 return hasPositiveMoney(value.netAmount)||value.taxCategory!=="S";
}

export function hasActiveCommission(value:Commission):boolean{
 return value.mode!=="NONE";
}

export function hasAnyCommission(value:Pick<CommercialInput,"driverCommission"|"representativeId"|"representativeCommission">):boolean{
 return value.driverCommission.mode!=="NONE"||value.representativeCommission.mode!=="NONE"||Boolean(value.representativeId);
}

export function commissionCents(value:Commission):bigint|null{
 if(value.mode==="NONE")return BigInt(0);
 if(value.mode==="FIXED"){
  if(!value.amount.trim())return BigInt(0);
  return toCents(value.amount);
 }
 const baseText=value.base.trim();
 const percentText=value.percent.trim();
 if(!baseText&&!percentText)return BigInt(0);
 if(!baseText||!percentText){
  const validBase=baseText?toCents(baseText):BigInt(0);
  const validPercent=percentText?PERCENT_RE.test(percentText):true;
  if(validBase===null||!validPercent)return null;
  if(percentText){
   const [pw,pf=""]=percentText.split('.');
   if(BigInt(pw)*BigInt(100)+BigInt(pf.padEnd(2,'0'))>BigInt(10000))return null;
  }
  return BigInt(0);
 }
 const base=toCents(baseText);
 if(base===null||!PERCENT_RE.test(percentText))return null;
 const [pw,pf=""]=percentText.split('.');
 const percent=BigInt(pw)*BigInt(100)+BigInt(pf.padEnd(2,'0'));
 if(percent>BigInt(10000))return null;
 return (base*percent+BigInt(5000))/BigInt(10000);
}

export function commissionTotalPreview(driver:Commission,representative:Commission):string{
 const d=commissionCents(driver);
 const r=commissionCents(representative);
 if(d===null||r===null)return "—";
 return formatCents(d+r);
}

function normalizeCommissionInput(c:Commission):Commission{
 if(c.mode==="NONE")return emptyCommission();
 if(c.mode==="FIXED"){
  const amount=c.amount.trim();
  if(!amount||toCents(amount)===BigInt(0))return emptyCommission();
  return {mode:"FIXED",amount,base:"0",percent:"0"};
 }
 const base=c.base.trim();
 const percent=c.percent.trim();
 if(!base||!percent)return emptyCommission();
 return {mode:"PERCENT",amount:"0",base,percent};
}

export function normalizeCommercialInput(value:CommercialInput):CommercialInput{
 const net=value.netAmount.trim();
 const normalizedDriver=normalizeCommissionInput(value.driverCommission);
 const normalizedRep=value.representativeId?normalizeCommissionInput(value.representativeCommission):emptyCommission();
 return {
  customerId:value.customerId||null,
  netAmount:net||"0",
  taxCategory:value.taxCategory,
  ...(value.taxCategory!=="S"&&value.exemptionCode?.trim()?{exemptionCode:value.exemptionCode.trim()}:{}),
  ...(value.taxCategory!=="S"&&value.exemptionReason?.trim()?{exemptionReason:value.exemptionReason.trim()}:{}),
  driverCommission:normalizedDriver,
  representativeId:value.representativeId||null,
  representativeCommission:normalizedRep,
 };
}
