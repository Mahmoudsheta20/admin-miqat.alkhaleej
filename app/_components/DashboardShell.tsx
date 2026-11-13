"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Plus, FileText, ReceiptText, Wallet, ClipboardCheck, ShieldAlert, X } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/languageContext";
import { isSuperAdmin } from "@/lib/adminConstants";
import { navigationFor, routeInfo, routeLabel } from "@/lib/navigation";
import {
  canAccessAdminPath,
  defaultAdminRoute,
  hasClientPermission,
  type PermissionModule,
} from "@/lib/permissions";
import type { UserRole } from "@/lib/types";
import { Card } from "@/components/ui/card";
import Header from "./Header";
import Sidebar from "./Sidebar";
import NavigationIcon from "./NavigationIcon";

interface DashboardShellProps {
  children: ReactNode;
  role: UserRole;
}

export default function DashboardShell({ children, role }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { language, dir } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const [quickCreatePath, setQuickCreatePath] = useState<string | null>(null);
  const quickCreateDialog = useRef<HTMLDialogElement>(null);

  const isMenuOpen = drawerPath === pathname;
  const isQuickCreateOpen = quickCreatePath === pathname;
  const links = navigationFor(
    role,
    isSuperAdmin(user?.email),
    user?.permissions
  ).filter((item) => item.mobile);
  const active = routeInfo(pathname)?.href;
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  const adminAuthorized = role !== "ADMIN" || !user || canAccessAdminPath(user, pathname);
  const fallbackAdminPath = role === "ADMIN" && user ? defaultAdminRoute(user) : "/admin";
  const isWideCreationRoute =
    pathname.startsWith("/admin/contracts/new") ||
    pathname.startsWith("/admin/invoices/new") ||
    pathname.startsWith("/admin/zatca/new") ||
    pathname.startsWith("/captain/contract");
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let blurTimeout: ReturnType<typeof setTimeout> | null = null;

    const isMobileViewport = (): boolean =>
      typeof window !== "undefined" && window.innerWidth < 1024;

    const isTextInput = (el: unknown): boolean => {
      if (!el || typeof el !== "object" || !("tagName" in el)) return false;
      const element = el as HTMLElement;
      const tag = element.tagName;
      if (tag === "TEXTAREA" || tag === "SELECT") return true;
      if (tag === "INPUT") {
        const type = ((element as HTMLInputElement).type || "text").toLowerCase();
        return !["checkbox", "radio", "hidden", "button", "submit", "reset", "file"].includes(type);
      }
      return Boolean(element.isContentEditable);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isMobileViewport()) return;
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
      if (isTextInput(event.target)) {
        document.documentElement.setAttribute("data-input-focused", "true");
        document.body.setAttribute("data-input-focused", "true");
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isMobileViewport()) {
        document.documentElement.removeAttribute("data-input-focused");
        document.body.removeAttribute("data-input-focused");
        return;
      }
      if (isTextInput(event.relatedTarget)) {
        return;
      }
      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        document.documentElement.removeAttribute("data-input-focused");
        document.body.removeAttribute("data-input-focused");
        blurTimeout = null;
      }, 120);
    };

    const handleResize = () => {
      if (isMobileViewport() && isTextInput(document.activeElement)) {
        document.documentElement.setAttribute("data-input-focused", "true");
        document.body.setAttribute("data-input-focused", "true");
      } else {
        document.documentElement.removeAttribute("data-input-focused");
        document.body.removeAttribute("data-input-focused");
      }
    };

    const handlePointerDown = (event: Event) => {
      if (!isMobileViewport()) return;
      if (isTextInput(event.target)) {
        if (blurTimeout) {
          clearTimeout(blurTimeout);
          blurTimeout = null;
        }
        document.documentElement.setAttribute("data-input-focused", "true");
        document.body.setAttribute("data-input-focused", "true");
      }
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      if (blurTimeout) clearTimeout(blurTimeout);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
      document.documentElement.removeAttribute("data-input-focused");
      document.body.removeAttribute("data-input-focused");
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(user.role === "ADMIN" ? defaultAdminRoute(user) : "/captain");
    else if (
      role === "ADMIN" &&
      !canAccessAdminPath(user, pathname) &&
      (pathname === "/admin" || pathname === "/admin/") &&
      fallbackAdminPath !== "/admin"
    ) {
      router.replace(fallbackAdminPath);
    }
  }, [isLoading, user, role, pathname, fallbackAdminPath, router]);

  const mainRef = useRef<HTMLElement | null>(null);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    document.title = `${routeLabel(pathname, language)} | ${language === "ar" ? "ميقات الخليج" : "Miqat Al Khaleej"}`;
  }, [pathname, language]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;

    window.scrollTo(0, 0);
    const main = mainRef.current;
    if (!main) return;

    const rawHash = window.location.hash;
    if (rawHash && rawHash !== "#main-content") {
      try {
        const hashId = decodeURIComponent(rawHash.slice(1));
        const target = hashId ? document.getElementById(hashId) : null;
        if (target && main.contains(target)) {
          target.scrollIntoView({ block: "start", behavior: "auto" });
          return;
        }
      } catch {
        // Ignore malformed URL hash fragments and fall back to top scroll.
      }
    }
    main.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    const isScrollableAncestor = (start: HTMLElement | null, boundary: HTMLElement) => {
      let node: HTMLElement | null = start;
      while (node && node !== boundary && node !== document.body && node !== document.documentElement) {
        const style = window.getComputedStyle(node);
        if (
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight + 1
        ) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const hasOpenFloatingLayer = () => {
      if (document.querySelector("dialog[open], [role='menu'], [role='listbox']")) {
        return true;
      }
      const popovers = document.querySelectorAll(".picker-popover");
      for (const popover of popovers) {
        if (popover.getAttribute("data-open") === "true") return true;
        try {
          if (popover.matches(":popover-open")) return true;
        } catch {
          // Environments without :popover-open selector support fall back to content check.
          if (popover.childElementCount > 0 && !popover.classList.contains("hidden")) {
            return true;
          }
        }
      }
      return false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const main = mainRef.current;
      if (!main || main.scrollHeight <= main.clientHeight + 1) return;
      if (hasOpenFloatingLayer()) return;

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [contenteditable=''], [role='textbox'], [role='combobox'], [role='listbox'], [role='menu'], [role='slider'], [role='spinbutton'], .workspace-sidebar, .navigation-drawer",
        )
      ) {
        return;
      }
      if (isScrollableAncestor(target, main)) return;

      const isPagingKey = event.key === "PageDown" || event.key === "PageUp";
      if (
        !isPagingKey &&
        target?.closest(
          "a, button, summary, label, [role='button'], [role='checkbox'], [role='radio'], [role='switch'], [role='tab'], [role='menuitem'], [role='option'], [role='treeitem'], [tabindex]:not(#main-content)",
        )
      ) {
        return;
      }

      const pageStep = Math.max(200, Math.round(main.clientHeight * 0.85));
      const scrollActions: Record<string, { top: number; mode: "by" | "to" }> = {
        PageDown: { top: pageStep, mode: "by" },
        PageUp: { top: -pageStep, mode: "by" },
        " ": { top: event.shiftKey ? -pageStep : pageStep, mode: "by" },
        ArrowDown: { top: 64, mode: "by" },
        ArrowUp: { top: -64, mode: "by" },
        Home: { top: 0, mode: "to" },
        End: { top: main.scrollHeight, mode: "to" },
      };
      const action = scrollActions[event.key];
      if (!action) return;

      event.preventDefault();
      if (action.mode === "to") {
        main.scrollTo({ top: action.top, behavior: "auto" });
      } else {
        main.scrollBy({ top: action.top, behavior: "auto" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const dialog = quickCreateDialog.current;
    if (!dialog) return;
    if (isQuickCreateOpen && !dialog.open) dialog.showModal();
    if (!isQuickCreateOpen && dialog.open) dialog.close();
  }, [isQuickCreateOpen]);

  if (isLoading) {
    return (
      <div role="status" className="session-loading">
        <span className="loading-spinner" />
        <p>{text("جاري تهيئة مساحة العمل…", "Preparing your workspace…")}</p>
      </div>
    );
  }
  if (!user || user.role !== role) return null;

  const adminBeforeCenter = role === "ADMIN" ? links.slice(0, 2) : links;
  const adminAfterCenter = role === "ADMIN" ? links.slice(2) : [];

  const quickActions: Array<{
    module: PermissionModule;
    href: string;
    title: string;
    subtitle: string;
    icon: typeof FileText;
    accent: string;
  }> = [
    {
      module: "contracts",
      href: "/admin/contracts/new",
      title: text("عقد نقل جديد", "New contract"),
      subtitle: text("إصدار وتوثيق رحلة جديدة", "Issue & assign trip contract"),
      icon: FileText,
      accent: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border-emerald-600/30",
    },
    {
      module: "invoices",
      href: "/admin/invoices/new",
      title: text("فاتورة عميل جديدة", "New invoice"),
      subtitle: text("ضريبية، مبدئية، أو إشعار", "Tax, proforma, or credit note"),
      icon: ReceiptText,
      accent: "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-[var(--accent-gold)]/30",
    },
    {
      module: "purchases",
      href: "/admin/purchases",
      title: text("مصروفات ومشتريات", "Purchases & expenses"),
      subtitle: text("تسجيل فواتير الموردين", "Log supplier bills & VAT"),
      icon: Wallet,
      accent: "bg-sky-500/12 text-sky-800 dark:text-sky-300 border-sky-600/30",
    },
    {
      module: "inspections",
      href: "/admin/inspections",
      title: text("فحوصات المركبات", "Fleet inspections"),
      subtitle: text("اعتماد ومتابعة الفحص اليومي", "Daily safety readiness"),
      icon: ClipboardCheck,
      accent: "bg-indigo-500/12 text-indigo-800 dark:text-indigo-300 border-indigo-600/30",
    },
  ];
  const visibleQuickActions = quickActions.filter((act) =>
    hasClientPermission(user, act.module, "write")
  );

  return (
    <div ref={shellRef} className="app-shell flex h-dvh overflow-clip">
      <a href="#main-content" className="skip-link">
        {text("الانتقال إلى المحتوى", "Skip to content")}
      </a>
      <Sidebar
        collapsed={isCollapsed}
        onToggle={() => setIsCollapsed((value) => !value)}
        mobileOpen={isMenuOpen}
        onMobileClose={() => setDrawerPath(null)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-clip">
        <Header
          isMenuOpen={isMenuOpen}
          onMenuToggle={() => setDrawerPath(isMenuOpen ? null : pathname)}
        />
        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="app-main relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-scroll"
        >
          <div
            className={`app-content mx-auto w-full min-w-0 ${
              isWideCreationRoute
                ? "max-w-[1680px]"
                : role === "ADMIN"
                  ? "max-w-[1440px]"
                  : "max-w-5xl"
            }`}
          >
            {adminAuthorized ? (
              children
            ) : (
              <Card
                role="alert"
                className="theme-card border theme-border p-6 sm:p-8 max-w-lg mx-auto my-8 text-center space-y-4 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 text-[var(--accent-gold)] flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-base sm:text-lg font-semibold text-[var(--text-main)]">
                    {text("ليس لديك صلاحية للوصول إلى هذا القسم", "Access restricted for this account")}
                  </h1>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                    {text(
                      "تم تقييد صلاحيات هذا الحساب على أقسام محددة من قِبل المدير العام الأساسي.",
                      "This administrator account is scoped to specific sections by the Super Admin."
                    )}
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    href={fallbackAdminPath}
                    className="min-h-11 inline-flex items-center justify-center px-5 py-2 rounded-xl button-primary text-xs sm:text-sm font-semibold"
                  >
                    {text("الانتقال إلى الأقسام المتاحة", "Go to available workspace")}
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </main>

        <nav
          aria-label={text("التنقل السريع للجوال", "Mobile navigation")}
          className="mobile-bottom-nav lg:hidden"
        >
          {adminBeforeCenter.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={active === item.href ? "is-active" : ""}
            >
              <NavigationIcon name={item.icon} />
              <span className="truncate max-w-full px-1">{item[language]}</span>
            </Link>
          ))}

          {role === "ADMIN" && visibleQuickActions.length > 0 && (
            <button
              type="button"
              className="mobile-quick-create-btn cursor-pointer"
              aria-expanded={isQuickCreateOpen}
              aria-controls="mobile-quick-create"
              aria-label={text("إنشاء إجراء سريع", "Quick create")}
              onClick={() => setQuickCreatePath(isQuickCreateOpen ? null : pathname)}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl button-primary shadow-xs">
                <Plus size={16} aria-hidden="true" />
              </span>
              <span>{text("جديد", "New")}</span>
            </button>
          )}

          {adminAfterCenter.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={active === item.href ? "is-active" : ""}
            >
              <NavigationIcon name={item.icon} />
              <span className="truncate max-w-full px-1">{item[language]}</span>
            </Link>
          ))}

          {role === "ADMIN" && (
            <button
              type="button"
              className="cursor-pointer"
              onClick={() => setDrawerPath(pathname)}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
            >
              <Menu size={19} aria-hidden="true" />
              <span>{text("المزيد", "More")}</span>
            </button>
          )}
        </nav>
      </div>

      {role === "ADMIN" && (
        <dialog
          ref={quickCreateDialog}
          id="mobile-quick-create"
          dir={dir}
          aria-labelledby="mobile-quick-create-title"
          className="mobile-quick-create-dialog"
          onCancel={(event) => {
            event.preventDefault();
            setQuickCreatePath(null);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setQuickCreatePath(null);
          }}
        >
          <div className="mobile-sheet-panel p-4 sm:p-5 space-y-4">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-[var(--control-border)]/50" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2
                  id="mobile-quick-create-title"
                  className="text-base font-semibold text-[var(--text-main)]"
                >
                  {text("إنشاء سريع", "Quick create")}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {text("اختر العملية للبدء مباشرة", "Jump directly into a workflow")}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setQuickCreatePath(null)}
                aria-label={text("إغلاق", "Close")}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {visibleQuickActions.map((act) => {
                const Icon = act.icon;
                return (
                  <Link
                    key={act.href}
                    href={act.href}
                    onClick={() => setQuickCreatePath(null)}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)] rounded-2xl"
                  >
                    <Card className="theme-card border theme-border p-3.5 shadow-none hover:border-[var(--accent-gold)]/55 transition-colors flex items-center gap-3 min-h-16">
                      <span
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${act.accent}`}
                      >
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm font-semibold text-[var(--text-main)]">
                          {act.title}
                        </strong>
                        <span className="block text-xs text-[var(--text-muted)] truncate">
                          {act.subtitle}
                        </span>
                      </span>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
