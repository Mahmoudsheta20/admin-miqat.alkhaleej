"use client";
import { useApiQuery } from "@/lib/use-api-query";
import { useState, useRef, type ReactNode } from "react";

import { useUiText } from "@/lib/ui-text";
export const INPUT="theme-input mt-1 min-h-11 sm:min-h-10 w-full min-w-0 rounded-lg border px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50";
export const BUTTON="gold-gradient-btn inline-flex min-h-11 sm:min-h-10 items-center justify-center rounded-lg px-4 py-2 font-bold transition-all duration-200 disabled:opacity-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-amber-500 cursor-pointer";
export const SECONDARY="theme-input inline-flex min-h-11 sm:min-h-10 items-center justify-center rounded-lg border px-3 py-2 transition-all duration-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-50 cursor-pointer";
export function Field({label,children}:{label:string;children:ReactNode}){const ui=useUiText();return <label className="block min-w-0 text-sm font-medium">{ui(label)}{children}</label>;}
export function Notice({message,error=false}:{message:string;error?:boolean}){const ui=useUiText();return message?<p role={error?"alert":"status"} className={`rounded-lg border p-3 text-sm ${error?"border-rose-300 bg-rose-500/10 text-rose-700 dark:text-rose-300":"border-amber-300 bg-amber-500/10"}`}>{ui(message)}</p>:null;}
export function useCommercialData<T>(path:string){const query=useApiQuery<T>(`/workforce${path}`);return {data:query.data,error:query.error,loading:query.isLoading,reload:query.refetch};}
export function LoadingRows(){return <div aria-busy="true" className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 animate-pulse rounded-lg bg-slate-400/15 motion-reduce:animate-none"/>)}</div>;}
export function Panel({title,children}:{title:string;children:ReactNode}){const ui=useUiText();return <section className="theme-card min-w-0 rounded-xl p-4 sm:p-6"><h2 className="mb-4 text-lg font-bold">{ui(title)}</h2>{children}</section>;}
export function Stat({label,value}:{label:string;value:string}){const ui=useUiText();return <div className="theme-card-subtle rounded-lg border p-4"><p className="text-sm opacity-70">{ui(label)}</p><strong className="mt-2 block text-2xl" dir="ltr">{value} <small className="text-sm">SAR</small></strong></div>;}
export function useMutation(){const inFlight=useRef(false);const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");async function run(action:()=>Promise<unknown>,after?:()=>void){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError("");setMessage("");try{await action();setMessage("تم الحفظ بنجاح");after?.();}catch(e:unknown){setError(e instanceof Error?e.message:"تعذر الحفظ");}finally{inFlight.current=false;setBusy(false);}}return {busy,message,error,run};}
