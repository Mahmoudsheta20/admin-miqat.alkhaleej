"use client";
import { useSyncExternalStore } from "react";
const temporaryPreferences=new Map<string,string>();
function subscribe(callback:()=>void){const onStorage=(event:StorageEvent)=>{if(event.key)temporaryPreferences.delete(event.key);else temporaryPreferences.clear();callback();};window.addEventListener("storage",onStorage);window.addEventListener("miqat-preferences",callback);return()=>{window.removeEventListener("storage",onStorage);window.removeEventListener("miqat-preferences",callback);};}
export function useStoredPreference(key:string,fallback:string){return useSyncExternalStore(subscribe,()=>{try{return localStorage.getItem(key)??temporaryPreferences.get(key)??fallback;}catch{return temporaryPreferences.get(key)??fallback;}},()=>fallback);}
export function setStoredPreference(key:string,value:string){temporaryPreferences.set(key,value);try{localStorage.setItem(key,value);}catch{/* Retain the choice for this session when storage is unavailable. */}window.dispatchEvent(new Event("miqat-preferences"));}
