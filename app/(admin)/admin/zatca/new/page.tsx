import InvoiceForm from "../../invoices/new/invoice-form";
interface NewTaxDocumentProps { searchParams: Promise<{ originalInvoiceId?: string; kind?: string }> }
export async function generateMetadata() { return { title: "إنشاء مستند ضريبي محلي | ميقات الخليج" }; }
export default async function NewTaxDocumentPage({ searchParams }: NewTaxDocumentProps) {
  const query = await searchParams;
  return <InvoiceForm initialDocumentType="TAX" originalInvoiceId={query.originalInvoiceId} noteKind={query.kind === "CREDIT" || query.kind === "DEBIT" ? query.kind : "INVOICE"} />;
}
