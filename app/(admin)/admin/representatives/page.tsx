import { MembersPage } from "@/app/_components/commercial/staff";
import { localizedMetadataTitle } from "@/lib/metadata";
export async function generateMetadata(){return {title:await localizedMetadataTitle("المناديب وعمولات الإحالة")};}
export default function Page(){return <MembersPage representatives/>;}
