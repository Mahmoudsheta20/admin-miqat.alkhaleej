"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Plus, FileText, ReceiptText, Wallet, ClipboardCheck, X } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/languageContext";
import { navigationFor, routeInfo, routeLabel } from "@/lib/navigation";
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
  const links = navigationFor(role).filter((item) => item.mobile);
  const active = routeInfo(pathname)?.href;
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  const isWideCreationRoute =
    pathname.startsWith("/admin/contracts/new") ||
    pathname.startsWith("/admin/invoices/new") ||
    pathname.startsWith("/admin/zatca/new") ||
    pathname.startsWith("/captain/contract");

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(user.role === "ADMIN" ? "/admin" : "/captain");
  }, [isLoading, user, role, router]);

  useEffect(() => {
    document.title = `${routeLabel(pathname, language)} | ${language === "ar" ? "ميقات الخليج" : "Miqat Al Khaleej"}`;
  }, [pathname, language]);

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

  const quickActions = [
    {
      href: "/admin/contracts/new",
      title: text("عقد نقل جديد", "New contract"),
      subtitle: text("إصدار وتوثيق رحلة جديدة", "Issue & assign trip contract"),
      icon: FileText,
      accent: "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-amber-500/30",
    },
    {
      href: "/admin/invoices/new",
      title: text("فاتورة عميل جديدة", "New invoice"),
      subtitle: text("ضريبية، مبدئية، أو إشعار", "Tax, proforma, or credit note"),
      icon: ReceiptText,
      accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    },
    {
      href: "/admin/purchases",
      title: text("مصروفات ومشتريات", "Purchases & expenses"),
      subtitle: text("تسجيل فواتير الموردين", "Log supplier bills & VAT"),
      icon: Wallet,
      accent: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
    },
    {
      href: "/admin/inspections",
      title: text("فحوصات المركبات", "Fleet inspections"),
      subtitle: text("اعتماد ومتابعة الفحص اليومي", "Daily safety readiness"),
      icon: ClipboardCheck,
      accent: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25",
    },
  ];

  return (
    <div className="app-shell flex h-dvh overflow-hidden">
      <a href="#main-content" className="skip-link">
        {text("الانتقال إلى المحتوى", "Skip to content")}
      </a>
      <Sidebar
        collapsed={isCollapsed}
        onToggle={() => setIsCollapsed((value) => !value)}
        mobileOpen={isMenuOpen}
        onMobileClose={() => setDrawerPath(null)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          isMenuOpen={isMenuOpen}
          onMenuToggle={() => setDrawerPath(isMenuOpen ? null : pathname)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="app-main min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-scroll"
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
            {children}
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

          {role === "ADMIN" && (
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
            <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2
                  id="mobile-quick-create-title"
                  className="text-base font-semibold text-slate-900 dark:text-white"
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
              {quickActions.map((act) => {
                const Icon = act.icon;
                return (
                  <Link
                    key={act.href}
                    href={act.href}
                    onClick={() => setQuickCreatePath(null)}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-2xl"
                  >
                    <Card className="theme-card border theme-border p-3.5 shadow-none hover:border-amber-500/50 transition-colors flex items-center gap-3 min-h-16">
                      <span
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${act.accent}`}
                      >
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm font-semibold text-slate-900 dark:text-white">
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
