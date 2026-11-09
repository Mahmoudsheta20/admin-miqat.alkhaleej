import { CustomerDetailPage } from "@/app/_components/commercial/customers";
import { localizedMetadataTitle } from "@/lib/metadata";
export async function generateMetadata(){return {title:await localizedMetadataTitle("حساب العميل")};}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CustomerDetailPage id={id}/>;}
