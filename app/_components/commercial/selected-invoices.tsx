"use client";
import { useEffect, useState, useMemo } from "react";
import { useUiText } from "@/lib/ui-text";
import { useAuth } from "@/lib/authContext";
import { hasClientPermission } from "@/lib/permissions";
import { useUrlState } from "@/lib/use-url-state";
import { commercialRequest, csvDownload } from "@/lib/commercial";
import { currentSaudiPeriod } from "@/lib/accounting";
import { buildInvoiceListQueryPath, invoiceRiyadhDateKey, invoiceRequest, type InvoiceRow } from "@/lib/invoices";
import { Checkbox, PageHeader, StatCard, StatRow } from "@/app/_components/ui";
import { FileCheck2, Download, ArrowLeft, ArrowRight, Receipt, FileText, Scale, Plus, Search, Trash2, Calculator } from "lucide-react";
import { INPUT, SECONDARY, Field, Notice, Panel, useCommercialData, useMutation } from "./shared";

interface SelectionSale {
  id: string;
  number: string;
  date: string;
  kind: string;
  customerId: string | null;
  customerName: string;
  documentType: string;
  net: string;
  vat: string;
  selected: boolean;
}

interface SelectionReport {
  title: string;
  period: { start: string; endInclusive: string };
  sales: SelectionSale[];
  selectedNet: string;
  selectedOutputVat: string;
  fullNet: string;
  fullOutputVat: string;
  excludedNet: string;
  excludedOutputVat: string;
}

interface SavedSelection {
  id: string;
  name: string;
  invoiceIds: string[];
  version: number;
}

export default function SelectedInvoices() {
  const ui = useUiText();
  const { user } = useAuth();
  const canManageSelections = hasClientPermission(user, "vatReturns", "write");
  const canSearchInvoices = hasClientPermission(user, "invoices", "view");
  const current = currentSaudiPeriod();
  const [year, setYear] = useUrlState<number>("year", current.year);
  const [quarter, setQuarter] = useUrlState<number>("quarter", current.quarter, [1, 2, 3, 4]);
  const [ids, setIds] = useState<string[]>([]);
  const [report, setReport] = useState<SelectionReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useUrlState<string>("q", "");
  const [type, setType] = useUrlState<string>("type", "", ["", "TAX", "BOOKING"]);
  const [customer, setCustomer] = useUrlState<string>("customer", "");
  const [from, setFrom] = useUrlState<string>("from", "");
  const [to, setTo] = useUrlState<string>("to", "");
  const [page, setPage] = useUrlState<number>("page", 1);
  const [name, setName] = useState("");
  const [savedId, setSavedId] = useState("");
  const [version, setVersion] = useState(0);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<InvoiceRow[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const saved = useCommercialData<{ items: SavedSelection[] }>("/selections");
  const m = useMutation();

  useEffect(() => {
    const clean = lookupQuery.trim();
    if (!canSearchInvoices || !clean) return;
    let alive = true;
    const timer = setTimeout(() => {
      setLookupLoading(true);
      setLookupError("");
      invoiceRequest<{ items: InvoiceRow[] }>(
        buildInvoiceListQueryPath({ page: 1, search: clean, archived: false }),
      )
        .then((res) => {
          if (!alive) return;
          if (!res.success || !res.data) {
            setLookupError(
              res.error || (ui.language === "en" ? "Could not search invoices" : "تعذر البحث في الفواتير"),
            );
            setLookupResults([]);
          } else {
            setLookupResults((res.data.items || []).filter((item) => item.documentType !== "PROFORMA"));
          }
        })
        .catch(() => {
          if (alive) {
            setLookupError(ui.language === "en" ? "Could not search invoices" : "تعذر البحث في الفواتير");
            setLookupResults([]);
          }
        })
        .finally(() => {
          if (alive) setLookupLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [canSearchInvoices, lookupQuery, ui.language]);

  const visibleLookupResults = lookupQuery.trim() ? lookupResults : [];
  const visibleLookupError = lookupQuery.trim() ? lookupError : "";
  const visibleLookupLoading = Boolean(lookupQuery.trim()) && lookupLoading;

  useEffect(() => {
    let alive = true;
    commercialRequest<SelectionReport>("/selections/report", "POST", {
      period: { mode: "QUARTER", year, quarter },
      invoiceIds: ids,
    })
      .then((r) => {
        if (alive) {
          setReport(r);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "تعذر تحميل البيانات");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [year, quarter, ids]);

  const q = search.trim().toLowerCase();
  const filtered =
    report?.sales.filter(
      (r) =>
        (!q || `${r.number} ${r.customerName}`.toLowerCase().includes(q)) &&
        (!type || r.documentType === type) &&
        (!customer || r.customerName === customer) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to),
    ) || [];

  const totalPages = Math.max(1, Math.ceil(filtered.length / 30));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * 30, currentPage * 30);
  const dirty = loading || Boolean(error);

  function toggle(id: string, checked: boolean) {
    setLoading(true);
    setIds((v) => (checked ? [...new Set([...v, id])] : v.filter((i) => i !== id)));
  }

  function downloadCsv() {
    if (!report) return;
    csvDownload("selected-invoices-not-vat-return.csv", [
      [ui(report.title)],
      [ui("من تاريخ"), report.period.start, ui("إلى تاريخ"), report.period.endInclusive],
      [ui("ضريبة المبيعات المختارة"), report.selectedOutputVat],
      [ui("ضريبة مبيعات الإقرار الكامل"), report.fullOutputVat],
      [ui("فرق ضريبة غير المختار"), report.excludedOutputVat],
      [ui("الفاتورة"), ui("العميل"), ui("التاريخ"), ui("الصافي"), ui("الضريبة")],
      ...report.sales.filter((r) => r.selected).map((r) => [r.number, r.customerName, r.date, r.net, r.vat]),
    ]);
  }

  const selectionHelpGuide = useMemo(
    () => ({
      title: ui("دليل تقرير الفواتير المختارة"),
      summary: ui("اختيار الفواتير للمراجعة فقط، ولا يغيّر الإقرار أو القيود أو الفترات الضريبية."),
      cards: [
        {
          title: ui("الغرض من التقرير"),
          badge: ui("مراجعة وتحليل"),
          items: [
            {
              label: ui("استعراض فواتير مختارة لمراجعة أرقامها وتصديرها دون التأثير على الإقرار الرسمي أو قيود اليومية."),
              description: ui("تقرير تحليلي مستقل"),
            },
          ],
        },
        {
          title: ui("مجموعات الاختيار المحفوظة"),
          badge: ui("مجموعات الاختيار"),
          items: [
            {
              label: ui("حفظ مجموعات محددة من الفواتير باسم مخصص للرجوع إليها ومقارنة فروق الضريبة."),
              description: ui("مجموعة محفوظة"),
            },
          ],
        },
      ],
      tip: ui("ضريبة مبيعات الإقرار الكامل"),
    }),
    [ui],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير مختار — ليس الإقرار الكامل"
        subtitle="اختيار الفواتير للمراجعة فقط، ولا يغيّر الإقرار أو القيود أو الفترات الضريبية."
        badge="تقرير تحليلي مستقل"
        icon={FileCheck2}
        primaryAction={{
          label: loading ? "جارٍ تحديث الأرقام…" : "تنزيل تقرير المختار CSV",
          onClick: downloadCsv,
          icon: Download,
          variant: "primary",
          disabled: !report || dirty,
        }}
        secondaryActions={[
          {
            label: ui.language === "en" ? "Open in VAT Return (Boxes 1–16)" : "فتح في الإقرار الضريبي (خانات 1–16)",
            href: `/admin/vat-returns?selection=manual&year=${year}&quarter=${quarter}${savedId ? `&groupId=${encodeURIComponent(savedId)}` : ""}`,
            icon: Calculator,
            variant: "subtle",
          },
          {
            label: "العودة للإقرار الكامل",
            href: "/admin/vat-returns",
            icon: ui.dir === "rtl" ? ArrowRight : ArrowLeft,
            variant: "subtle",
          },
        ]}
        helpGuide={selectionHelpGuide}
        onRefresh={() => {
          setLoading(true);
          commercialRequest<SelectionReport>("/selections/report", "POST", {
            period: { mode: "QUARTER", year, quarter },
            invoiceIds: ids,
          })
            .then((r) => {
              setReport(r);
              setError("");
            })
            .catch((e: unknown) => {
              setError(e instanceof Error ? e.message : "تعذر تحميل البيانات");
            })
            .finally(() => setLoading(false));
        }}
        isRefreshing={loading}
      />

      <div className="flex flex-wrap gap-3">
        <Field label="السنة">
          <input
            className={INPUT}
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(e) => {
              setLoading(true);
              setYear(Number(e.target.value));
              setPage(1);
            }}
          />
        </Field>
        <Field label="الربع">
          <select
            className={INPUT}
            value={quarter}
            onChange={(e) => {
              setLoading(true);
              setQuarter(Number(e.target.value));
              setPage(1);
            }}
          >
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>
                Q{q}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Notice message={error || saved.error || m.error} error />
      <Notice message={m.message} />

      {report && (
        <StatRow columns={3}>
          <StatCard
            label={ui("ضريبة المبيعات المختارة")}
            value={report.selectedOutputVat}
            unit="SAR"
            icon={Receipt}
            variant="emerald"
          />
          <StatCard
            label={ui("ضريبة مبيعات الإقرار الكامل")}
            value={report.fullOutputVat}
            unit="SAR"
            icon={FileText}
            variant="amber"
          />
          <StatCard
            label={ui("فرق ضريبة غير المختار")}
            value={report.excludedOutputVat}
            unit="SAR"
            icon={Scale}
            variant="rose"
          />
        </StatRow>
      )}

      <Panel title="مجموعات الاختيار">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="مجموعة محفوظة">
            <select
              className={INPUT}
              value={savedId}
              onChange={(e) => {
                const row = saved.data?.items.find((r) => r.id === e.target.value);
                setSavedId(row?.id || "");
                setVersion(row?.version || 0);
                setName(row?.name || "");
                setLoading(true);
                setIds(row?.invoiceIds || []);
              }}
            >
              <option value="">{ui("مجموعة جديدة")}</option>
              {saved.data?.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="اسم المجموعة">
            <input className={INPUT} disabled={!canManageSelections} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        {canManageSelections ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={SECONDARY}
              disabled={m.busy || !name.trim()}
              onClick={() =>
                void m.run(async () => {
                  const row = await commercialRequest<SavedSelection>(savedId ? `/selections/${savedId}` : "/selections", savedId ? "PUT" : "POST", {
                    name,
                    invoiceIds: ids,
                    ...(savedId ? { version } : {}),
                  });
                  setSavedId(row.id);
                  setVersion(row.version);
                }, saved.reload)
              }
            >
              {ui("حفظ مجموعة الاختيار")}
            </button>
            {savedId && (
              <button
                type="button"
                className={SECONDARY}
                disabled={m.busy}
                onClick={() =>
                  void m.run(
                    () => commercialRequest(`/selections/${savedId}`, "DELETE", { version }),
                    () => {
                      setSavedId("");
                      setVersion(0);
                      setName("");
                      saved.reload();
                    },
                  )
                }
              >
                {ui("حذف مجموعة الاختيار")}
              </button>
            )}
          </div>
        ) : null}
      </Panel>

      <Panel title="اختيار الفواتير">
        {canSearchInvoices && (
          <div className="mb-4 rounded-xl bg-[var(--bg-card-subtle)] border theme-border p-3.5 space-y-2.5">
            <label className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
              <Search className="size-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>
                {ui.language === "en"
                  ? "Search & Manually Add Any Invoice (even outside this quarter):"
                  : "ابحث وأضف أي فاتورة يدويًا (حتى من خارج هذا الربع):"}
              </span>
            </label>
            <input
              type="search"
              className={INPUT}
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder={
                ui.language === "en"
                  ? "Invoice number or customer name…"
                  : "اكتب رقم الفاتورة أو اسم العميل للإضافة…"
              }
            />
            {visibleLookupError && <p role="alert" className="text-xs font-bold text-rose-700 dark:text-rose-300">{visibleLookupError}</p>}
            {visibleLookupLoading && (
              <p className="text-xs text-[var(--text-muted)]">
                {ui.language === "en" ? "Searching invoices…" : "جارٍ البحث…"}
              </p>
            )}
            {visibleLookupResults.length > 0 && (
              <div className="max-h-52 overflow-y-auto divide-y theme-border rounded-xl border theme-border bg-[var(--bg-card)]">
                {visibleLookupResults.map((row) => {
                  const isSelected = ids.includes(row.id);
                  return (
                    <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <b className="font-mono text-[var(--text-main)]" dir="ltr">{row.invoiceNumber}</b>
                          <span className="text-[var(--text-muted)]">{invoiceRiyadhDateKey(row.invoiceDate)}</span>
                        </div>
                        <p className="text-[var(--text-muted)] truncate">{row.customerName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[var(--accent-gold)]" dir="ltr">
                          {row.vatAmount} SAR
                        </span>
                        <button
                          type="button"
                          onClick={() => toggle(row.id, !isSelected)}
                          className={
                            isSelected
                              ? "min-h-11 sm:min-h-9 inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer"
                              : "gold-gradient-btn min-h-11 sm:min-h-9 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
                          }
                        >
                          {isSelected ? (
                            <>
                              <Trash2 className="size-3.5" aria-hidden="true" />
                              <span>{ui.language === "en" ? "Remove" : "إزالة"}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="size-3.5" aria-hidden="true" />
                              <span>{ui.language === "en" ? "Add" : "إضافة"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="بحث">
            <input
              className={INPUT}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="العميل">
            <select
              className={INPUT}
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{ui("كل العملاء")}</option>
              {[...new Set(report?.sales.map((r) => r.customerName))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="نوع المستند">
            <select
              className={INPUT}
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{ui("كل المستندات")}</option>
              <option value="TAX">{ui("مستند ضريبي")}</option>
              <option value="BOOKING">{ui("فاتورة حجز")}</option>
            </select>
          </Field>
          <Field label="من تاريخ">
            <input
              className={INPUT}
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="إلى تاريخ">
            <input
              className={INPUT}
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </Field>
        </div>

        <div className="my-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={SECONDARY}
            onClick={() => {
              setLoading(true);
              setIds((v) => [...new Set([...v, ...filtered.map((r) => r.id)])]);
            }}
          >
            {ui("اختيار كل النتائج عبر الصفحات")}
          </button>
          <button
            type="button"
            className={SECONDARY}
            onClick={() => {
              setLoading(true);
              setIds([]);
            }}
          >
            {ui("إلغاء كل الاختيارات")}
          </button>
          <span className="text-sm font-semibold text-[var(--text-muted)]">
            {ui("المحدد في الفترة")}: {report?.sales.filter((r) => r.selected).length || 0} / {report?.sales.length || 0}
          </span>
        </div>

        <div className="divide-y theme-border rounded-xl border overflow-hidden">
          {visible.map((r) => (
            <label key={`${r.id}:${r.number}`} className="flex flex-wrap items-center gap-3 p-3.5 hover:bg-[var(--table-row-hover)] transition cursor-pointer">
              <Checkbox checked={ids.includes(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} />
              <span className="min-w-0 flex-1">
                <b className="font-mono text-sm text-[var(--text-main)]">{r.number}</b>
                <small className="block text-[var(--text-muted)] mt-0.5">
                  {r.customerName} · {r.date} · {ui(r.kind === "CREDIT" ? "إشعار دائن" : r.kind === "DEBIT" ? "إشعار مدين" : "فاتورة")}
                </small>
              </span>
              <b dir="ltr" className="font-mono text-sm text-[var(--accent-gold)]">
                {r.vat} SAR
              </b>
            </label>
          ))}
          {!visible.length && <p className="p-6 text-center text-sm text-[var(--text-muted)]">{ui("لا توجد نتائج")}</p>}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="button" className={SECONDARY} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            {ui("السابق")}
          </button>
          <span className="font-mono text-sm font-bold">{currentPage} / {totalPages}</span>
          <button type="button" className={SECONDARY} disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
            {ui("التالي")}
          </button>
        </div>
      </Panel>
    </div>
  );
}
