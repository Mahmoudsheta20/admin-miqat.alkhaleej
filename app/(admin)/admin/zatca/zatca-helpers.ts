import { backendUrl, queryString } from "@/lib/backend";
import {
  downloadInvoice as downloadZatcaArtifactFile,
  type Buyer,
  type EgsUnit,
  type InvoiceDetail as ZatcaBaseInvoiceDetail,
  type InvoiceRow as ZatcaBaseInvoiceRow,
  type Issuer,
  type ZatcaSettings,
} from "@/lib/zatca";

export type ZatcaEnvironment = "SANDBOX" | "SIMULATION" | "PRODUCTION";

export interface ExtendedIssuer extends Issuer {
  commercialRegistration?: string;
  address?: Buyer["address"];
  organizationUnit?: string;
  industry?: string;
  logoFile?: string | null;
  createdAt?: string;
}

export interface EgsComplianceCheck {
  profile?: string;
  kind?: string;
  passed?: boolean;
  checkedAt?: string;
}

export interface ExtendedEgsUnit extends Omit<EgsUnit, "complianceChecks"> {
  certificateSerial?: string | null;
  complianceRequestId?: string | null;
  complianceChecks?: string[] | Record<string, unknown> | EgsComplianceCheck[] | null;
  activatedBy?: string | null;
  activatedAt?: string | null;
  activationEvidence?: string | null;
  createdAt?: string;
  credentialsConfigured?: boolean;
  csrReady?: boolean;
  complianceReady?: boolean;
  productionReady?: boolean;
  renewalPending?: boolean;
}

export interface ExtendedZatcaSettings extends Omit<ZatcaSettings, "issuers" | "egs"> {
  issuers: ExtendedIssuer[];
  egs: ExtendedEgsUnit[];
}

export interface ElectronicInvoiceRow extends ZatcaBaseInvoiceRow {
  egsId?: string;
  originalInvoiceId?: string | null;
  netAmount?: string;
  deliverable?: boolean;
  isOverdue?: boolean;
}

export interface ElectronicInvoiceListResponse {
  items: ElectronicInvoiceRow[];
  total: number;
  page: number;
  pageSize?: number;
}

export interface ElectronicInvoiceArtifact {
  id: string;
  kind: string;
  version: number;
  sha256: string;
  createdAt: string;
}

export interface ElectronicInvoiceDetail extends Omit<ZatcaBaseInvoiceDetail, "job"> {
  originalInvoiceId?: string | null;
  netAmount?: string;
  artifacts?: ElectronicInvoiceArtifact[];
  job: {
    state: string;
    attempts: number;
    availableAt: string;
    lastError?: string | null;
  } | null;
  adjustments?: Array<{
    id: string;
    invoiceNumber: string | null;
    kind: "INVOICE" | "CREDIT" | "DEBIT";
    profile: "STANDARD" | "SIMPLIFIED";
    status: string;
    authorityOutcome?: string | null;
    netAmount: string;
    vatAmount: string;
    totalAmount: string;
    taxPoint: string;
    issueAt: string | null;
    createdAt: string;
    adjustmentReason?: string | null;
  }>;
  originalInvoice?: {
    id: string;
    invoiceNumber: string | null;
    kind: "INVOICE" | "CREDIT" | "DEBIT";
    profile: "STANDARD" | "SIMPLIFIED";
    status: string;
    authorityOutcome?: string | null;
    netAmount: string;
    vatAmount: string;
    totalAmount: string;
    taxPoint: string;
    issueAt: string | null;
  } | null;
  creditBalance?: {
    availableNet: string;
    availableVat: string;
    availableGross: string;
    creditedGross: string;
    debitedGross: string;
    adjustmentsCount: number;
  } | null;
}

export interface ZatcaInvoiceFilterParams {
  page?: number;
  status?: string;
  kind?: string;
  profile?: string;
  egsId?: string;
  overdue?: boolean;
  deliverableOnly?: boolean;
  search?: string;
}

/** Builds a `/zatca/invoices?...` URL query string cleanly without passing empty filters. */
export function buildZatcaInvoicesQueryPath(params: ZatcaInvoiceFilterParams): string {
  const page =
    typeof params.page === "number" && Number.isInteger(params.page) && params.page > 0
      ? params.page
      : 1;
  return `/zatca/invoices${queryString({
    page,
    status: params.status || undefined,
    kind: params.kind || undefined,
    profile: params.profile || undefined,
    egsId: params.egsId || undefined,
    overdue: params.overdue ? "true" : undefined,
    deliverableOnly: params.deliverableOnly ? "true" : undefined,
    search: params.search?.trim() || undefined,
  })}`;
}

export interface EgsProgressSummary {
  completedSteps: number;
  totalSteps: number;
  currentStage:
    | "NEEDS_CSR"
    | "NEEDS_COMPLIANCE"
    | "NEEDS_CHECKS"
    | "NEEDS_PRODUCTION_CSID"
    | "NEEDS_ACTIVATION"
    | "ACTIVE";
  supportedProfiles: Array<"STANDARD" | "SIMPLIFIED">;
  passedChecksCount: number;
}

/** Summarizes onboarding readiness stages for an EGS device based on non-secret server booleans. */
export function computeEgsStageProgress(unit: ExtendedEgsUnit): EgsProgressSummary {
  const supportedProfiles: Array<"STANDARD" | "SIMPLIFIED"> = [];
  if (unit.invoiceTypes[0] === "1") supportedProfiles.push("STANDARD");
  if (unit.invoiceTypes[1] === "1") supportedProfiles.push("SIMPLIFIED");

  let passedChecksCount = 0;
  if (Array.isArray(unit.complianceChecks)) {
    passedChecksCount = unit.complianceChecks.filter((c) =>
      typeof c === "string" ? Boolean(c) : Boolean(c?.passed),
    ).length;
  } else if (unit.complianceChecks && typeof unit.complianceChecks === "object") {
    passedChecksCount = Object.values(unit.complianceChecks).filter((v) =>
      typeof v === "boolean"
        ? v
        : typeof v === "object" && v !== null && "passed" in v && Boolean((v as { passed?: unknown }).passed),
    ).length;
  }

  const hasCsr = Boolean(unit.csrReady);
  const hasCompliance = Boolean(unit.complianceReady);
  const hasChecks = passedChecksCount > 0;
  const hasProdCsid = Boolean(unit.productionReady);
  const isActivated = Boolean(unit.productionEnabled);

  let completedSteps = 0;
  if (hasCsr) completedSteps += 1;
  if (hasCompliance) completedSteps += 1;
  if (hasChecks) completedSteps += 1;
  if (hasProdCsid) completedSteps += 1;
  if (isActivated) completedSteps += 1;

  let currentStage: EgsProgressSummary["currentStage"] = "NEEDS_CSR";
  if (isActivated) currentStage = "ACTIVE";
  else if (hasProdCsid) currentStage = "NEEDS_ACTIVATION";
  else if (hasChecks) currentStage = "NEEDS_PRODUCTION_CSID";
  else if (hasCompliance) currentStage = "NEEDS_CHECKS";
  else if (hasCsr) currentStage = "NEEDS_COMPLIANCE";

  return {
    completedSteps,
    totalSteps: 5,
    currentStage,
    supportedProfiles,
    passedChecksCount,
  };
}

export function zatcaQrImageUrl(id: string): string {
  return backendUrl(`/zatca/invoices/${encodeURIComponent(id)}/qr.png`);
}

export const downloadZatcaArtifact = downloadZatcaArtifactFile;
