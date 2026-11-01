import { localizedMetadataTitle } from "@/lib/metadata";
import VatReturnsPage from "./vat-returns-page";
export async function generateMetadata() { return { title: await localizedMetadataTitle("الإقرار الربع سنوي لضريبة القيمة المضافة | ميقات الخليج") }; }
export default function Page() { return <VatReturnsPage />; }
