import { CustomersPage } from "@/app/_components/commercial/customers";
import { localizedMetadataTitle } from "@/lib/metadata";
export async function generateMetadata(){return {title:await localizedMetadataTitle("العملاء وفواتيرهم")};}
export default function Page(){return <CustomersPage/>;}
