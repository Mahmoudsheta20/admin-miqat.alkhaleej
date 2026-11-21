"use client";
import { useUiText } from "@/lib/ui-text";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Percent,
  Receipt,
  RotateCcw,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  accountingRequest,
  CATEGORY_ACCOUNTS,
  currentSaudiPeriod,
  EXPENSE_CATEGORIES,
  filterCashBankAccounts,
  purchaseInclusive,
  purchasePreview,
  TAX_TREATMENTS,
  type Account,
  type PurchaseInput,
  type PurchaseRow,
} from "@/lib/accounting";
import { getVehicles } from "@/app/_actions/fleet";
import type { Vehicle } from "@/lib/types";
import { moneyDecimal, moneyMinor } from "@/lib/money";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import { useApiQuery } from "@/lib/use-api-query";

interface Props {
  existing?: PurchaseRow;
  initialDocumentType?: "PURCHASE_INVOICE" | "PURCHASE_RETURN";
  onClose: () => void;
  onSaved: () => void;
}

interface OriginalOption {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  voucherNumber: number;
}

const INPUT_STYLE =
  "theme-input mt-1.5 min-h-11 sm:min-h-9 w-full rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";

export default function PurchaseForm({
  existing,
  initialDocumentType = "PURCHASE_INVOICE",
  onClose,
  onSaved,
}: Props) {
  const ui = useUiText();
  const isEn = ui.language === "en";
  const text = (ar: string, en: string) => (isEn ? en : ar);

  const dialog = useRef<HTMLDialogElement>(null);
  const key = useRef("");

  const [form, setForm] = useState<PurchaseInput>(() =>
    existing
      ? {
          supplierName: existing.supplierName,
          supplierVatNumber: existing.supplierVatNumber || "",
          invoiceNumber: existing.invoiceNumber,
          issueDate: existing.issueDate,
          vatDate: existing.vatDate,
          category: existing.category,
          taxTreatment: existing.taxTreatment,
          netAmount: existing.netAmount,
          vatAmount: existing.vatAmount,
          recoverablePercent: existing.recoverablePercent,
          evidenceReference: existing.evidenceReference || "",
          vehiclePlate: existing.vehiclePlate || "",
          notes: existing.notes || "",
          documentType: existing.documentType || "PURCHASE_INVOICE",
          originalPurchaseId: existing.originalPurchaseId,
          accountCode: existing.accountCode || CATEGORY_ACCOUNTS[existing.category],
          paymentAccountCode: existing.paymentAccountCode || "2101",
          vehicleId: existing.vehicleId,
          postImmediately: existing.postingStatus !== "DRAFT",
        }
      : {
          supplierName: "",
          supplierVatNumber: "",
          invoiceNumber: "",
          issueDate: currentSaudiPeriod().day,
          vatDate: currentSaudiPeriod().day,
          category: "FUEL",
          taxTreatment: "STANDARD",
          netAmount: "",
          vatAmount: "0.00",
          recoverablePercent: "0",
          evidenceReference: "",
          vehiclePlate: "",
          notes: "",
          documentType: initialDocumentType,
          accountCode: "5101",
          paymentAccountCode: "2101",
          postImmediately: true,
        },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState("");
  const [inclusive, setInclusive] = useState(false);
  const [gross, setGross] = useState(existing?.totalAmount || "");
  const [originalSearch, setOriginalSearch] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [manualPlateMode, setManualPlateMode] = useState(
    Boolean(existing?.vehiclePlate && !existing?.vehicleId),
  );

  const isReturn = form.documentType === "PURCHASE_RETURN";
  const accounts = useAccountingQuery<{ items: Account[] }>("/accounts");
  const originals = useApiQuery<{ items: OriginalOption[] }>(
    isReturn && !existing
      ? `/accounting/purchase-originals?search=${encodeURIComponent(originalSearch)}`
      : null,
  );
  const cashBankAccounts = filterCashBankAccounts(accounts.data?.items);
  const extraCashBank = cashBankAccounts.filter(
    (a) => a.code !== "1101" && a.code !== "1102",
  );
  const isRecoverable = Number(form.recoverablePercent) > 0;
  const isZeroTaxExpense = ["DRIVER_PAYROLL", "GOVERNMENT_FEES"].includes(
    form.category,
  );

  useEffect(() => {
    dialog.current?.showModal();
    key.current = crypto.randomUUID();
  }, []);

  useEffect(() => {
    let active = true;
    void getVehicles().then((res) => {
      if (!active) return;
      setVehicles(res.vehicles || []);
    });
    return () => {
      active = false;
    };
  }, []);

  const update = (change: Partial<PurchaseInput>) =>
    setForm((v) => ({ ...v, ...change }));

  async function selectOriginal(id: string) {
    if (!id) {
      update({ originalPurchaseId: undefined });
      return;
    }
    setIsSelecting(true);
    const result = await accountingRequest<PurchaseRow>(`/purchases/${id}`);
    if (result.data) {
      const v = result.data;
      update({
        originalPurchaseId: id,
        supplierName: v.supplierName,
        supplierVatNumber: v.supplierVatNumber || "",
        category: v.category,
        accountCode: v.accountCode,
        taxTreatment: v.taxTreatment,
        recoverablePercent: v.recoverablePercent,
        paymentAccountCode: v.paymentAccountCode,
        vehiclePlate: v.vehiclePlate || "",
        vehicleId: v.vehicleId,
        evidenceReference: v.evidenceReference || "",
        netAmount: "",
        vatAmount: "0.00",
      });
      setGross("");
      setManualPlateMode(Boolean(v.vehiclePlate && !v.vehicleId));
    } else {
      setError(result.error || "تعذر تحميل أصل الفاتورة؛ تأكد من رقم المستند.");
    }
    setIsSelecting(false);
  }

  function changeCategory(cat: PurchaseInput["category"]) {
    const isSpecialZero = ["DRIVER_PAYROLL", "GOVERNMENT_FEES"].includes(cat);
    update({
      category: cat,
      accountCode: CATEGORY_ACCOUNTS[cat],
      ...(isSpecialZero
        ? {
            taxTreatment: "OUT_OF_SCOPE",
            vatAmount: "0.00",
            recoverablePercent: "0",
          }
        : { taxTreatment: "STANDARD" }),
    });
    if (isSpecialZero) setInclusive(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSaving || isSelecting) return;
    setError("");

    const netMinor = moneyMinor(form.netAmount);
    const vatMinor = moneyMinor(form.vatAmount);
    if (netMinor === null || netMinor <= BigInt(0)) {
      setError(
        isEn
          ? "Enter a valid net amount greater than 0.00."
          : "يرجى إدخال صافي مبلغ صحيح أكبر من 0.00.",
      );
      return;
    }
    if (vatMinor === null || vatMinor < BigInt(0)) {
      setError(
        isEn
          ? "Enter a valid VAT amount (0.00 or higher)."
          : "يرجى إدخال قيمة ضريبة صحيحة (0.00 فأكثر).",
      );
      return;
    }
    if (form.taxTreatment === "STANDARD" && isRecoverable) {
      const pctMinor = moneyMinor(form.recoverablePercent);
      if (
        pctMinor === null ||
        pctMinor <= BigInt(0) ||
        pctMinor > BigInt(10000)
      ) {
        setError(
          isEn
            ? "Recoverable VAT percentage must be between 0.01 and 100."
            : "يجب أن تكون نسبة الخصم القابلة للاسترداد بين 0.01 و 100.",
        );
        return;
      }
    }

    setIsSaving(true);

    const purchase = {
      ...form,
      supplierVatNumber: form.supplierVatNumber?.trim() || undefined,
      originalPurchaseId: isReturn ? form.originalPurchaseId : undefined,
      recoverablePercent:
        form.taxTreatment === "STANDARD" ? form.recoverablePercent : "0",
      evidenceReference: isRecoverable ? form.evidenceReference : undefined,
      vehiclePlate: form.vehiclePlate?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      vehicleId: form.vehicleId || undefined,
    };

    const result = await accountingRequest<PurchaseRow>(
      existing ? `/purchases/${existing.id}` : "/purchases",
      existing ? "PUT" : "POST",
      existing
        ? { purchase, version: existing.version }
        : { purchase, operationKey: key.current },
    );

    if (result.success && attachmentFile && (result.data?.id || existing?.id)) {
      const targetId = result.data?.id || existing?.id;
      const body = new FormData();
      body.set("file", attachmentFile);
      const uploadRes = await accountingRequest(
        `/purchases/${targetId}/attachments`,
        "POST",
        body,
      );
      if (!uploadRes.success) {
        setIsSaving(false);
        setError(uploadRes.error || "تم حفظ السند ولكن تعذر رفع المرفق");
        return;
      }
    }

    setIsSaving(false);
    if (result.success) onSaved();
    else setError(result.error || "تعذر حفظ مستند المصروف؛ يرجى مراجعة البيانات.");
  }

  const totals = inclusive
    ? purchaseInclusive(gross || "0", form.taxTreatment === "STANDARD")
    : {
        net: moneyDecimal(moneyMinor(form.netAmount || "0") ?? BigInt(0)),
        ...purchasePreview(form.netAmount || "0", form.vatAmount || "0"),
      };

  const taxSplit = useMemo(() => {
    const vatMinor = moneyMinor(totals.vat) ?? BigInt(0);
    const pctMinor = moneyMinor(form.recoverablePercent || "0") ?? BigInt(0);
    if (form.taxTreatment !== "STANDARD" || vatMinor <= BigInt(0)) {
      return { recoverable: "0.00", addedToCost: "0.00" };
    }
    const clampedPct = pctMinor > BigInt(10000) ? BigInt(10000) : pctMinor < BigInt(0) ? BigInt(0) : pctMinor;
    const recMinor = (vatMinor * clampedPct + BigInt(5000)) / BigInt(10000);
    const costMinor = vatMinor - recMinor;
    return {
      recoverable: moneyDecimal(recMinor),
      addedToCost: moneyDecimal(costMinor),
    };
  }, [totals.vat, form.recoverablePercent, form.taxTreatment]);

  const vehicleSelectValue = manualPlateMode
    ? "MANUAL"
    : form.vehicleId
      ? form.vehicleId
      : form.vehiclePlate
        ? vehicles.find((v) => v.plateNumberAr === form.vehiclePlate)?.id || "MANUAL"
        : "";

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!isSaving) onClose();
      }}
      onClose={onClose}
      aria-labelledby="purchase-title"
      className="theme-card mobile-dialog-panel m-auto max-h-[92dvh] w-[calc(100%_-_24px)] max-w-3xl rounded-3xl p-0 text-[var(--text-main)] shadow-2xl backdrop:bg-black/60 overflow-hidden"
      dir={ui.dir}
    >
      <form onSubmit={submit} className="flex flex-col max-h-[92dvh]">
        {/* Modal Header */}
        <header className="flex items-center justify-between gap-4 border-b theme-border px-6 py-4 bg-[var(--bg-card-subtle)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center shrink-0">
              {isReturn ? (
                <RotateCcw className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Receipt className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2
                id="purchase-title"
                className="text-base sm:text-lg font-semibold text-[var(--text-main)]"
              >
                {ui(
                  existing
                    ? `تعديل مستند ${existing.voucher}`
                    : isReturn
                      ? "تسجيل مرتجع مشتريات (إشعار دائن من مورد)"
                      : "تسجيل فاتورة مصروف أو مشتريات",
                )}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {ui("تُحفظ الفاتورة والضريبة بالريال السعودي مع أرشفة المستند.")}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            aria-label={ui("إغلاق")}
            className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition cursor-pointer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        {/* Modal Body */}
        <div className="space-y-6 px-6 py-6 overflow-y-auto flex-1">
          {/* Document Type Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={Boolean(existing)}
              onClick={() =>
                update({
                  documentType: "PURCHASE_INVOICE",
                  originalPurchaseId: undefined,
                })
              }
              className={`min-h-11 p-3 rounded-2xl border text-start transition cursor-pointer flex items-center gap-2.5 ${
                !isReturn
                  ? "bg-[var(--accent-surface)] border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/30"
                  : "theme-card border-[var(--control-border)] hover:border-[var(--accent-gold)]"
              }`}
            >
              <Receipt
                className={`w-4 h-4 shrink-0 ${!isReturn ? "text-[var(--accent-gold)]" : "text-[var(--text-muted)]"}`}
                aria-hidden="true"
              />
              <div>
                <strong className="text-xs font-semibold block text-[var(--text-main)]">
                  {ui("فاتورة مشتريات / مصروف")}
                </strong>
                <span className="text-xs text-[var(--text-muted)]">
                  {ui("إثبات تكلفة جديدة للأسطول")}
                </span>
              </div>
            </button>

            <button
              type="button"
              disabled={Boolean(existing)}
              onClick={() => update({ documentType: "PURCHASE_RETURN" })}
              className={`min-h-11 p-3 rounded-2xl border text-start transition cursor-pointer flex items-center gap-2.5 ${
                isReturn
                  ? "bg-rose-500/10 border-rose-500 ring-1 ring-rose-500/30"
                  : "theme-card border-[var(--control-border)] hover:border-[var(--accent-gold)]"
              }`}
            >
              <RotateCcw
                className={`w-4 h-4 shrink-0 ${isReturn ? "text-rose-700 dark:text-rose-400" : "text-[var(--text-muted)]"}`}
                aria-hidden="true"
              />
              <div>
                <strong className="text-xs font-semibold block text-[var(--text-main)]">
                  {ui("مرتجع مورد (إشعار دائن)")}
                </strong>
                <span className="text-xs text-[var(--text-muted)]">
                  {ui("رد بضاعة أو تخفيض مصروف")}
                </span>
              </div>
            </button>
          </div>

          {/* Supplier Return Picker */}
          {isReturn && (
            <section className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{ui("ربط المرتجع بفاتورة المورد الأصلية *")}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-[var(--text-main)]">
                  {ui("بحث عن الفاتورة الأصلية")}
                  <input
                    disabled={Boolean(existing)}
                    className={INPUT_STYLE}
                    value={originalSearch}
                    onChange={(e) => setOriginalSearch(e.target.value)}
                    placeholder={ui("اسم المورد أو رقم الفاتورة...")}
                  />
                </label>
                <label className="text-xs font-bold text-[var(--text-main)]">
                  {ui("اختر فاتورة معتمدة *")}
                  <select
                    required
                    disabled={Boolean(existing) || isSelecting}
                    aria-label={ui("فاتورة المورد الأصلية")}
                    className={INPUT_STYLE}
                    value={form.originalPurchaseId || ""}
                    onChange={(e) => void selectOriginal(e.target.value)}
                  >
                    <option value="">{ui("اختر فاتورة من القائمة")}</option>
                    {form.originalPurchaseId &&
                      !originals.data?.items.some(
                        (v) => v.id === form.originalPurchaseId,
                      ) && (
                        <option value={form.originalPurchaseId}>
                          {ui("الفاتورة الأصلية المحددة ·")}{" "}
                          {form.supplierName}
                        </option>
                      )}
                    {originals.data?.items.map((v) => (
                      <option key={v.id} value={v.id}>
                        EXP-{String(v.voucherNumber).padStart(5, "0")} ·{" "}
                        {v.supplierName} · {v.invoiceNumber}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {ui(
                  "يتم نسخ بيانات المورد والحساب والضريبة تلقائياً من الأصل، ولا يتجاوز مبلغ المرتجع الرصيد المتبقي.",
                )}
              </p>
            </section>
          )}

          {/* SECTION 1: Expense & Supplier Data */}
          <section className="p-4 sm:p-5 rounded-2xl theme-card border theme-border space-y-4">
            <div className="border-b theme-border pb-2.5">
              <h3 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>{ui("١. بيانات المصروف والمورد")}</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {ui("أدخل بيانات المورد ورقم المستند وتصنيف المصروف والمركبة.")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-[var(--text-main)]">
                {ui("اسم المورد *")}
                <input
                  required
                  readOnly={isReturn}
                  maxLength={200}
                  className={INPUT_STYLE}
                  placeholder={ui("مثال: شركة نفط للوقود، ورشة السلامة...")}
                  value={form.supplierName}
                  onChange={(e) => update({ supplierName: e.target.value })}
                />
              </label>

              <label className="text-xs font-bold text-[var(--text-main)]">
                {ui("الرقم الضريبي للمورد")}{" "}
                {ui(isRecoverable ? "*" : "(اختياري)")}
                <input
                  required={isRecoverable}
                  readOnly={isReturn}
                  pattern="3[0-9]{13}3"
                  maxLength={15}
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="300000000000003"
                  className={`${INPUT_STYLE} font-mono`}
                  value={form.supplierVatNumber || ""}
                  onChange={(e) =>
                    update({ supplierVatNumber: e.target.value })
                  }
                />
              </label>

              <label className="text-xs font-bold text-[var(--text-main)]">
                {ui("رقم مستند المورد (رقم الفاتورة) *")}
                <input
                  required
                  maxLength={200}
                  className={INPUT_STYLE}
                  placeholder={ui("مثال: INV-9842")}
                  value={form.invoiceNumber}
                  onChange={(e) => update({ invoiceNumber: e.target.value })}
                />
              </label>

              <label className="text-xs font-bold text-[var(--text-main)]">
                {ui("تصنيف المصروف *")}
                <select
                  disabled={isReturn}
                  className={INPUT_STYLE}
                  value={form.category}
                  onChange={(e) =>
                    changeCategory(
                      e.target.value as PurchaseInput["category"],
                    )
                  }
                >
                  {Object.entries(EXPENSE_CATEGORIES).map(([catKey, label]) => (
                    <option key={catKey} value={catKey}>
                      {ui(label)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-bold text-[var(--text-main)]">
                {ui("تاريخ فاتورة المورد *")}
                <input
                  required
                  type="date"
                  className={INPUT_STYLE}
                  value={form.issueDate}
                  onChange={(e) =>
                    update({
                      issueDate: e.target.value,
                      ...(form.vatDate === form.issueDate
                        ? { vatDate: e.target.value }
                        : {}),
                    })
                  }
                />
              </label>

              <label className="text-xs font-bold text-[var(--text-main)]">
                {ui("المركبة المرتبطة")}{" "}
                <span className="text-[var(--text-muted)] font-normal">
                  {ui("(اختياري)")}
                </span>
                <div className="relative">
                  <Truck
                    className="w-4 h-4 text-[var(--text-muted)] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <select
                    disabled={isReturn}
                    className={`${INPUT_STYLE} ps-10`}
                    value={vehicleSelectValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setManualPlateMode(false);
                        update({ vehicleId: undefined, vehiclePlate: "" });
                      } else if (val === "MANUAL") {
                        setManualPlateMode(true);
                        update({ vehicleId: undefined });
                      } else {
                        const found = vehicles.find((v) => v.id === val);
                        setManualPlateMode(false);
                        update({
                          vehicleId: found?.id,
                          vehiclePlate: found?.plateNumberAr || "",
                        });
                      }
                    }}
                  >
                    <option value="">
                      {text("— مصروف عام (بدون مركبة) —", "— General (No vehicle) —")}
                    </option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumberAr} · {v.make} {v.model}
                      </option>
                    ))}
                    <option value="MANUAL">
                      {text("إدخال رقم لوحة يدوياً...", "Enter plate manually...")}
                    </option>
                  </select>
                </div>
              </label>

              {manualPlateMode && (
                <label className="text-xs font-bold text-[var(--text-main)] sm:col-span-2">
                  {ui("لوحة المركبة المرتبطة (إدخال يدوي)")}
                  <input
                    maxLength={50}
                    readOnly={isReturn}
                    className={INPUT_STYLE}
                    placeholder={ui("مثال: أ ب ج 1234")}
                    value={form.vehiclePlate || ""}
                    onChange={(e) =>
                      update({ vehicleId: undefined, vehiclePlate: e.target.value })
                    }
                  />
                </label>
              )}
            </div>
          </section>

          {/* SECTION 2: Amount & Tax Treatment */}
          <section className="p-4 sm:p-5 rounded-2xl theme-card border theme-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-2.5">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
                  <span>{ui("٢. المبلغ والضريبة")}</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {ui("اختر طريقة إدخال السعر وخصم ضريبة المدخلات.")}
                </p>
              </div>

              {/* Clean Segmented Input Mode Control */}
              <div
                role="group"
                aria-label={text("طريقة إدخال السعر", "Price entry mode")}
                className="inline-flex rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] p-1 gap-1"
              >
                <button
                  type="button"
                  disabled={isZeroTaxExpense}
                  aria-pressed={!inclusive}
                  onClick={() => setInclusive(false)}
                  className={`min-h-9 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                    !inclusive
                      ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/45"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  {text("قبل الضريبة", "Before VAT")}
                </button>
                <button
                  type="button"
                  disabled={isZeroTaxExpense || form.taxTreatment !== "STANDARD"}
                  aria-pressed={inclusive}
                  onClick={() => {
                    setInclusive(true);
                    setGross(
                      purchasePreview(form.netAmount, form.vatAmount).total,
                    );
                  }}
                  className={`min-h-9 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                    inclusive
                      ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/45"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  {text("شامل 15%", "Includes 15%")}
                </button>
              </div>
            </div>

            {/* Amount Fields */}
            <div className="grid gap-4 sm:grid-cols-3">
              {inclusive && (
                <label className="text-xs font-bold text-[var(--text-main)]">
                  {ui("الإجمالي المدفوع شامل الضريبة *")}
                  <div className="relative">
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      placeholder="0.00"
                      className={`${INPUT_STYLE} font-mono font-bold pl-3 pr-12`}
                      value={gross}
                      onChange={(e) => {
                        setGross(e.target.value);
                        const v = purchaseInclusive(
                          e.target.value,
                          form.taxTreatment === "STANDARD",
                        );
                        update({ netAmount: v.net, vatAmount: v.vat });
                      }}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-bold">
                      {ui("ر.س")}
                    </span>
                  </div>
                </label>
              )}

              <label className="text-xs font-bold text-[var(--text-main)]">
                {ui("المبلغ قبل الضريبة (الصافي) *")}
                <div className="relative">
                  <input
                    required
                    readOnly={inclusive}
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="0.00"
                    className={`${INPUT_STYLE} font-mono font-bold pl-3 pr-12 ${inclusive ? "bg-[var(--bg-card-subtle)]" : ""}`}
                    value={form.netAmount}
                    onChange={(e) =>
                      update({
                        netAmount: e.target.value,
                        vatAmount:
                          form.taxTreatment === "STANDARD"
                            ? purchasePreview(e.target.value).vat
                            : "0.00",
                      })
                    }
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-bold">
                    {ui("ر.س")}
                  </span>
                </div>
              </label>

              <label className="text-xs font-bold text-[var(--text-main)]">
                {ui("ضريبة 15% *")}
                <div className="relative">
                  <input
                    required
                    readOnly={inclusive || form.taxTreatment !== "STANDARD"}
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="0.00"
                    className={`${INPUT_STYLE} font-mono font-bold pl-3 pr-12 ${inclusive || form.taxTreatment !== "STANDARD" ? "bg-[var(--bg-card-subtle)]" : ""}`}
                    value={form.vatAmount}
                    onChange={(e) => update({ vatAmount: e.target.value })}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-bold">
                    {ui("ر.س")}
                  </span>
                </div>
              </label>

              {!inclusive && (
                <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border flex flex-col justify-center">
                  <span className="text-xs text-[var(--text-muted)]">
                    {ui("الإجمالي الشامل المحسوب:")}
                  </span>
                  <strong className="text-base font-semibold font-mono text-[var(--text-main)] mt-0.5">
                    <bdi dir="ltr">{totals.total}</bdi> {ui("ر.س")}
                  </strong>
                </div>
              )}
            </div>

            {/* Live Breakdown Strip */}
            <div className="rounded-xl bg-[var(--bg-card-subtle)] border theme-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[var(--text-muted)]">
                {text("الصافي", "Net")}:{" "}
                <strong className="font-mono text-[var(--text-main)]" dir="ltr">
                  {totals.net} {ui("ر.س")}
                </strong>
              </span>
              <span className="text-[var(--text-muted)]">
                {text("الضريبة", "VAT")}:{" "}
                <strong className="font-mono text-[var(--accent-gold)]" dir="ltr">
                  {totals.vat} {ui("ر.س")}
                </strong>
              </span>
              <span className="text-[var(--text-muted)]">
                {text("الإجمالي", "Total")}:{" "}
                <strong className="font-mono text-[var(--text-main)]" dir="ltr">
                  {totals.total} {ui("ر.س")}
                </strong>
              </span>
            </div>

            {/* Tax Deductibility Question */}
            {form.taxTreatment === "STANDARD" ? (
              <div className="p-4 rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)]/75 space-y-3">
                <label className="flex min-h-11 items-start gap-2.5 text-xs font-semibold text-[var(--text-main)] cursor-pointer">
                  <Checkbox
                    disabled={isReturn}
                    checked={isRecoverable}
                    onChange={(e) =>
                      update({
                        recoverablePercent: e.target.checked ? "100" : "0",
                      })
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <span>
                      {ui("هل يمكن خصم ضريبة هذه الفاتورة في الإقرار الضريبي؟")}
                    </span>
                    <p className="text-xs text-[var(--text-muted)] font-normal mt-0.5">
                      {ui(
                        "يُشترط توفر فاتورة ضريبية رسمية باسم المنشأة وتحتوي على الرقم الضريبي للمورد.",
                      )}
                    </p>
                  </div>
                </label>

                {isRecoverable && (
                  <div className="space-y-3 pt-2 border-t border-[var(--accent-gold)]/25">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-bold text-[var(--text-main)]">
                        {ui("نسبة الخصم القابلة للاسترداد (%) *")}
                        <input
                          required
                          readOnly={isReturn}
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          className={`${INPUT_STYLE} font-mono`}
                          value={form.recoverablePercent}
                          onChange={(e) =>
                            update({ recoverablePercent: e.target.value })
                          }
                        />
                      </label>

                      <label className="text-xs font-bold text-[var(--text-main)]">
                        {ui("مرجع المستند الضريبي المؤيد *")}
                        <input
                          required
                          maxLength={200}
                          placeholder={ui(
                            "مثال: فاتورة ضريبية 9481 / إيصال إلكتروني",
                          )}
                          className={INPUT_STYLE}
                          value={form.evidenceReference || ""}
                          onChange={(e) =>
                            update({ evidenceReference: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      <div className="rounded-lg bg-[var(--bg-card)] border theme-border px-3 py-2 flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">
                          {text("ضريبة تُخصم بالإقرار", "Deductible VAT")}
                        </span>
                        <strong className="font-mono text-emerald-700 dark:text-emerald-300" dir="ltr">
                          {taxSplit.recoverable} {ui("ر.س")}
                        </strong>
                      </div>
                      <div className="rounded-lg bg-[var(--bg-card)] border theme-border px-3 py-2 flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">
                          {text("تُضاف لتكلفة المصروف", "Added to expense")}
                        </span>
                        <strong className="font-mono text-[var(--text-main)]" dir="ltr">
                          {taxSplit.addedToCost} {ui("ر.س")}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                <span>
                  {ui("هذا المصروف (")}
                  {ui(TAX_TREATMENTS[form.taxTreatment])}
                  {ui(
                    ") غير خاضع لضريبة المدخلات وتم ضبط الضريبة على 0.00 ر.س لضمان دقة إقرار هيئة الزكاة.",
                  )}
                </span>
              </div>
            )}
          </section>

          {/* SECTION 3: Payment, Attachments & Notes */}
          <section className="p-4 sm:p-5 rounded-2xl theme-card border theme-border space-y-4">
            <div className="border-b theme-border pb-2.5">
              <h3 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>{ui("٣. طريقة الدفع والمرفقات")}</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {ui("حدد كيف تم السداد للمورد وأرفق صورة أو PDF الفاتورة.")}
              </p>
            </div>

            {/* Clean Payment Method Cards */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-[var(--text-main)] block">
                {ui("كيف تم سداد المبلغ؟ *")}
              </span>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {[
                  {
                    code: "2101",
                    label: text("آجل على المورد", "Pay Later"),
                    sub: text("يُسدد لاحقاً", "Due to supplier"),
                    icon: Receipt,
                  },
                  {
                    code: "1102",
                    label: text("تحويل بنكي", "Bank Transfer"),
                    sub: text("مدفوع من البنك", "Paid from bank"),
                    icon: Landmark,
                  },
                  {
                    code: "1101",
                    label: text("نقداً", "Cash"),
                    sub: text("مدفوع من الصندوق", "Paid in cash"),
                    icon: Wallet,
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = form.paymentAccountCode === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ paymentAccountCode: opt.code })}
                      className={`min-h-11 p-3 rounded-xl border text-start transition flex items-center gap-2.5 cursor-pointer ${
                        active
                          ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] ring-1 ring-[var(--accent-gold)]/30"
                          : "bg-[var(--bg-card)] border-[var(--control-border)] hover:border-[var(--accent-gold)]/55"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active ? "text-[var(--accent-gold)]" : "text-[var(--text-muted)]"}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <strong className="text-xs font-semibold block text-[var(--text-main)]">
                          {opt.label}
                        </strong>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {opt.sub}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {extraCashBank.length > 0 && (
                <label className="text-xs font-bold text-[var(--text-muted)] block pt-1">
                  {text("أو اختر حساب دفع آخر:", "Or select another cash/bank account:")}
                  <select
                    className={INPUT_STYLE}
                    value={form.paymentAccountCode}
                    onChange={(e) =>
                      update({ paymentAccountCode: e.target.value })
                    }
                  >
                    <option value="2101">
                      {text("آجل على المورد", "Pay later")}
                    </option>
                    {cashBankAccounts.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {isEn && acc.nameEn ? acc.nameEn : acc.nameAr} ({acc.code})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-[var(--text-main)] sm:col-span-2">
                {ui("مرفق فاتورة المورد (PDF أو صورة)")}
                <div className="relative mt-1.5">
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    className="block w-full text-xs text-[var(--text-muted)] file:me-3 file:rounded-xl file:border file:border-[var(--accent-gold)]/35 file:bg-[var(--accent-surface)] file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-[var(--accent-gold)] cursor-pointer"
                    onChange={(e) =>
                      setAttachmentFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
              </label>

              <label className="text-xs font-bold text-[var(--text-main)] sm:col-span-2">
                {ui("ملاحظات أو بيان إضافي")}{" "}
                <span className="text-[var(--text-muted)] font-normal">
                  {ui("(اختياري)")}
                </span>
                <textarea
                  maxLength={1000}
                  rows={2}
                  className="theme-input mt-1.5 w-full rounded-lg p-3 text-base sm:text-[0.8125rem]"
                  placeholder={ui("ملاحظات توضيحية حول الخدمة أو الفاتورة...")}
                  value={form.notes || ""}
                  onChange={(e) => update({ notes: e.target.value })}
                />
              </label>
            </div>

            {/* Posting Checkbox */}
            <label className="flex min-h-11 items-center gap-2.5 text-xs font-semibold text-[var(--text-main)] cursor-pointer pt-1">
              <Checkbox
                disabled={existing?.postingStatus === "POSTED"}
                checked={form.postImmediately !== false}
                onChange={(e) => update({ postImmediately: e.target.checked })}
              />
              <span>
                {ui("اعتماد المصروف فوراً لإدراجه في التقارير والإقرار الضريبي")}
              </span>
            </label>

            {/* Collapsible Details for Accountant (Native <details>) */}
            <details
              open={Boolean(existing && existing.vatDate !== existing.issueDate)}
              className="pt-2 border-t theme-border"
            >
              <summary className="min-h-11 sm:min-h-8 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent-gold)] cursor-pointer">
                <span>{ui("تفاصيل للمحاسب (تاريخ الضريبة والحساب المحاسبي)")}</span>
              </summary>

              <div className="mt-3 p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border grid gap-3 sm:grid-cols-3 text-xs">
                <label className="font-bold text-[var(--text-main)]">
                  {ui("تاريخ احتساب الضريبة *")}
                  <input
                    required
                    type="date"
                    min={form.issueDate}
                    className={INPUT_STYLE}
                    value={form.vatDate}
                    onChange={(e) => update({ vatDate: e.target.value })}
                  />
                </label>

                <label className="font-bold text-[var(--text-main)]">
                  {ui("حساب المصروف:")}
                  <select
                    disabled={isReturn}
                    className={INPUT_STYLE}
                    value={form.accountCode}
                    onChange={(e) => update({ accountCode: e.target.value })}
                  >
                    {accounts.data?.items
                      .filter(
                        (a) =>
                          a.isActive &&
                          a.isPosting &&
                          ["EXPENSE", "ASSET"].includes(a.type) &&
                          !["1101", "1102", "1103", "1104"].includes(a.code),
                      )
                      .map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} ·{" "}
                          {ui.language === "en" && a.nameEn
                            ? a.nameEn
                            : ui(a.nameAr)}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="font-bold text-[var(--text-main)]">
                  {ui("المعاملة الضريبية:")}
                  <select
                    disabled={isReturn || isZeroTaxExpense}
                    className={INPUT_STYLE}
                    value={form.taxTreatment}
                    onChange={(e) =>
                      update({
                        taxTreatment: e.target
                          .value as PurchaseInput["taxTreatment"],
                      })
                    }
                  >
                    {Object.entries(TAX_TREATMENTS).map(([tKey, label]) => (
                      <option key={tKey} value={tKey}>
                        {ui(label)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>
          </section>

          {/* Error Notice */}
          {(error || accounts.error || originals.error) && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{ui(error || accounts.error || originals.error)}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t theme-border px-6 py-4 bg-[var(--bg-card-subtle)] shrink-0">
          <div className="text-xs">
            <span className="text-[var(--text-muted)]">
              {ui("الإجمالي النهائي:")}
            </span>{" "}
            <strong className="font-mono font-semibold text-[var(--text-main)] text-sm">
              <bdi dir="ltr">{totals.total}</bdi> {ui("ر.س")}
            </strong>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="secondary-btn min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold cursor-pointer"
            >
              {ui("إلغاء")}
            </button>
            <button
              type="submit"
              disabled={isSaving || isSelecting || accounts.isLoading}
              className="min-h-11 sm:min-h-9 px-5 py-1.5 rounded-lg gold-gradient-btn text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>{ui("جارٍ الحفظ…")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  <span>{ui(existing ? "تحديث المستند" : "حفظ المستند")}</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
