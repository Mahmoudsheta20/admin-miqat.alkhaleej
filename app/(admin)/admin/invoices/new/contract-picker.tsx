"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { invoiceRequest } from "@/lib/invoices";

export interface InvoiceContractOption {
  id: string;
  referenceNumber: string;
  customerName: string;
  origin: string;
  destination: string;
  tripDate: string;
}
interface ContractPickerProps {
  selected: InvoiceContractOption | null;
  isLoading: boolean;
  onSelect: (contract: InvoiceContractOption) => void;
  onClear: () => void;
}
export default function ContractPicker({ selected, isLoading, onSelect, onClear }: ContractPickerProps) {
  const [query, setQuery] = useState(""), [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<InvoiceContractOption[]>([]), [isSearching, setIsSearching] = useState(false), [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null), listId = useId();
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const timer = setTimeout(() => {
      setIsSearching(true);
      void invoiceRequest<{ items: InvoiceContractOption[] }>(`/contracts?search=${encodeURIComponent(query)}`).then(result => {
        if (!active) return;
        setItems(result.data?.items || []); setError(result.error || ""); setIsSearching(false); setActiveIndex(0);
      });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query, isOpen]);
  useEffect(() => {
    function close(event: PointerEvent) { if (event.target instanceof Node && !root.current?.contains(event.target)) setIsOpen(false); }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  function select(item: InvoiceContractOption) { setIsOpen(false); setQuery(""); onSelect(item); }
  function keydown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setIsOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); setIsOpen(true);
      setActiveIndex(index => Math.max(0, Math.min(items.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
    }
    if (event.key === "Enter" && isOpen) { event.preventDefault(); if (items[activeIndex] && !isSearching) select(items[activeIndex]); }
    if (event.key === "Tab") setIsOpen(false);
  }
  return <div ref={root} className="relative">
    <label htmlFor={`${listId}-input`} className="mb-2 block text-sm font-bold">ابدأ من عقد موجود <span className="font-normal text-slate-400">(اختياري)</span></label>
    <div className="relative">
      <Search className="pointer-events-none absolute start-3.5 top-3.5 size-4 text-slate-400" aria-hidden="true" />
      <input id={`${listId}-input`} role="combobox" aria-expanded={isOpen} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={isOpen && items[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off" placeholder="ابحث برقم العقد أو اسم العميل" value={isOpen ? query : selected ? `${selected.referenceNumber} · ${selected.customerName}` : query}
        onFocus={() => { setQuery(""); setIsOpen(true); setIsSearching(true); }} onChange={event => { setQuery(event.target.value); setItems([]); setIsSearching(true); setIsOpen(true); }} onKeyDown={keydown}
        className="theme-input h-11 w-full rounded-xl ps-10 pe-11 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
      {isLoading ? <Loader2 className="absolute end-3.5 top-3.5 size-4 animate-spin text-amber-600" aria-label="جارٍ تحميل العقد" /> : selected && <button type="button" aria-label="إلغاء ربط العقد" onClick={() => { onClear(); setQuery(""); setIsOpen(false); }} className="absolute end-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button>}
    </div>
    {isOpen && <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border theme-border bg-white shadow-lg dark:bg-slate-900">
      <div id={listId} role="listbox" aria-label="العقود المتاحة" className="max-h-64 overflow-y-auto p-1.5">
        {isSearching ? <p role="status" className="p-4 text-sm text-slate-500">جارٍ البحث…</p> : error ? <p role="alert" className="p-4 text-sm text-rose-600">{error}</p> : !items.length ? <p className="p-4 text-sm text-slate-500">لا توجد عقود مطابقة. يمكنك إنشاء الفاتورة يدويًا.</p> : items.map((item, index) => <button type="button" role="option" tabIndex={-1} id={`${listId}-${index}`} aria-selected={selected?.id === item.id} key={item.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(item)}
          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-sm ${index === activeIndex ? "bg-amber-50 dark:bg-amber-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
          <span className="min-w-0"><span className="block truncate font-bold">{item.customerName} <span className="ms-2 font-mono text-xs font-normal text-slate-500">{item.referenceNumber}</span></span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.origin} ← {item.destination} · {item.tripDate}</span></span>
          {selected?.id === item.id && <Check className="size-4 shrink-0 text-amber-600" />}
        </button>)}
      </div>
    </div>}
    <p className="mt-1.5 text-xs text-slate-400">اختيار العقد يملأ بيانات العميل والرحلة تلقائيًا.</p>
  </div>;
}
