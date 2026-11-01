import { localizedMetadataTitle } from "@/lib/metadata";
import PurchasesPage from "./purchases-page";
export async function generateMetadata() { return { title: await localizedMetadataTitle("المشتريات ومصروفات الأسطول | ميقات الخليج") }; }
export default function Page() { return <PurchasesPage />; }
