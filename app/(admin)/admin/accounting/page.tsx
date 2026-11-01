import { localizedMetadataTitle } from "@/lib/metadata";
import AccountingPage from "./accounting-page";
export async function generateMetadata() { return {title:await localizedMetadataTitle("القيود والتقارير المالية | ميقات الخليج")}; }
export default function Page() {return <AccountingPage/>;}
