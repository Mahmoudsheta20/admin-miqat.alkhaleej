import { MembersPage } from "@/app/_components/commercial/staff";
import { localizedMetadataTitle } from "@/lib/metadata";
export async function generateMetadata(){return {title:await localizedMetadataTitle("المناديب وتريبات الإحالة")};}
export default function Page(){return <MembersPage representatives/>;}
