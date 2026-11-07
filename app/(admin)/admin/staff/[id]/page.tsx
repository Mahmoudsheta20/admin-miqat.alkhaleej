import {StaffPage} from "@/app/_components/commercial/staff";
import {localizedMetadataTitle} from "@/lib/metadata";
export async function generateMetadata(){return {title:await localizedMetadataTitle("حساب السائق والمستحقات")};}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <StaffPage memberId={id}/>;}
