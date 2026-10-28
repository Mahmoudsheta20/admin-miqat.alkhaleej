import InvoiceForm from "./invoice-form";
export async function generateMetadata() { return { title: "إنشاء فاتورة حجز | ميقات الخليج" }; }
interface NewInvoicePageProps { searchParams: Promise<{ contractId?: string }> }
export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const query = await searchParams;
  return <InvoiceForm contractId={query.contractId} />;
}
