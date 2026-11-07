import {backendRequest} from "./backend";
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
export function csvDownload(name:string,rows:unknown[][]){const cell=(v:unknown)=>`"${String(v??"").replace(/^[=+@\-]/,"'$&").replaceAll('"','""')}"`;const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function commissionPreview(value:Commission):string{
 const cents=(v:string)=>{if(!/^\d{1,12}(\.\d{1,2})?$/.test(v))return null;const [n,f=""]=v.split('.');return BigInt(n)*BigInt(100)+BigInt(f.padEnd(2,'0'));};
 if(value.mode==="NONE")return "0.00";
 const base=cents(value.mode==="FIXED"?value.amount:value.base),percent=cents(value.percent);if(base===null||percent===null||percent>BigInt(10000))return "—";
 const result=value.mode==="FIXED"?base:(base*percent+BigInt(5000))/BigInt(10000);return `${result/BigInt(100)}.${String(result%BigInt(100)).padStart(2,'0')}`;
}
