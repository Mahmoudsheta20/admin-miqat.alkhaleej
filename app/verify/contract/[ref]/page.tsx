import { localizedMetadataTitle } from "@/lib/metadata";
import type { Metadata } from "next";
import PublicContract from "./public-contract";

interface PageProps {
  params: Promise<{ ref: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ref } = await params;
  return {
    title: await localizedMetadataTitle(`توثيق العقد ${ref} | ميقات الخليج`),
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default async function ContractVerificationPage({ params }: PageProps) {
  const { ref } = await params;
  return <PublicContract key={ref} refNumber={ref} />;
}
