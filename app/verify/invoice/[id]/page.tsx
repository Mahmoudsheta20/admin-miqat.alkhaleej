import type { Metadata } from "next";
import PublicInvoice from "./public-invoice";
interface InvoiceVerificationPageProps { params: Promise<{ id: string }> }
export async function generateMetadata(): Promise<Metadata> {
  return { title: "فاتورة ميقات الخليج", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };
}
export default async function InvoiceVerificationPage({ params }: InvoiceVerificationPageProps) {
  const { id } = await params;
  return <PublicInvoice key={id} invoiceId={id} />;
}
