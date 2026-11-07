"use client";
import { useEffect, useState, useMemo } from "react";
import { useUiText } from "@/lib/ui-text";
import { commercialRequest, csvDownload } from "@/lib/commercial";
import { currentSaudiPeriod } from "@/lib/accounting";
import { PageHeader, StatCard, StatRow } from "@/app/_components/ui";
import { FileCheck2, Download, ArrowRight, Receipt, FileText, Scale } from "lucide-react";
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
  const ui = useUiText(),
    current = currentSaudiPeriod(),
    [year, setYear] = useState(current.year),
    [quarter, setQuarter] = useState(current.quarter),
    [ids, setIds] = useState<string[]>([]),
    [report, setReport] = useState<SelectionReport | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [customer, setCustomer] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(1),
    [name, setName] = useState(""),
    [savedId, setSavedId] = useState(""),
    [version, setVersion] = useState(0),
    saved = useCommercialData<{ items: SavedSelection[] }>("/selections"),
    m = useMutation();

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

  const filtered =
    report?.sales.filter(
      (r) =>
        (!search || `${r.number} ${r.customerName}`.includes(search)) &&
        (!type || r.documentType === type) &&
        (!customer || r.customerName === customer) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to),
    ) || [];

  const visible = filtered.slice((page - 1) * 30, page * 30);
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
        title={ui("تقرير مختار — ليس الإقرار الكامل")}
        subtitle={ui("اختيار الفواتير للمراجعة فقط، ولا يغيّر الإقرار أو القيود أو الفترات الضريبية.")}
        badge={ui("تقرير تحليلي مستقل")}
        icon={FileCheck2}
        primaryAction={{
          label: ui(loading ? "جارٍ تحديث الأرقام…" : "تنزيل تقرير المختار CSV"),
          onClick: downloadCsv,
          icon: Download,
          variant: "primary",
          disabled: !report || dirty,
        }}
        secondaryActions={[
          {
            label: ui("العودة للإقرار الكامل"),
            href: "/admin/vat-returns",
            icon: ArrowRight,
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
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
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
      </Panel>

      <Panel title="اختيار الفواتير">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="flex gap-2">
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
        </div>

        <div className="my-4 flex flex-wrap items-center gap-2">
          <button
            className={SECONDARY}
            onClick={() => {
              setLoading(true);
              setIds((v) => [...new Set([...v, ...filtered.map((r) => r.id)])]);
            }}
          >
            {ui("اختيار كل النتائج عبر الصفحات")}
          </button>
          <button
            className={SECONDARY}
            onClick={() => {
              setLoading(true);
              setIds([]);
            }}
          >
            {ui("إلغاء كل الاختيارات")}
          </button>
          <span className="text-sm font-semibold text-slate-500">
            {ui("المحدد في الفترة")}: {report?.sales.filter((r) => r.selected).length || 0} / {report?.sales.length || 0}
          </span>
        </div>

        <div className="divide-y theme-border rounded-xl border overflow-hidden">
          {visible.map((r) => (
            <label key={`${r.id}:${r.number}`} className="flex flex-wrap items-center gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition cursor-pointer">
              <input type="checkbox" className="accent-amber-600 h-4 w-4 rounded" checked={ids.includes(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} />
              <span className="min-w-0 flex-1">
                <b className="font-mono text-sm text-slate-900 dark:text-white">{r.number}</b>
                <small className="block text-slate-400 mt-0.5">
                  {r.customerName} · {r.date} · {ui(r.kind === "CREDIT" ? "إشعار دائن" : r.kind === "DEBIT" ? "إشعار مدين" : "فاتورة")}
                </small>
              </span>
              <b dir="ltr" className="font-mono text-sm text-amber-700 dark:text-amber-400">
                {r.vat} SAR
              </b>
            </label>
          ))}
          {!visible.length && <p className="p-6 text-center text-sm text-slate-400">{ui("لا توجد نتائج")}</p>}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button className={SECONDARY} disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
            {ui("السابق")}
          </button>
          <span className="font-mono text-sm font-bold">{page}</span>
          <button className={SECONDARY} disabled={page * 30 >= filtered.length} onClick={() => setPage((v) => v + 1)}>
            {ui("التالي")}
          </button>
        </div>
      </Panel>
    </div>
  );
}
