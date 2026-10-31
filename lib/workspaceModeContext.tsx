"use client";

import React, { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStoredPreference, setStoredPreference } from "./useStoredPreference";

export type WorkspaceMode = "OPERATIONS" | "FINANCE";

interface WorkspaceModeContextType {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  toggleMode: () => void;
  switchAndNavigate: (newMode: WorkspaceMode) => void;
  isFinance: boolean;
  isOperations: boolean;
}

export const FINANCE_ROUTE_PREFIXES = [
  "/admin/invoices",
  "/admin/purchases",
  "/admin/accounting",
  "/admin/vat-returns",
  "/admin/accounts",
  "/admin/zatca",
];

export function isFinanceRoute(pathname: string): boolean {
  return FINANCE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isOperationsRoute(pathname: string): boolean {
  if (isFinanceRoute(pathname)) return false;
  return pathname.startsWith("/admin");
}

const WorkspaceModeContext = createContext<WorkspaceModeContextType | undefined>(undefined);

export function WorkspaceModeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const stored = useStoredPreference("miqat_workspace_mode", "OPERATIONS");
  const lastOpsRouteRef = useRef("/admin");
  const lastFinRouteRef = useRef("/admin/invoices");

  // Track last visited routes per mode
  useEffect(() => {
    if (isFinanceRoute(pathname)) {
      lastFinRouteRef.current = pathname;
    } else if (isOperationsRoute(pathname)) {
      lastOpsRouteRef.current = pathname;
    }
  }, [pathname]);

  // Determine effective mode based on current pathname
  const effectiveMode: WorkspaceMode = isFinanceRoute(pathname)
    ? "FINANCE"
    : isOperationsRoute(pathname)
    ? "OPERATIONS"
    : stored === "FINANCE"
    ? "FINANCE"
    : "OPERATIONS";

  const setMode = useCallback((newMode: WorkspaceMode) => {
    setStoredPreference("miqat_workspace_mode", newMode);
  }, []);

  const switchAndNavigate = useCallback(
    (newMode: WorkspaceMode) => {
      setMode(newMode);
      if (newMode === "FINANCE") {
        const target = isFinanceRoute(lastFinRouteRef.current)
          ? lastFinRouteRef.current
          : "/admin/invoices";
        router.push(target);
      } else {
        const target =
          isOperationsRoute(lastOpsRouteRef.current) &&
          !isFinanceRoute(lastOpsRouteRef.current)
            ? lastOpsRouteRef.current
            : "/admin";
        router.push(target);
      }
    },
    [setMode, router]
  );

  const toggleMode = useCallback(() => {
    const next = effectiveMode === "OPERATIONS" ? "FINANCE" : "OPERATIONS";
    switchAndNavigate(next);
  }, [effectiveMode, switchAndNavigate]);

  return (
    <WorkspaceModeContext.Provider
      value={{
        mode: effectiveMode,
        setMode,
        toggleMode,
        switchAndNavigate,
        isFinance: effectiveMode === "FINANCE",
        isOperations: effectiveMode === "OPERATIONS",
      }}
    >
      {children}
    </WorkspaceModeContext.Provider>
  );
}

export function useWorkspaceMode(): WorkspaceModeContextType {
  const context = useContext(WorkspaceModeContext);
  if (!context) {
    // Return a safe fallback if accessed outside provider
    return {
      mode: "OPERATIONS",
      setMode: () => {},
      toggleMode: () => {},
      switchAndNavigate: () => {},
      isFinance: false,
      isOperations: true,
    };
  }
  return context;
}
