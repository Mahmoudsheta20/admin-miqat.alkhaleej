"use client";
import {useState} from "react";
import type {Customer} from "@/lib/commercial";
import {useUiText} from "@/lib/ui-text";
import {Field,INPUT,Notice,useCommercialData} from "./shared";
export default function CustomerPicker({value,onSelect}:{value:string;onSelect:(customer:Customer|null)=>void}){const ui=useUiText(),[search,setSearch]=useState(""),list=useCommercialData<{items:Customer[]}>(`/customers?search=${encodeURIComponent(search)}`);return <div className="mb-4 grid gap-3 rounded-xl border p-4 sm:grid-cols-2"><Field label="بحث عن عميل"><input className={INPUT} value={search} onChange={e=>setSearch(e.target.value)}/></Field><Field label="ربط الفاتورة بملف عميل"><select className={INPUT} value={value} onChange={e=>onSelect(list.data?.items.find(c=>c.id===e.target.value)||null)}><option value="">{ui("إدخال يدوي بدون ربط")}</option>{value&&!list.data?.items.some(c=>c.id===value)&&<option value={value}>{ui("العميل المحدد")}</option>}{list.data?.items.filter(c=>c.active).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field><Notice message={list.error} error/></div>;}
