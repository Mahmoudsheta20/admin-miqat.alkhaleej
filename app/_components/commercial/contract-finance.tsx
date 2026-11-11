"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  Ban,
  Briefcase,
  CalendarCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  Percent,
  ReceiptText,
  Save,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useUiText } from "@/lib/ui-text";
import { cn } from "@/lib/utils";
import {
  commercialRequest,
  commissionTotalPreview,
  emptyCommercial,
  emptyCommission,
  hasActiveCommission,
  hasActivePricing,
  hasAnyCommission,
  hasPositiveMoney,
  normalizeCommercialInput,
  type Commercial,
  type CommercialInput,
  type Commission,
  type Customer,
  type Member,
} from "@/lib/commercial";
import { purchasePreview, currentSaudiPeriod } from "@/lib/accounting";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Separator,
} from "@/app/_components/ui";
import { CustomerCombobox } from "./customer-combobox";
import { ExpandableField } from "@/app/_components/form/FullscreenFieldModal";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";
import { useCommercialData, useMutation } from "./shared";

const TAX_CATEGORY_OPTIONS: {
  value: CommercialInput["taxCategory"];
  label: string;
  rate: string;
}[] = [
  { value: "S", label: "خاضع للضريبة 15%", rate: "15%" },
  { value: "Z", label: "خاضع للنسبة الصفرية 0%", rate: "0%" },
  { value: "E", label: "معفى من الضريبة", rate: "0%" },
  { value: "O", label: "خارج نطاق الضريبة", rate: "0%" },
];

const COMMISSION_METHOD_OPTIONS: {
  value: Exclude<Commission["mode"], "NONE">;
  label: string;
}[] = [
  { value: "FIXED", label: "مبلغ ثابت" },
  { value: "PERCENT", label: "نسبة من أساس مستقل" },
];

interface PricingDraft {
  netAmount: string;
  taxCategory: CommercialInput["taxCategory"];
  exemptionCode?: string;
  exemptionReason?: string;
}

function activeCommissionOrEmpty(c: Commission): Commission {
  if (c.mode === "FIXED") {
    return {
      mode: "FIXED",
      amount: hasPositiveMoney(c.amount) ? c.amount : "",
      base: "0",
      percent: "0",
    };
  }
  if (c.mode === "PERCENT") {
    return {
      mode: "PERCENT",
      amount: "0",
      base: hasPositiveMoney(c.base) ? c.base : "",
      percent: hasPositiveMoney(c.percent) ? c.percent : "",
    };
  }
  return { mode: "FIXED", amount: "", base: "0", percent: "0" };
}

export function CommercialFields({
  value,
  onChange,
  onGuest,
  disabled = false,
  footer,
  embedded = false,
}: {
  value: CommercialInput;
  onChange: (v: CommercialInput) => void;
  onGuest?: (name: string, phone: string) => void;
  disabled?: boolean;
  footer?: React.ReactNode;
  embedded?: boolean;
}) {
  const ui = useUiText();
  const baseId = React.useId();
  const [sameGuest, setSameGuest] = React.useState(false);
  const [pickedCustomer, setPickedCustomer] = React.useState<Customer | null>(
    null,
  );

  const [pricingOpen, setPricingOpen] = React.useState(() =>
    hasActivePricing(value),
  );
  const [commissionsOpen, setCommissionsOpen] = React.useState(() =>
    hasAnyCommission(value),
  );
  const [driverEnabled, setDriverEnabled] = React.useState(() =>
    hasActiveCommission(value.driverCommission),
  );
  const [repEnabled, setRepEnabled] = React.useState(
    () =>
      Boolean(value.representativeId) ||
      hasActiveCommission(value.representativeCommission),
  );

  const pricingDraftRef = React.useRef<PricingDraft | null>(null);
  const driverDraftRef = React.useRef<Commission | null>(null);
  const repDraftRef = React.useRef<{
    representativeId: string | null;
    representativeCommission: Commission;
  } | null>(null);

  const isPricingOpen = pricingOpen || hasActivePricing(value);
  const isDriverOpen =
    driverEnabled || hasActiveCommission(value.driverCommission);
  const isRepOpen =
    repEnabled ||
    Boolean(value.representativeId) ||
    hasActiveCommission(value.representativeCommission);
  const isCommissionsOpen =
    commissionsOpen || hasAnyCommission(value) || isDriverOpen || isRepOpen;

  const customers = useCommercialData<{ items: Customer[] }>(
    "/customers?search=",
  );
  const members = useCommercialData<{ items: Member[] }>(
    "/members?representatives=true",
  );

  const activeMembers = React.useMemo(
    () => members.data?.items.filter((m) => m.active) ?? [],
    [members.data],
  );

  const activeCustomer = React.useMemo(() => {
    if (!value.customerId) return null;
    return (
      customers.data?.items.find((c) => c.id === value.customerId) ??
      (pickedCustomer?.id === value.customerId ? pickedCustomer : null)
    );
  }, [value.customerId, customers.data, pickedCustomer]);

  const preview = purchasePreview(
    value.netAmount,
    value.taxCategory === "S" ? undefined : "0",
  );
  const totalCommissionText = commissionTotalPreview(
    value.driverCommission,
    value.representativeCommission,
  );
  const driverPreviewText = commissionTotalPreview(
    value.driverCommission,
    emptyCommission(),
  );
  const repPreviewText = commissionTotalPreview(
    emptyCommission(),
    value.representativeCommission,
  );

  function handleTogglePricing(checked: boolean) {
    if (checked) {
      setPricingOpen(true);
      const draft = pricingDraftRef.current;
      pricingDraftRef.current = null;
      if (draft) {
        onChange({
          ...value,
          netAmount: draft.netAmount,
          taxCategory: draft.taxCategory,
          exemptionCode: draft.exemptionCode,
          exemptionReason: draft.exemptionReason,
        });
      } else {
        onChange({
          ...value,
          netAmount: hasPositiveMoney(value.netAmount) ? value.netAmount : "",
        });
      }
      return;
    }

    if (hasActivePricing(value)) {
      pricingDraftRef.current = {
        netAmount: value.netAmount,
        taxCategory: value.taxCategory,
        exemptionCode: value.exemptionCode,
        exemptionReason: value.exemptionReason,
      };
    }
    setPricingOpen(false);
    onChange({
      ...value,
      netAmount: "0",
      taxCategory: "S",
      exemptionCode: undefined,
      exemptionReason: undefined,
    });
  }

  function handleToggleCommissions(checked: boolean) {
    if (checked) {
      setCommissionsOpen(true);
      const savedDriver = driverDraftRef.current;
      const savedRep = repDraftRef.current;
      driverDraftRef.current = null;
      repDraftRef.current = null;

      if (savedDriver || savedRep) {
        setDriverEnabled(Boolean(savedDriver));
        setRepEnabled(Boolean(savedRep));
        onChange({
          ...value,
          driverCommission: savedDriver ?? emptyCommission(),
          representativeId: savedRep?.representativeId ?? null,
          representativeCommission:
            savedRep?.representativeCommission ?? emptyCommission(),
        });
      }
      return;
    }

    if (hasActiveCommission(value.driverCommission)) {
      driverDraftRef.current = value.driverCommission;
    }
    if (
      value.representativeId ||
      hasActiveCommission(value.representativeCommission)
    ) {
      repDraftRef.current = {
        representativeId: value.representativeId,
        representativeCommission: value.representativeCommission,
      };
    }

    setCommissionsOpen(false);
    setDriverEnabled(false);
    setRepEnabled(false);
    onChange({
      ...value,
      driverCommission: emptyCommission(),
      representativeId: null,
      representativeCommission: emptyCommission(),
    });
  }

  function handleToggleDriverCommission(checked: boolean) {
    if (checked) {
      const draft = driverDraftRef.current;
      driverDraftRef.current = null;
      setDriverEnabled(true);
      onChange({
        ...value,
        driverCommission:
          draft ?? activeCommissionOrEmpty(value.driverCommission),
      });
      return;
    }

    if (hasActiveCommission(value.driverCommission)) {
      driverDraftRef.current = value.driverCommission;
    }
    setDriverEnabled(false);
    onChange({
      ...value,
      driverCommission: emptyCommission(),
    });
  }

  function handleToggleRepCommission(checked: boolean) {
    if (checked) {
      const draft = repDraftRef.current;
      repDraftRef.current = null;
      setRepEnabled(true);
      onChange({
        ...value,
        representativeId:
          draft?.representativeId ?? value.representativeId ?? null,
        representativeCommission:
          draft?.representativeCommission ??
          activeCommissionOrEmpty(value.representativeCommission),
      });
      return;
    }

    if (
      value.representativeId ||
      hasActiveCommission(value.representativeCommission)
    ) {
      repDraftRef.current = {
        representativeId: value.representativeId,
        representativeCommission: value.representativeCommission,
      };
    }
    setRepEnabled(false);
    onChange({
      ...value,
      representativeId: null,
      representativeCommission: emptyCommission(),
    });
  }

  const customerFieldId = `${baseId}-customer`;
  const guestCheckboxId = `${baseId}-same-guest`;
  const pricingCheckboxId = `${baseId}-pricing-toggle`;
  const pricingPanelId = `${baseId}-pricing-panel`;
  const amountFieldId = `${baseId}-net-amount`;
  const exemptionCodeId = `${baseId}-exemption-code`;
  const exemptionReasonId = `${baseId}-exemption-reason`;
  const taxRadioName = `${baseId}-tax-category`;
  const commissionsCheckboxId = `${baseId}-commissions-toggle`;
  const commissionsPanelId = `${baseId}-commissions-panel`;
  const driverCheckboxId = `${baseId}-driver-toggle`;
  const driverPanelId = `${baseId}-driver-panel`;
  const repCheckboxId = `${baseId}-rep-toggle`;
  const repPanelId = `${baseId}-rep-panel`;
  const repSelectId = `${baseId}-representative`;

  return (
    <Card
      className={cn(
        "overflow-hidden",
        embedded &&
          "border-0 rounded-none shadow-none bg-transparent dark:bg-transparent",
      )}
    >
      <CardHeader
        className={cn(
          "border-b theme-border bg-[var(--bg-card-subtle)] px-4 py-3.5 sm:px-5",
          embedded && "hidden md:block",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/30">
              <Wallet className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base">
                {ui("العميل ومستحقات الرحلة — بيانات داخلية")}
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs sm:text-sm">
                {ui(
                  "العميل مسؤول عن الفاتورة. العمولة مستقلة عن سعر العميل ولا تظهر في مستنداته.",
                )}
              </CardDescription>
            </div>
          </div>

          {disabled && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-0.5 text-xs">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{ui("مقفل بعد اعتماد التنفيذ")}</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <fieldset disabled={disabled} className="space-y-4">
          {/* Section 1: Billing Customer */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label
                htmlFor={customerFieldId}
                className="text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)]"
              >
                {ui("العميل المسؤول عن الحساب")}
              </Label>

              <Link
                href="/admin/customers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--accent-gold)] hover:underline"
              >
                <span>{ui("إضافة أو تعديل عميل")}</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div
              className={cn(
                "grid gap-3",
                onGuest ? "sm:grid-cols-12 sm:items-center" : "",
              )}
            >
              <div className={onGuest ? "sm:col-span-8" : ""}>
                <CustomerCombobox
                  id={customerFieldId}
                  value={value.customerId}
                  disabled={disabled}
                  onSelect={(customer) => {
                    setPickedCustomer(customer);
                    onChange({ ...value, customerId: customer?.id ?? null });
                    if (sameGuest && customer) {
                      onGuest?.(customer.name, customer.phone || "");
                    }
                  }}
                />
              </div>

              {onGuest && (
                <div className="sm:col-span-4">
                  <label
                    htmlFor={guestCheckboxId}
                    className={cn(
                      "flex min-h-11 sm:min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors select-none",
                      sameGuest
                        ? "border-[var(--accent-gold)]/60 bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                        : "border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--accent-gold)]/55",
                      disabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <Checkbox
                      id={guestCheckboxId}
                      checked={sameGuest}
                      disabled={disabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSameGuest(checked);
                        if (checked && activeCustomer) {
                          onGuest(
                            activeCustomer.name,
                            activeCustomer.phone || "",
                          );
                        }
                      }}
                    />
                    <UserCheck
                      className="h-4 w-4 text-[var(--accent-gold)] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{ui("العميل هو الضيف")}</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Section 2 & 3: Optional Checkboxes for Pricing and Commissions */}
          <div className="space-y-3.5">
            {/* Option 1: Trip Pricing & VAT Checkbox Card */}
            <div
              className={cn(
                "rounded-xl border transition-colors",
                isPricingOpen
                  ? "border-[var(--accent-gold)]/45 bg-[var(--accent-surface)]/45"
                  : "theme-border bg-[var(--bg-card-subtle)]",
              )}
            >
              <label
                htmlFor={pricingCheckboxId}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-2.5 select-none",
                  disabled && "cursor-not-allowed opacity-70",
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Checkbox
                    id={pricingCheckboxId}
                    checked={isPricingOpen}
                    disabled={disabled}
                    aria-controls={isPricingOpen ? pricingPanelId : undefined}
                    onChange={(e) => handleTogglePricing(e.target.checked)}
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/25">
                    <ReceiptText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm sm:text-base font-bold text-[var(--text-main)]">
                      {ui("تسعير الرحلة والضريبة")}
                    </span>
                    <span className="block text-xs sm:text-sm text-[var(--text-muted)]">
                      {ui(
                        "تحديد قيمة الخدمة ومعاملتها الضريبية لإصدار الفاتورة",
                      )}
                    </span>
                  </span>
                </span>

                {isPricingOpen ? (
                  <Badge variant="gold" className="shrink-0 font-mono">
                    <bdi dir="ltr">{preview.total} SAR</bdi>
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0">
                    {ui("اختياري")}
                  </Badge>
                )}
              </label>

              {isPricingOpen && (
                <div
                  id={pricingPanelId}
                  className="border-t theme-border p-4 sm:p-5"
                >
                  <div className="grid gap-4 lg:grid-cols-12">
                    {/* Amount + Live VAT Breakdown */}
                    <div className="space-y-3 lg:col-span-5">
                      <ExpandableField
                        label={ui("قيمة الخدمة بعد الخصم وقبل الضريبة")}
                        htmlFor={amountFieldId}
                        required
                        dir="ltr"
                        inputMode="decimal"
                        pattern="^\d{1,12}(\.\d{1,2})?$"
                        placeholder="0.00"
                        inputBadge="SAR"
                        disabled={disabled}
                        value={value.netAmount}
                        onApply={(next) =>
                          onChange({ ...value, netAmount: next })
                        }
                      >
                        <Input
                          id={amountFieldId}
                          required
                          dir="ltr"
                          inputMode="decimal"
                          pattern="^\d{1,12}(\.\d{1,2})?$"
                          placeholder="0.00"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          value={value.netAmount}
                          onChange={(e) =>
                            onChange({ ...value, netAmount: e.target.value })
                          }
                          className="font-mono font-semibold"
                        />
                      </ExpandableField>

                      <div
                        role="status"
                        className="grid grid-cols-2 gap-3 rounded-xl border theme-border bg-[var(--bg-card)] p-3"
                      >
                        <div>
                          <span className="block text-xs font-medium text-[var(--text-muted)]">
                            {ui("الضريبة")}
                          </span>
                          <bdi
                            dir="ltr"
                            className="mt-0.5 block font-mono text-sm font-bold tabular-nums text-[var(--text-main)]"
                          >
                            {preview.vat} SAR
                          </bdi>
                        </div>
                        <div className="border-s theme-border ps-3">
                          <span className="block text-xs font-medium text-[var(--text-muted)]">
                            {ui("الإجمالي")}
                          </span>
                          <bdi
                            dir="ltr"
                            className="mt-0.5 block font-mono text-base font-bold tabular-nums text-[var(--accent-gold)]"
                          >
                            {preview.total} SAR
                          </bdi>
                        </div>
                      </div>
                    </div>

                    {/* VAT Treatment Radio Cards (< 6 choices) */}
                    <div className="space-y-2.5 lg:col-span-7">
                      <fieldset className="space-y-2">
                        <legend className="text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)]">
                          {ui("معاملة الرحلة الضريبية")}
                        </legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                          {TAX_CATEGORY_OPTIONS.map((option) => {
                            const checked = value.taxCategory === option.value;
                            return (
                              <label
                                key={option.value}
                                className={cn(
                                  "relative flex min-h-11 sm:min-h-9 cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm transition-all focus-within:ring-2 focus-within:ring-[var(--focus-color)]/35",
                                  checked
                                    ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)] font-bold shadow-2xs"
                                    : "border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-main)] font-medium hover:border-[var(--accent-gold)]/55",
                                  disabled && "cursor-not-allowed opacity-60",
                                )}
                              >
                                <input
                                  type="radio"
                                  name={taxRadioName}
                                  value={option.value}
                                  checked={checked}
                                  onChange={() =>
                                    onChange({
                                      ...value,
                                      taxCategory: option.value,
                                    })
                                  }
                                  className="sr-only"
                                />
                                <span className="flex min-w-0 items-center gap-2">
                                  <span
                                    className={cn(
                                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                                      checked
                                        ? "border-[var(--accent-btn-border)] bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)]"
                                        : "border-[var(--control-border)]",
                                    )}
                                    aria-hidden="true"
                                  >
                                    {checked && (
                                      <Check className="h-2.5 w-2.5" />
                                    )}
                                  </span>
                                  <span className="truncate">
                                    {ui(option.label)}
                                  </span>
                                </span>
                                <Badge
                                  variant={checked ? "gold" : "secondary"}
                                  className="shrink-0 font-mono text-[11px] px-1.5 py-0.5"
                                >
                                  {option.rate}
                                </Badge>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>

                      {value.taxCategory !== "S" && (
                        <div className="grid gap-3 rounded-xl border border-[var(--accent-gold)]/25 bg-[var(--accent-surface)]/55 p-3.5 sm:grid-cols-2">
                          <ExpandableField
                            label={ui("رمز الإعفاء أو المعاملة")}
                            htmlFor={exemptionCodeId}
                            required
                            dir="ltr"
                            disabled={disabled}
                            value={value.exemptionCode || ""}
                            onApply={(next) =>
                              onChange({ ...value, exemptionCode: next })
                            }
                          >
                            <Input
                              id={exemptionCodeId}
                              required
                              autoCorrect="off"
                              autoCapitalize="off"
                              spellCheck={false}
                              value={value.exemptionCode || ""}
                              onChange={(e) =>
                                onChange({
                                  ...value,
                                  exemptionCode: e.target.value,
                                })
                              }
                              className="font-mono"
                            />
                          </ExpandableField>
                          <ExpandableField
                            label={ui("سبب المعاملة الضريبية")}
                            htmlFor={exemptionReasonId}
                            required
                            disabled={disabled}
                            value={value.exemptionReason || ""}
                            onApply={(next) =>
                              onChange({ ...value, exemptionReason: next })
                            }
                          >
                            <Input
                              id={exemptionReasonId}
                              required
                              value={value.exemptionReason || ""}
                              onChange={(e) =>
                                onChange({
                                  ...value,
                                  exemptionReason: e.target.value,
                                })
                              }
                            />
                          </ExpandableField>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Option 2: Trip Commissions Checkbox Card */}
            <div
              className={cn(
                "rounded-xl border transition-colors",
                isCommissionsOpen
                  ? "border-[var(--accent-gold)]/45 bg-[var(--accent-surface)]/45"
                  : "theme-border bg-[var(--bg-card-subtle)]",
              )}
            >
              <label
                htmlFor={commissionsCheckboxId}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-2.5 select-none",
                  disabled && "cursor-not-allowed opacity-70",
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Checkbox
                    id={commissionsCheckboxId}
                    checked={isCommissionsOpen}
                    disabled={disabled}
                    aria-controls={
                      isCommissionsOpen ? commissionsPanelId : undefined
                    }
                    onChange={(e) => handleToggleCommissions(e.target.checked)}
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/25">
                    <Percent className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm sm:text-base font-bold text-[var(--text-main)]">
                      {ui("العمولات")}
                    </span>
                    <span className="block text-xs sm:text-sm text-[var(--text-muted)]">
                      {ui(
                        "تحديد عمولة السائق أو المندوب للرحلة — منفصلة عن سعر العميل",
                      )}
                    </span>
                  </span>
                </span>

                {isCommissionsOpen ? (
                  <Badge variant="gold" className="shrink-0 font-mono">
                    <bdi dir="ltr">
                      {totalCommissionText === "—"
                        ? "—"
                        : `${totalCommissionText} SAR`}
                    </bdi>
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0">
                    {ui("اختياري")}
                  </Badge>
                )}
              </label>

              {isCommissionsOpen && (
                <div
                  id={commissionsPanelId}
                  className="border-t theme-border p-4 sm:p-5 space-y-3.5"
                >
                  <p className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-muted)]">
                    <Info
                      className="h-4 w-4 shrink-0 text-[var(--accent-gold)]"
                      aria-hidden="true"
                    />
                    <span>
                      {ui(
                        "النسبة تُحسب على أساس مستقل تدخله بنفسك، وتستحق بعد اعتماد تنفيذ الرحلة.",
                      )}
                    </span>
                  </p>

                  <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                    {/* Sub-option A: Driver Commission */}
                    <div className="rounded-xl border theme-border bg-[var(--bg-card)] overflow-hidden">
                      <label
                        htmlFor={driverCheckboxId}
                        className={cn(
                          "flex min-h-11 sm:min-h-10 cursor-pointer items-center justify-between gap-2.5 px-3.5 py-2 select-none",
                          disabled && "cursor-not-allowed opacity-70",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Checkbox
                            id={driverCheckboxId}
                            checked={isDriverOpen}
                            disabled={disabled}
                            aria-controls={
                              isDriverOpen ? driverPanelId : undefined
                            }
                            onChange={(e) =>
                              handleToggleDriverCommission(e.target.checked)
                            }
                          />
                          <Users
                            className="h-4 w-4 text-[var(--accent-gold)] shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
                            {ui("عمولة السائق")}
                          </span>
                        </span>

                        <Badge
                          variant={isDriverOpen ? "gold" : "secondary"}
                          className="shrink-0 font-mono"
                        >
                          {isDriverOpen ? (
                            <bdi dir="ltr">
                              {driverPreviewText === "—"
                                ? "—"
                                : `${driverPreviewText} SAR`}
                            </bdi>
                          ) : (
                            ui("غير مفعلة")
                          )}
                        </Badge>
                      </label>

                      {isDriverOpen && (
                        <div
                          id={driverPanelId}
                          className="border-t theme-border p-3.5"
                        >
                          <CommissionMethodFields
                            value={value.driverCommission}
                            onChange={(next) =>
                              onChange({ ...value, driverCommission: next })
                            }
                            disabled={disabled}
                          />
                        </div>
                      )}
                    </div>

                    {/* Sub-option B: Representative Commission */}
                    <div className="rounded-xl border theme-border bg-[var(--bg-card)] overflow-hidden">
                      <label
                        htmlFor={repCheckboxId}
                        className={cn(
                          "flex min-h-11 sm:min-h-10 cursor-pointer items-center justify-between gap-2.5 px-3.5 py-2 select-none",
                          disabled && "cursor-not-allowed opacity-70",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Checkbox
                            id={repCheckboxId}
                            checked={isRepOpen}
                            disabled={disabled}
                            aria-controls={isRepOpen ? repPanelId : undefined}
                            onChange={(e) =>
                              handleToggleRepCommission(e.target.checked)
                            }
                          />
                          <Briefcase
                            className="h-4 w-4 text-[var(--accent-gold)] shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
                            {ui("عمولة المندوب")}
                          </span>
                        </span>

                        <Badge
                          variant={isRepOpen ? "gold" : "secondary"}
                          className="shrink-0 font-mono"
                        >
                          {isRepOpen ? (
                            <bdi dir="ltr">
                              {repPreviewText === "—"
                                ? "—"
                                : `${repPreviewText} SAR`}
                            </bdi>
                          ) : (
                            ui("غير مفعلة")
                          )}
                        </Badge>
                      </label>

                      {isRepOpen && (
                        <div
                          id={repPanelId}
                          className="border-t theme-border p-3.5 space-y-3"
                        >
                          <div className="space-y-1.5">
                            <FullscreenSelect
                              id={repSelectId}
                              label={ui("المندوب الذي أحضر الرحلة")}
                              required={activeMembers.length > 0}
                              searchable={activeMembers.length > 4}
                              clearable
                              placeholder={ui("اختر المندوب")}
                              value={value.representativeId || ""}
                              onChange={(nextId) =>
                                onChange({
                                  ...value,
                                  representativeId: nextId || null,
                                })
                              }
                              options={[
                                { value: "", label: ui("اختر المندوب") },
                                ...activeMembers.map((m) => ({
                                  value: m.id,
                                  label: m.name,
                                })),
                              ]}
                            />

                            {!members.loading && activeMembers.length === 0 && (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--control-border)] px-3 py-2 text-sm text-[var(--text-muted)]">
                                <span>
                                  {ui("لا يوجد مناديب نشطون مسجلون حالياً")}
                                </span>
                                <Link
                                  href="/admin/representatives"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-[var(--accent-gold)] hover:underline"
                                >
                                  <span>{ui("إدارة المناديب")}</span>
                                  <ExternalLink
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />
                                </Link>
                              </div>
                            )}
                          </div>

                          {(activeMembers.length > 0 ||
                            Boolean(value.representativeId) ||
                            members.loading) && (
                            <CommissionMethodFields
                              value={value.representativeCommission}
                              onChange={(next) =>
                                onChange({
                                  ...value,
                                  representativeCommission: next,
                                })
                              }
                              disabled={disabled}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(customers.error || members.error) && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{ui(customers.error || members.error)}</span>
            </div>
          )}
        </fieldset>
      </CardContent>

      {footer && (
        <CardFooter className="mt-0 flex flex-wrap items-center justify-between gap-3 border-t theme-border bg-[var(--bg-card-subtle)] px-5 py-4 sm:px-6">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

function CommissionMethodFields({
  value,
  onChange,
  disabled = false,
}: {
  value: Commission;
  onChange: (v: Commission) => void;
  disabled?: boolean;
}) {
  const ui = useUiText();
  const baseId = React.useId();
  const modeRadioName = `${baseId}-mode`;
  const amountId = `${baseId}-amount`;
  const basisId = `${baseId}-basis`;
  const percentId = `${baseId}-percent`;

  if (value.mode === "NONE") {
    return (
      <p className="text-sm text-[var(--text-muted)]">{ui("بدون عمولة")}</p>
    );
  }

  return (
    <div className="space-y-3">
      <fieldset className="space-y-1.5">
        <legend className="text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)]">
          {ui("طريقة العمولة")}
        </legend>
        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-[var(--bg-card-subtle)] p-1 border theme-border">
          {COMMISSION_METHOD_OPTIONS.map((option) => {
            const checked = value.mode === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "flex min-h-10 sm:min-h-8 cursor-pointer items-center justify-center rounded-md px-2.5 py-1.5 text-center text-xs sm:text-sm leading-snug transition-all focus-within:ring-2 focus-within:ring-[var(--focus-color)]/35",
                  checked
                    ? "bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] border border-[var(--accent-btn-border)] font-bold shadow-2xs"
                    : "text-[var(--text-muted)] font-medium hover:text-[var(--text-main)]",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="radio"
                  name={modeRadioName}
                  value={option.value}
                  checked={checked}
                  onChange={() =>
                    onChange(
                      option.value === "FIXED"
                        ? {
                            mode: "FIXED",
                            amount: hasPositiveMoney(value.amount)
                              ? value.amount
                              : "",
                            base: "0",
                            percent: "0",
                          }
                        : {
                            mode: "PERCENT",
                            amount: "0",
                            base: hasPositiveMoney(value.base)
                              ? value.base
                              : "",
                            percent: hasPositiveMoney(value.percent)
                              ? value.percent
                              : "",
                          },
                    )
                  }
                  className="sr-only"
                />
                <span>{ui(option.label)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {value.mode === "FIXED" && (
        <ExpandableField
          label={ui("مبلغ العمولة")}
          htmlFor={amountId}
          required
          dir="ltr"
          inputMode="decimal"
          pattern="^\d{1,12}(\.\d{1,2})?$"
          placeholder="0.00"
          inputBadge="SAR"
          disabled={disabled}
          value={value.amount}
          onApply={(next) => onChange({ ...value, amount: next })}
        >
          <Input
            id={amountId}
            required
            dir="ltr"
            inputMode="decimal"
            pattern="^\d{1,12}(\.\d{1,2})?$"
            placeholder="0.00"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={value.amount}
            onChange={(e) => onChange({ ...value, amount: e.target.value })}
            className="font-mono"
          />
        </ExpandableField>
      )}

      {value.mode === "PERCENT" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ExpandableField
            label={ui("أساس احتساب العمولة")}
            htmlFor={basisId}
            required
            dir="ltr"
            inputMode="decimal"
            pattern="^\d{1,12}(\.\d{1,2})?$"
            placeholder="0.00"
            inputBadge="SAR"
            disabled={disabled}
            value={value.base}
            onApply={(next) => onChange({ ...value, base: next })}
          >
            <Input
              id={basisId}
              required
              dir="ltr"
              inputMode="decimal"
              pattern="^\d{1,12}(\.\d{1,2})?$"
              placeholder="0.00"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={value.base}
              onChange={(e) => onChange({ ...value, base: e.target.value })}
              className="font-mono"
            />
          </ExpandableField>

          <ExpandableField
            label={ui("نسبة العمولة %")}
            htmlFor={percentId}
            required
            dir="ltr"
            inputMode="decimal"
            pattern="^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$"
            placeholder="0"
            inputBadge="%"
            disabled={disabled}
            value={value.percent}
            onApply={(next) => onChange({ ...value, percent: next })}
          >
            <Input
              id={percentId}
              required
              dir="ltr"
              inputMode="decimal"
              pattern="^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$"
              placeholder="0"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={value.percent}
              onChange={(e) => onChange({ ...value, percent: e.target.value })}
              className="font-mono"
            />
          </ExpandableField>
        </div>
      )}
    </div>
  );
}

export function ContractFinancePanel({ contractId }: { contractId: string }) {
  const ui = useUiText();
  const data = useCommercialData<Commercial | null>(`/contracts/${contractId}`);
  const m = useMutation();
  const [feedbackScope, setFeedbackScope] = React.useState<
    "save" | "execution" | null
  >(null);

  if (data.loading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <Card className="p-6 space-y-4 animate-pulse motion-reduce:animate-none">
          <div className="h-6 w-64 rounded-lg bg-[var(--border-color)]/60" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-11 rounded-xl bg-[var(--border-color)]/60" />
            <div className="h-11 rounded-xl bg-[var(--border-color)]/60" />
          </div>
          <div className="h-24 rounded-xl bg-[var(--bg-card-subtle)]" />
        </Card>
        <Card className="p-6 space-y-4 animate-pulse motion-reduce:animate-none">
          <div className="h-6 w-52 rounded-lg bg-[var(--border-color)]/60" />
          <div className="h-20 rounded-xl bg-[var(--bg-card-subtle)]" />
        </Card>
      </div>
    );
  }

  if (data.error) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-700 dark:text-rose-300"
      >
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{ui(data.error)}</span>
      </div>
    );
  }

  return (
    <ContractFinanceEditor
      key={data.data?.version || 0}
      initial={data.data}
      contractId={contractId}
      reload={data.reload}
      m={m}
      feedbackScope={feedbackScope}
      setFeedbackScope={setFeedbackScope}
    />
  );
}

function ContractFinanceEditor({
  initial,
  contractId,
  reload,
  m,
  feedbackScope,
  setFeedbackScope,
}: {
  initial: Commercial | null;
  contractId: string;
  reload: () => void;
  m: ReturnType<typeof useMutation>;
  feedbackScope: "save" | "execution" | null;
  setFeedbackScope: React.Dispatch<
    React.SetStateAction<"save" | "execution" | null>
  >;
}) {
  const ui = useUiText();
  const baseId = React.useId();
  const executionDayId = `${baseId}-execution-day`;
  const cancelReasonId = `${baseId}-cancel-reason`;

  const [v, setV] = React.useState<CommercialInput>(
    initial
      ? {
          customerId: initial.customerId,
          netAmount: initial.netAmount,
          taxCategory: initial.taxCategory,
          exemptionCode: initial.exemptionCode || undefined,
          exemptionReason: initial.exemptionReason || undefined,
          driverCommission: initial.driverCommission,
          representativeId: initial.representativeId,
          representativeCommission: initial.representativeCommission,
        }
      : emptyCommercial(),
  );
  const [day, setDay] = React.useState(currentSaudiPeriod().day);
  const [reason, setReason] = React.useState("");

  async function submitFinancial(e: React.FormEvent) {
    e.preventDefault();
    setFeedbackScope("save");
    await m.run(
      () =>
        commercialRequest(`/contracts/${contractId}`, "PUT", {
          version: initial?.version || 0,
          commercial: normalizeCommercialInput(v),
        }),
      reload,
    );
  }

  async function submitComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!initial) return;
    setFeedbackScope("execution");
    await m.run(
      () =>
        commercialRequest(`/contracts/${contractId}/complete`, "POST", {
          day,
          version: initial.version,
        }),
      reload,
    );
  }

  async function submitCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!initial) return;
    setFeedbackScope("execution");
    await m.run(
      () =>
        commercialRequest(`/contracts/${contractId}/cancel`, "POST", {
          reason,
          version: initial.version,
        }),
      reload,
    );
  }

  const isCompleted = initial?.executionStatus === "COMPLETED";

  const renderFeedback = (scope: "save" | "execution") => {
    if (feedbackScope !== scope) return null;
    if (!m.error && !m.message) return null;

    if (m.error) {
      return (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{ui(m.error)}</span>
        </div>
      );
    }

    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{ui(m.message)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submitFinancial}>
        <CommercialFields
          value={v}
          onChange={setV}
          disabled={isCompleted}
          footer={
            !isCompleted ? (
              <>
                <div className="flex-1">{renderFeedback("save")}</div>
                <Button
                  type="submit"
                  variant="gold"
                  disabled={m.busy}
                  className="w-full sm:w-auto"
                >
                  {m.busy && feedbackScope === "save" ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{ui("حفظ بيانات العميل والمستحقات")}</span>
                </Button>
              </>
            ) : undefined
          }
        />
      </form>

      {initial && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b theme-border bg-[var(--bg-card-subtle)] px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/30">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      {ui("تنفيذ الرحلة واستحقاق العمولة")}
                    </CardTitle>

                    {initial.executionStatus === "COMPLETED" ? (
                      <Badge variant="success">{ui("تم التنفيذ")}</Badge>
                    ) : initial.executionStatus === "CANCELLED" ? (
                      <Badge variant="destructive">{ui("أُلغيت")}</Badge>
                    ) : (
                      <Badge variant="warning">{ui("لم تُنفذ")}</Badge>
                    )}

                    {initial.reportedAt && (
                      <Badge variant="gold" className="gap-1">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        <span>{ui("أبلغ السائق عن التنفيذ")}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {initial.customerId && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/customers/${initial.customerId}`}>
                    <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{ui("الفواتير وكشف الحساب")}</span>
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            {initial.executionStatus === "PENDING" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Complete & Accrue Commission Card */}
                <form
                  onSubmit={submitComplete}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <CalendarCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300"
                        aria-hidden="true"
                      />
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                          {ui("اعتماد التنفيذ واستحقاق العمولة")}
                        </h4>
                        <p className="mt-0.5 text-xs sm:text-sm text-[var(--text-muted)]">
                          {ui(
                            "يؤكد إتمام الرحلة ويفعّل استحقاق العمولات وإمكانية إصدار الفاتورة الضريبية.",
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={executionDayId}>
                        {ui("تاريخ التنفيذ الفعلي")}
                      </Label>
                      <Input
                        id={executionDayId}
                        required
                        type="date"
                        max={currentSaudiPeriod().day}
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    disabled={m.busy}
                    className="w-full sm:w-auto self-start"
                  >
                    {m.busy && feedbackScope === "execution" ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>{ui("اعتماد التنفيذ واستحقاق العمولة")}</span>
                  </Button>
                </form>

                {/* Cancel Before Execution Card */}
                <form
                  onSubmit={submitCancel}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Ban
                        className="mt-0.5 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-300"
                        aria-hidden="true"
                      />
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                          {ui("إلغاء قبل التنفيذ")}
                        </h4>
                        <p className="mt-0.5 text-xs sm:text-sm text-[var(--text-muted)]">
                          {ui(
                            "يغلق سجل التنفيذ للرحلة مع تسجيل السبب دون احتساب عمولات.",
                          )}
                        </p>
                      </div>
                    </div>

                    <ExpandableField
                      label={ui("سبب إلغاء التنفيذ")}
                      htmlFor={cancelReasonId}
                      required
                      disabled={m.busy}
                      value={reason}
                      onApply={setReason}
                    >
                      <Input
                        id={cancelReasonId}
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </ExpandableField>
                  </div>

                  <Button
                    type="submit"
                    variant="outline"
                    disabled={m.busy}
                    className="w-full sm:w-auto self-start border-rose-500/35 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Ban className="h-4 w-4" aria-hidden="true" />
                    <span>{ui("إلغاء قبل التنفيذ")}</span>
                  </Button>
                </form>
              </div>
            ) : initial.executionStatus === "COMPLETED" ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 text-xs">
                <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{ui("تم التنفيذ")}</span>
                </div>
                {initial.executedOn && (
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>{ui("تاريخ التنفيذ المعتمد")}:</span>
                    <bdi
                      dir="ltr"
                      className="font-mono font-bold text-[var(--text-main)]"
                    >
                      {initial.executedOn.slice(0, 10)}
                    </bdi>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.05] p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{ui("تم إغلاق سجل التنفيذ قبل بدء الرحلة")}</span>
              </div>
            )}

            {renderFeedback("execution")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
