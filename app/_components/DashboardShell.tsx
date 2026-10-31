"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  ClipboardCheck,
  ReceiptText,
  Car,
  ShoppingBag,
  Landmark,
  Calculator,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useWorkspaceMode } from "@/lib/workspaceModeContext";
import type { UserRole } from "@/lib/types";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface DashboardShellProps {
  children: ReactNode;
  role: UserRole;
}

interface MobileNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ADMIN_OPERATIONS_LINKS: MobileNavItem[] = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/contracts", label: "العقود", icon: FileText },
  { href: "/admin/contracts/new", label: "عقد جديد", icon: FilePlus2 },
  { href: "/admin/inspections", label: "الفحوصات", icon: ClipboardCheck },
  { href: "/admin/fleet", label: "المركبات", icon: Car },
];

const ADMIN_FINANCE_LINKS: MobileNavItem[] = [
  { href: "/admin/invoices", label: "الفواتير", icon: ReceiptText },
  { href: "/admin/invoices/new", label: "+ فاتورة", icon: Plus },
  { href: "/admin/purchases", label: "المصروفات", icon: ShoppingBag },
  { href: "/admin/accounting", label: "المحاسبة", icon: Landmark },
  { href: "/admin/vat-returns", label: "الإقرار الضريبي", icon: Calculator },
];

const CAPTAIN_LINKS: MobileNavItem[] = [
  { href: "/captain", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/captain/inspection", label: "فحص اليوم", icon: ClipboardCheck },
  { href: "/captain/contract", label: "عقد جديد", icon: FilePlus2 },
];

export default function DashboardShell({ children, role }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { isFinance } = useWorkspaceMode();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const isMenuOpen = drawerPath === pathname;

  const links =
    role === "ADMIN"
      ? isFinance
        ? ADMIN_FINANCE_LINKS
        : ADMIN_OPERATIONS_LINKS
      : CAPTAIN_LINKS;

  const activeHref = [...links]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(user.role === "ADMIN" ? "/admin" : "/captain");
  }, [isLoading, user, role, router]);

  if (isLoading) {
    return (
      <div
        role="status"
        className="grid min-h-dvh place-content-center gap-3 text-center theme-card-subtle"
      >
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-amber-500/20 border-t-amber-500" />
        <p>جاري تهيئة مساحة العمل...</p>
      </div>
    );
  }

  if (!user || user.role !== role) return null;

  return (
    <div className="app-shell flex h-dvh overflow-hidden bg-slate-50 dark:bg-[#080c14]">
      <a href="#main-content" className="skip-link">
        الانتقال إلى المحتوى
      </a>
      <Sidebar
        collapsed={isCollapsed}
        onToggle={() => setIsCollapsed((value) => !value)}
        mobileOpen={isMenuOpen}
        onMobileClose={() => setDrawerPath(null)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header isMenuOpen={isMenuOpen} onMenuToggle={() => setDrawerPath(isMenuOpen ? null : pathname)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="app-main min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 sm:p-6 lg:p-8 touch-scroll"
        >
          <div
            className={`app-content mx-auto w-full min-w-0 ${
              role === "ADMIN" ? "max-w-7xl" : "max-w-5xl"
            }`}
          >
            {children}
          </div>
        </main>
        <nav
          aria-label="التنقل السريع للجوال"
          className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t theme-border bg-white px-2 py-1.5 shadow-lg lg:hidden dark:bg-[#090e17]"
        >
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={activeHref === href ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-bold transition ${
                activeHref === href
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
