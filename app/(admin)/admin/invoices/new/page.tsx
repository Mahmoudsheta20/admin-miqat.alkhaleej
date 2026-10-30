import InvoiceForm from "./invoice-form";

export async function generateMetadata() {
  return { title: "إنشاء فاتورة | ميقات الخليج" };
}

interface NewInvoicePageProps {
  searchParams: Promise<{
    contractId?: string;
    type?: string;
    originalInvoiceId?: string;
    kind?: string;
  }>;
}

export default async function NewInvoicePage({
  searchParams,
}: NewInvoicePageProps) {
  const query = await searchParams;
  const isTax = query.type === "TAX" || Boolean(query.kind);
  const docType =
    query.type === "PROFORMA" ? "PROFORMA" : isTax ? "TAX" : "BOOKING";
  const noteKind =
    query.kind === "CREDIT" || query.kind === "DEBIT" ? query.kind : "INVOICE";

  return (
    <InvoiceForm
      contractId={query.contractId}
      initialDocumentType={docType}
      originalInvoiceId={query.originalInvoiceId}
      noteKind={noteKind}
    />
  );
}
