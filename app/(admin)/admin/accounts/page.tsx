import { localizedMetadataTitle } from "@/lib/metadata";
import AccountsPage from "./accounts-page";
export async function generateMetadata() { return {title:await localizedMetadataTitle("شجرة الحسابات | ميقات الخليج")}; }
export default function Page() {return <AccountsPage/>;}
