"use client";

import { useState, type FormEvent } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Cpu,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import Modal from "@/app/_components/Modal";
import { useUiText } from "@/lib/ui-text";
import { ENV_LABELS, zatcaRequest } from "@/lib/zatca";
import {
  computeEgsStageProgress,
  type ExtendedEgsUnit,
  type ExtendedZatcaSettings,
  type ZatcaEnvironment,
} from "./zatca-helpers";

interface EgsOnboardingSectionProps {
  settings: ExtendedZatcaSettings | null;
  canWrite: boolean;
  canApprove: boolean;
  onChanged: () => void;
}

const INPUT =
  "theme-input mt-1 min-h-11 sm:min-h-9 w-full rounded-lg px-3 py-1.5 text-sm";

type ActiveDialog =
  | { type: "ISSUER" }
  | { type: "EGS" }
  | { type: "CSR"; unit: ExtendedEgsUnit; rotation: boolean }
  | { type: "COMPLIANCE"; unit: ExtendedEgsUnit }
  | { type: "CHECK"; unit: ExtendedEgsUnit }
  | { type: "RENEW"; unit: ExtendedEgsUnit }
  | { type: "ACTIVATION"; unit: ExtendedEgsUnit };

export default function EgsOnboardingSection({
  settings,
  canWrite,
  canApprove,
  onChanged,
}: EgsOnboardingSectionProps) {
  const ui = useUiText();
  const text = (ar: string, en: string) => (ui.language === "en" ? en : ar);

  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [connEnv, setConnEnv] = useState<ZatcaEnvironment>("SANDBOX");
  const [connResult, setConnResult] = useState<string>("");

  // Add Issuer form state
  const [issuerForm, setIssuerForm] = useState({
    legalName: "",
    vatNumber: "",
    commercialRegistration: "",
    organizationUnit: "",
    industry: "Land Passenger Transport",
    street: "",
    building: "",
    district: "",
    city: "",
    postalCode: "",
  });

  // Add EGS form state
  const [egsForm, setEgsForm] = useState({
    issuerId: settings?.issuers[0]?.id || "",
    identity: "",
    environment: "SANDBOX" as ZatcaEnvironment,
    invoiceTypes: "1100" as "1000" | "0100" | "1100",
  });

  // CSR form state
  const [csrForm, setCsrForm] = useState({
    commonName: "",
    serialNumber: "1-MIQAT|2-V1|3-0001",
    organizationUnit: "Main Branch",
    industry: "Land Transport",
  });

  // OTP / Check / Activation forms
  const [otp, setOtp] = useState("");
  const [checkProfile, setCheckProfile] = useState<"STANDARD" | "SIMPLIFIED">("SIMPLIFIED");
  const [checkKind, setCheckKind] = useState<"INVOICE" | "CREDIT" | "DEBIT">("INVOICE");
  const [activationEvidence, setActivationEvidence] = useState("");
  const [activationConfirm, setActivationConfirm] = useState("");

  const isBusy = Boolean(busyKey);

  const runAction = async (
    key: string,
    path: string,
    body: unknown,
    successText: string,
  ) => {
    setBusyKey(key);
    setError("");
    setFeedback("");
    try {
      const res = await zatcaRequest(path, "POST", body);
      if (res.success) {
        setFeedback(successText);
        setDialog(null);
        setOtp("");
        setActivationEvidence("");
        setActivationConfirm("");
        onChanged();
      } else {
        setError(res.error || text("تعذر تنفيذ العملية", "Action failed"));
      }
    } finally {
      setBusyKey(null);
    }
  };

  async function handleConnectivityCheck() {
    setBusyKey("connectivity");
    setError("");
    setConnResult("");
    try {
      const res = await zatcaRequest<{ reachable: boolean; httpStatus: number }>(
        "/connectivity",
        "POST",
        { environment: connEnv },
      );
      if (res.data) {
        setConnResult(
          text(
            `الاتصال متاح (${ENV_LABELS[connEnv]} · HTTP ${res.data.httpStatus})`,
            `Portal reachable (${connEnv} · HTTP ${res.data.httpStatus})`,
          ),
        );
      } else {
        setError(res.error || text("تعذر الوصول لبوابة الهيئة", "Unable to reach ZATCA portal"));
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateIssuer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runAction(
      "issuer",
      "/issuers",
      {
        legalName: issuerForm.legalName.trim(),
        vatNumber: issuerForm.vatNumber.trim(),
        commercialRegistration: issuerForm.commercialRegistration.trim(),
        ...(issuerForm.organizationUnit.trim()
          ? { organizationUnit: issuerForm.organizationUnit.trim() }
          : {}),
        ...(issuerForm.industry.trim()
          ? { industry: issuerForm.industry.trim() }
          : {}),
        address: {
          street: issuerForm.street.trim(),
          building: issuerForm.building.trim(),
          district: issuerForm.district.trim(),
          city: issuerForm.city.trim(),
          postalCode: issuerForm.postalCode.trim(),
          country: "SA",
        },
      },
      text("تمت إضافة المنشأة الضريبية بنجاح.", "Tax issuer added successfully."),
    );
  }

  async function handleCreateEgs(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const targetIssuer = egsForm.issuerId || settings?.issuers[0]?.id || "";
    if (!targetIssuer) {
      setError(text("أضف منشأة أولاً ثم اخترها.", "Add an issuer first and select it."));
      return;
    }
    await runAction(
      "egs",
      "/egs",
      {
        issuerId: targetIssuer,
        identity: egsForm.identity.trim(),
        environment: egsForm.environment,
        invoiceTypes: egsForm.invoiceTypes,
      },
      text("تم تسجيل جهاز الفوترة بنجاح.", "EGS unit registered successfully."),
    );
  }

  const issuers = settings?.issuers || [];
  const egsUnits = settings?.egs || [];

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl border border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="p-3.5 rounded-2xl border border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Environment & Connectivity Bar */}
      <section className="theme-card rounded-2xl border theme-border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border theme-border bg-[var(--bg-card-subtle)] px-3 py-1 font-bold">
            <Cpu className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>
              SDK:{" "}
              {settings?.sdkConfigured
                ? text("مهيّأ", "Configured")
                : text("غير مهيّأ", "Not configured")}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border theme-border bg-[var(--bg-card-subtle)] px-3 py-1 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>
              {text("بيئة الإنتاج:", "Production:")}{" "}
              {settings?.productionPermitted
                ? text("مصرح بها", "Permitted")
                : text("محظورة بيئياً", "Restricted")}
            </span>
          </span>
          {connResult && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/35 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-800 dark:text-emerald-300">
              <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{connResult}</span>
            </span>
          )}
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={text("بيئة الاختبار", "Connectivity environment")}
              value={connEnv}
              onChange={(e) => setConnEnv(e.target.value as ZatcaEnvironment)}
              className="theme-input min-h-11 sm:min-h-9 rounded-lg px-2.5 py-1 text-xs font-bold"
            >
              <option value="SANDBOX">{ENV_LABELS.SANDBOX}</option>
              <option value="SIMULATION">{ENV_LABELS.SIMULATION}</option>
              <option value="PRODUCTION">{ENV_LABELS.PRODUCTION}</option>
            </select>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleConnectivityCheck()}
              className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition disabled:opacity-50 cursor-pointer"
            >
              {busyKey === "connectivity" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              )}
              <span>{text("فحص الاتصال بالهيئة", "Test Portal Connectivity")}</span>
            </button>
          </div>
        )}
      </section>

      {/* Issuers Grid */}
      <section className="theme-card rounded-2xl border theme-border p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <h2 className="text-base font-bold text-[var(--text-main)]">
              {text("المنشآت المصدرة (ZATCA Issuers)", "Tax Issuers")}
            </h2>
          </div>
          {canWrite && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setDialog({ type: "ISSUER" });
              }}
              className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] px-3 py-1.5 text-xs font-bold text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{text("إضافة منشأة", "Add Issuer")}</span>
            </button>
          )}
        </div>

        {issuers.length === 0 ? (
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            {text(
              "لا توجد منشآت مسجلة للربط الإلكتروني بعد. أضف المنشأة أولاً لتتمكن من تسجيل أجهزة الفوترة EGS.",
              "No ZATCA issuers configured yet. Add an issuer first before registering EGS units.",
            )}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {issuers.map((issuer) => (
              <div
                key={issuer.id}
                className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4 text-xs sm:text-sm space-y-1.5"
              >
                <div className="font-bold text-[var(--text-main)]">{issuer.legalName}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] font-mono" dir="ltr">
                  <span>VAT: {issuer.vatNumber}</span>
                  <span>CRN: {issuer.commercialRegistration}</span>
                </div>
                {issuer.address && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {issuer.address.city} — {issuer.address.district} — {issuer.address.street} ({issuer.address.building}, {issuer.address.postalCode})
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* EGS Units Onboarding Section */}
      <section className="theme-card rounded-2xl border theme-border p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <h2 className="text-base font-bold text-[var(--text-main)]">
              {text("أجهزة الفوترة الإلكترونية (EGS)", "E-Invoicing Units (EGS)")}
            </h2>
          </div>
          {canWrite && issuers.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setEgsForm((prev) => ({
                  ...prev,
                  issuerId: prev.issuerId || issuers[0]?.id || "",
                }));
                setDialog({ type: "EGS" });
              }}
              className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{text("تسجيل جهاز EGS", "Register EGS Unit")}</span>
            </button>
          )}
        </div>

        {egsUnits.length === 0 ? (
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            {text(
              "لا توجد أجهزة فوترة مسجلة. أنشئ جهازًا ثم نفذ خطوات CSR وشهادة الامتثال وشهادة الإنتاج.",
              "No EGS units registered yet. Register a unit and walk through CSR, compliance CSID, checks, and production CSID.",
            )}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {egsUnits.map((unit) => {
              const progress = computeEgsStageProgress(unit);
              const envLabel = ENV_LABELS[unit.environment] || unit.environment;
              const isProdEnv = unit.environment === "PRODUCTION";
              const unitBusy = busyKey?.startsWith(unit.id);

              return (
                <div
                  key={unit.id}
                  className="rounded-2xl border theme-border bg-[var(--bg-card-subtle)] p-4 space-y-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-main)]">{unit.identity}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="rounded-full border theme-border bg-[var(--bg-card)] px-2.5 py-0.5 font-bold">
                          {envLabel}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-bold ${
                            unit.productionEnabled
                              ? "border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300"
                              : "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {unit.productionEnabled
                            ? text("مفعّل للإصدار", "Activated")
                            : text("غير مفعّل للإصدار", "Not Activated")}
                        </span>
                        <span className="rounded-full border theme-border bg-[var(--bg-card)] px-2.5 py-0.5 font-mono text-[11px]">
                          ICV: {unit.counter} ·{" "}
                          {unit.invoiceTypes === "1100"
                            ? "B2B + B2C"
                            : unit.invoiceTypes === "1000"
                              ? "B2B Only"
                              : "B2C Only"}
                        </span>
                      </div>
                    </div>

                    <div className="text-end text-xs">
                      <span className="font-mono font-bold text-[var(--accent-gold)]">
                        {progress.completedSteps}/{progress.totalSteps}
                      </span>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {unit.certificateStatus || "MISSING"}
                      </div>
                    </div>
                  </div>

                  {/* Readiness Indicators */}
                  <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                    {[
                      { ok: unit.csrReady, label: text("CSR جاهز", "CSR Ready") },
                      { ok: unit.complianceReady, label: text("امتثال CSID", "Compliance CSID") },
                      {
                        ok: progress.passedChecksCount > 0,
                        label: text(`فحوص (${progress.passedChecksCount})`, `Checks (${progress.passedChecksCount})`),
                      },
                      { ok: unit.productionReady, label: text("إنتاج CSID", "Production CSID") },
                    ].map((badge) => (
                      <span
                        key={badge.label}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 border ${
                          badge.ok
                            ? "border-emerald-600/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                            : "theme-border bg-[var(--bg-card)] text-[var(--text-muted)]"
                        }`}
                      >
                        {badge.ok ? (
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                        )}
                        <span>{badge.label}</span>
                      </span>
                    ))}
                  </div>

                  {unit.certificateExpiresAt && (
                    <p className="text-xs text-[var(--text-muted)] font-mono" dir="ltr">
                      Cert expires: {unit.certificateExpiresAt.slice(0, 10)}
                      {unit.certificateSerial ? ` · SN: ${unit.certificateSerial}` : ""}
                    </p>
                  )}

                  {/* Onboarding Actions */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t theme-border">
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setCsrForm((prev) => ({ ...prev, commonName: unit.identity }));
                            setDialog({ type: "CSR", unit, rotation: Boolean(unit.csrReady) });
                          }}
                          className="min-h-11 sm:min-h-8 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold hover:border-[var(--accent-gold)] transition cursor-pointer"
                        >
                          {unit.csrReady
                            ? text("تدوير CSR", "Rotate CSR")
                            : text("توليد CSR", "Generate CSR")}
                        </button>

                        {unit.csrReady && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setDialog({ type: "COMPLIANCE", unit })}
                            className="min-h-11 sm:min-h-8 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold hover:border-[var(--accent-gold)] transition cursor-pointer"
                          >
                            {text("طلب شهادة الامتثال (OTP)", "Compliance CSID")}
                          </button>
                        )}

                        {unit.complianceReady && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setCheckProfile(
                                progress.supportedProfiles[0] || "SIMPLIFIED",
                              );
                              setDialog({ type: "CHECK", unit });
                            }}
                            className="min-h-11 sm:min-h-8 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold hover:border-[var(--accent-gold)] transition cursor-pointer"
                          >
                            {text("فحص الامتثال", "Run Compliance Check")}
                          </button>
                        )}
                      </>
                    )}

                    {canApprove && (
                      <>
                        {unit.complianceReady && (
                          <button
                            type="button"
                            disabled={Boolean(unitBusy) || isBusy}
                            onClick={() =>
                              void runAction(
                                `${unit.id}-prod`,
                                `/egs/${encodeURIComponent(unit.id)}/production-csid`,
                                {},
                                text("تم إصدار شهادة الإنتاج CSID.", "Production CSID issued."),
                              )
                            }
                            className="min-h-11 sm:min-h-8 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] px-2.5 py-1 text-xs font-bold text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition cursor-pointer"
                          >
                            {text("إصدار CSID الإنتاج", "Request Production CSID")}
                          </button>
                        )}

                        {unit.productionReady && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDialog({ type: "RENEW", unit })}
                              className="min-h-11 sm:min-h-8 inline-flex items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold hover:border-[var(--accent-gold)] transition cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" aria-hidden="true" />
                              <span>{text("تجديد CSID", "Renew CSID")}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDialog({ type: "ACTIVATION", unit })}
                              className={`min-h-11 sm:min-h-8 rounded-lg border px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                                unit.productionEnabled
                                  ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                  : "border-emerald-600/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300"
                              }`}
                            >
                              {unit.productionEnabled
                                ? text("إيقاف تفعيل الجهاز", "Deactivate Unit")
                                : isProdEnv
                                  ? text("تفعيل للإنتاج الفعلي", "Authorize Production")
                                  : text("تفعيل الجهاز", "Activate Unit")}
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void runAction(
                                  `${unit.id}-rotate`,
                                  `/egs/${encodeURIComponent(unit.id)}/rotate-encryption`,
                                  {},
                                  text("تم تدوير مفتاح التشفير بنجاح.", "Encryption key rotated."),
                                )
                              }
                              className="min-h-11 sm:min-h-8 inline-flex items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold hover:border-[var(--accent-gold)] transition cursor-pointer"
                            >
                              <KeyRound className="w-3 h-3" aria-hidden="true" />
                              <span>{text("تدوير مفتاح التشفير", "Rotate Encryption")}</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Dialog: Add Issuer */}
      {dialog?.type === "ISSUER" && (
        <Modal
          label={text("إضافة منشأة للربط الضريبي", "Add ZATCA Tax Issuer")}
          onClose={() => !isBusy && setDialog(null)}
          isBusy={isBusy}
        >
          <form
            onSubmit={(e) => void handleCreateIssuer(e)}
            className="mobile-dialog-panel theme-card w-full max-w-xl rounded-3xl border theme-border p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-bold text-[var(--text-main)]">
              {text("إضافة منشأة للربط الضريبي", "Add Tax Issuer")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs font-bold">
              <label className="sm:col-span-2">
                {text("الاسم القانوني *", "Legal Name *")}
                <input
                  required
                  className={INPUT}
                  value={issuerForm.legalName}
                  onChange={(e) => setIssuerForm({ ...issuerForm, legalName: e.target.value })}
                />
              </label>
              <label>
                {text("الرقم الضريبي (15 خانة) *", "VAT Number (15 digits) *")}
                <input
                  required
                  dir="ltr"
                  pattern="3\d{13}3"
                  maxLength={15}
                  placeholder="310000000000003"
                  className={`${INPUT} font-mono`}
                  value={issuerForm.vatNumber}
                  onChange={(e) => setIssuerForm({ ...issuerForm, vatNumber: e.target.value })}
                />
              </label>
              <label>
                {text("السجل التجاري (10 أرقام) *", "CRN (10 digits) *")}
                <input
                  required
                  dir="ltr"
                  pattern="\d{10}"
                  maxLength={10}
                  placeholder="1010000000"
                  className={`${INPUT} font-mono`}
                  value={issuerForm.commercialRegistration}
                  onChange={(e) =>
                    setIssuerForm({ ...issuerForm, commercialRegistration: e.target.value })
                  }
                />
              </label>
              <label>
                {text("الشارع *", "Street *")}
                <input
                  required
                  className={INPUT}
                  value={issuerForm.street}
                  onChange={(e) => setIssuerForm({ ...issuerForm, street: e.target.value })}
                />
              </label>
              <label>
                {text("رقم المبنى (4 أرقام) *", "Building (4 digits) *")}
                <input
                  required
                  dir="ltr"
                  pattern="\d{4}"
                  maxLength={4}
                  className={`${INPUT} font-mono`}
                  value={issuerForm.building}
                  onChange={(e) => setIssuerForm({ ...issuerForm, building: e.target.value })}
                />
              </label>
              <label>
                {text("الحي *", "District *")}
                <input
                  required
                  className={INPUT}
                  value={issuerForm.district}
                  onChange={(e) => setIssuerForm({ ...issuerForm, district: e.target.value })}
                />
              </label>
              <label>
                {text("المدينة *", "City *")}
                <input
                  required
                  className={INPUT}
                  value={issuerForm.city}
                  onChange={(e) => setIssuerForm({ ...issuerForm, city: e.target.value })}
                />
              </label>
              <label>
                {text("الرمز البريدي (5 أرقام) *", "Postal Code (5 digits) *")}
                <input
                  required
                  dir="ltr"
                  pattern="\d{5}"
                  maxLength={5}
                  className={`${INPUT} font-mono`}
                  value={issuerForm.postalCode}
                  onChange={(e) => setIssuerForm({ ...issuerForm, postalCode: e.target.value })}
                />
              </label>
              <label>
                {text("الوحدة التنظيمية", "Organization Unit")}
                <input
                  className={INPUT}
                  value={issuerForm.organizationUnit}
                  onChange={(e) =>
                    setIssuerForm({ ...issuerForm, organizationUnit: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setDialog(null)}
                className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {text("إلغاء", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="gold-gradient-btn min-h-11 sm:min-h-9 rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {isBusy ? text("جارٍ الحفظ…", "Saving…") : text("حفظ المنشأة", "Save Issuer")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dialog: Add EGS */}
      {dialog?.type === "EGS" && (
        <Modal
          label={text("تسجيل جهاز فوترة EGS", "Register EGS Unit")}
          onClose={() => !isBusy && setDialog(null)}
          isBusy={isBusy}
        >
          <form
            onSubmit={(e) => void handleCreateEgs(e)}
            className="mobile-dialog-panel theme-card w-full max-w-md rounded-3xl border theme-border p-5 sm:p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-[var(--text-main)]">
              {text("تسجيل جهاز فوترة EGS", "Register EGS Unit")}
            </h3>
            <div className="space-y-3 text-xs font-bold">
              <label className="block">
                {text("المنشأة *", "Issuer *")}
                <select
                  required
                  className={INPUT}
                  value={egsForm.issuerId || issuers[0]?.id || ""}
                  onChange={(e) => setEgsForm({ ...egsForm, issuerId: e.target.value })}
                >
                  {issuers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.legalName} ({i.vatNumber})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                {text("اسم الجهاز التعريفي *", "Device Identity *")}
                <input
                  required
                  placeholder="MIQAT-EGS-01"
                  dir="ltr"
                  className={`${INPUT} font-mono`}
                  value={egsForm.identity}
                  onChange={(e) => setEgsForm({ ...egsForm, identity: e.target.value })}
                />
              </label>
              <label className="block">
                {text("البيئة *", "Environment *")}
                <select
                  className={INPUT}
                  value={egsForm.environment}
                  onChange={(e) =>
                    setEgsForm({ ...egsForm, environment: e.target.value as ZatcaEnvironment })
                  }
                >
                  <option value="SANDBOX">{ENV_LABELS.SANDBOX}</option>
                  <option value="SIMULATION">{ENV_LABELS.SIMULATION}</option>
                  <option value="PRODUCTION">{ENV_LABELS.PRODUCTION}</option>
                </select>
              </label>
              <label className="block">
                {text("أنواع الفواتير المدعومة *", "Supported Invoice Types *")}
                <select
                  className={INPUT}
                  value={egsForm.invoiceTypes}
                  onChange={(e) =>
                    setEgsForm({
                      ...egsForm,
                      invoiceTypes: e.target.value as "1000" | "0100" | "1100",
                    })
                  }
                >
                  <option value="1100">{text("قياسية + مبسطة (1100)", "Standard & Simplified (1100)")}</option>
                  <option value="1000">{text("ضريبية قياسية فقط (1000)", "Standard B2B Only (1000)")}</option>
                  <option value="0100">{text("مبسطة فقط (0100)", "Simplified B2C Only (0100)")}</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setDialog(null)}
                className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {text("إلغاء", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="gold-gradient-btn min-h-11 sm:min-h-9 rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {isBusy ? text("جارٍ التسجيل…", "Saving…") : text("تسجيل الجهاز", "Save EGS")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dialog: CSR Generation / Rotation */}
      {dialog?.type === "CSR" && (
        <Modal
          label={text("توليد طلب توقيع الشهادة CSR", "Generate CSR")}
          onClose={() => !isBusy && setDialog(null)}
          isBusy={isBusy}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runAction(
                `${dialog.unit.id}-csr`,
                `/egs/${encodeURIComponent(dialog.unit.id)}/csr`,
                {
                  commonName: csrForm.commonName.trim(),
                  serialNumber: csrForm.serialNumber.trim(),
                  organizationUnit: csrForm.organizationUnit.trim(),
                  industry: csrForm.industry.trim(),
                  rotation: dialog.rotation,
                },
                text("تم توليد CSR بنجاح.", "CSR generated successfully."),
              );
            }}
            className="mobile-dialog-panel theme-card w-full max-w-md rounded-3xl border theme-border p-5 sm:p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-[var(--text-main)]">
              {dialog.rotation ? text("تدوير مفتاح CSR", "Rotate CSR Key") : text("توليد CSR", "Generate CSR")} — {dialog.unit.identity}
            </h3>
            <div className="space-y-3 text-xs font-bold">
              <label className="block">
                Common Name *
                <input
                  required
                  dir="ltr"
                  className={INPUT}
                  value={csrForm.commonName}
                  onChange={(e) => setCsrForm({ ...csrForm, commonName: e.target.value })}
                />
              </label>
              <label className="block">
                EGS Serial Number (1-...|2-...|3-...) *
                <input
                  required
                  dir="ltr"
                  pattern="1-[^|\r\n]+\|2-[^|\r\n]+\|3-[^|\r\n]+"
                  className={`${INPUT} font-mono`}
                  value={csrForm.serialNumber}
                  onChange={(e) => setCsrForm({ ...csrForm, serialNumber: e.target.value })}
                />
              </label>
              <label className="block">
                Organization Unit *
                <input
                  required
                  dir="ltr"
                  className={INPUT}
                  value={csrForm.organizationUnit}
                  onChange={(e) => setCsrForm({ ...csrForm, organizationUnit: e.target.value })}
                />
              </label>
              <label className="block">
                Industry *
                <input
                  required
                  dir="ltr"
                  className={INPUT}
                  value={csrForm.industry}
                  onChange={(e) => setCsrForm({ ...csrForm, industry: e.target.value })}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setDialog(null)}
                className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {text("إلغاء", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="gold-gradient-btn min-h-11 sm:min-h-9 rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {isBusy ? text("جارٍ التوليد…", "Generating…") : text("توليد CSR", "Generate CSR")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dialog: Compliance / Renew OTP */}
      {(dialog?.type === "COMPLIANCE" || dialog?.type === "RENEW") && (
        <Modal
          label={dialog.type === "RENEW" ? text("تجديد شهادة الإنتاج", "Renew Production CSID") : text("طلب شهادة الامتثال", "Request Compliance CSID")}
          onClose={() => !isBusy && setDialog(null)}
          isBusy={isBusy}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runAction(
                `${dialog.unit.id}-otp`,
                dialog.type === "RENEW"
                  ? `/egs/${encodeURIComponent(dialog.unit.id)}/renew`
                  : `/egs/${encodeURIComponent(dialog.unit.id)}/compliance`,
                { otp: otp.trim() },
                dialog.type === "RENEW"
                  ? text("تم تجديد شهادة الإنتاج بنجاح.", "Production CSID renewed.")
                  : text("تم استلام شهادة الامتثال بنجاح.", "Compliance CSID issued."),
              );
            }}
            className="mobile-dialog-panel theme-card w-full max-w-sm rounded-3xl border theme-border p-5 sm:p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-[var(--text-main)]">
              {dialog.type === "RENEW"
                ? text("تجديد CSID الإنتاج (OTP)", "Renew Production CSID (OTP)")
                : text("طلب شهادة الامتثال (OTP)", "Compliance CSID (OTP)")}
            </h3>
            <label className="block text-xs font-bold">
              {text("رمز التحقق من بوابة فاتورة (6 أرقام) *", "ZATCA Fatoora Portal OTP (6 digits) *")}
              <input
                required
                dir="ltr"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
                className={`${INPUT} font-mono tracking-widest`}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setDialog(null)}
                className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {text("إلغاء", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="gold-gradient-btn min-h-11 sm:min-h-9 rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {isBusy ? text("جارٍ الإرسال…", "Submitting…") : text("تأكيد وإرسال", "Submit OTP")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dialog: Compliance Sample Check */}
      {dialog?.type === "CHECK" && (
        <Modal
          label={text("فحص الامتثال مع بوابة الهيئة", "Run Compliance Sample Check")}
          onClose={() => !isBusy && setDialog(null)}
          isBusy={isBusy}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runAction(
                `${dialog.unit.id}-check`,
                `/egs/${encodeURIComponent(dialog.unit.id)}/check`,
                { profile: checkProfile, kind: checkKind },
                text(
                  `اجتاز فحص الامتثال (${checkProfile} · ${checkKind}).`,
                  `Compliance check passed (${checkProfile} · ${checkKind}).`,
                ),
              );
            }}
            className="mobile-dialog-panel theme-card w-full max-w-sm rounded-3xl border theme-border p-5 sm:p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-[var(--text-main)]">
              {text("اختبار فحص الامتثال", "Compliance Sample Check")}
            </h3>
            <div className="space-y-3 text-xs font-bold">
              <label className="block">
                {text("نموذج الفاتورة", "Invoice Profile")}
                <select
                  className={INPUT}
                  value={checkProfile}
                  onChange={(e) =>
                    setCheckProfile(e.target.value as "STANDARD" | "SIMPLIFIED")
                  }
                >
                  <option value="SIMPLIFIED">{text("مبسطة (B2C)", "Simplified (B2C)")}</option>
                  <option value="STANDARD">{text("قياسية (B2B)", "Standard (B2B)")}</option>
                </select>
              </label>
              <label className="block">
                {text("نوع المستند", "Document Kind")}
                <select
                  className={INPUT}
                  value={checkKind}
                  onChange={(e) =>
                    setCheckKind(e.target.value as "INVOICE" | "CREDIT" | "DEBIT")
                  }
                >
                  <option value="INVOICE">{text("فاتورة", "Invoice")}</option>
                  <option value="CREDIT">{text("إشعار دائن", "Credit Note")}</option>
                  <option value="DEBIT">{text("إشعار مدين", "Debit Note")}</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setDialog(null)}
                className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {text("إلغاء", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="gold-gradient-btn min-h-11 sm:min-h-9 rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {isBusy ? text("جارٍ الفحص…", "Checking…") : text("تنفيذ الفحص", "Run Check")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dialog: Production Activation */}
      {dialog?.type === "ACTIVATION" && (
        <Modal
          label={text("تفعيل أو إيقاف جهاز الفوترة", "EGS Production Activation")}
          onClose={() => !isBusy && setDialog(null)}
          isBusy={isBusy}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runAction(
                `${dialog.unit.id}-activate`,
                `/egs/${encodeURIComponent(dialog.unit.id)}/activation`,
                {
                  enabled: !dialog.unit.productionEnabled,
                  evidence: activationEvidence.trim(),
                  confirmation: "AUTHORIZE_PRODUCTION_ZATCA",
                },
                !dialog.unit.productionEnabled
                  ? text("تم تفعيل جهاز الفوترة.", "EGS unit activated.")
                  : text("تم إيقاف تفعيل جهاز الفوترة.", "EGS unit deactivated."),
              );
            }}
            className="mobile-dialog-panel theme-card w-full max-w-md rounded-3xl border theme-border p-5 sm:p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-[var(--text-main)]">
              {dialog.unit.productionEnabled
                ? text("إيقاف تفعيل الجهاز", "Deactivate EGS Unit")
                : text("تفعيل الجهاز للإصدار", "Activate EGS Unit")}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {text(
                "وثّق مرجع الاعتماد أو سبب القرار (15 حرفاً على الأقل) واكتب عبارة التأكيد الحرفية لإتمام العملية.",
                "Document the authorization reference or reason (at least 15 characters) and type the confirmation phrase.",
              )}
            </p>
            <div className="space-y-3 text-xs font-bold">
              <label className="block">
                {text("مرجع / إثبات التفويض (15+ حرفاً) *", "Authorization Evidence (15+ chars) *")}
                <textarea
                  required
                  minLength={15}
                  maxLength={1000}
                  rows={3}
                  className={INPUT}
                  value={activationEvidence}
                  onChange={(e) => setActivationEvidence(e.target.value)}
                />
              </label>
              <label className="block">
                {text("اكتب عبارة التأكيد: AUTHORIZE_PRODUCTION_ZATCA *", "Type confirmation: AUTHORIZE_PRODUCTION_ZATCA *")}
                <input
                  required
                  dir="ltr"
                  pattern="AUTHORIZE_PRODUCTION_ZATCA"
                  placeholder="AUTHORIZE_PRODUCTION_ZATCA"
                  className={`${INPUT} font-mono`}
                  value={activationConfirm}
                  onChange={(e) => setActivationConfirm(e.target.value)}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setDialog(null)}
                className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {text("إلغاء", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={isBusy || activationConfirm !== "AUTHORIZE_PRODUCTION_ZATCA"}
                className="gold-gradient-btn min-h-11 sm:min-h-9 rounded-lg px-4 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {isBusy ? text("جارٍ التحديث…", "Updating…") : text("تأكيد التنفيذ", "Confirm Activation")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
