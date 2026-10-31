"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  UserCheck,
  FileText,
  ClipboardCheck,
  FilePlus2,
  Home,
  ChevronRight,
  ChevronLeft,
  X,
  Shield,
  ShieldCheck,
  ReceiptText,
  ShoppingBag,
  BookOpen,
  Landmark,
  Calculator,
  Building2,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { UserRole, SystemUser } from "@/lib/types";
import { isSuperAdmin } from "@/lib/adminConstants";
import { useWorkspaceMode } from "@/lib/workspaceModeContext";
import WorkspaceModeSwitcher from "./WorkspaceModeSwitcher";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  roles: UserRole[];
  superAdminOnly?: boolean;
  section?: "OPERATIONS" | "DAILY" | "REVIEW" | "CAPTAIN";
}

const NAV_ITEMS: NavItem[] = [
  // 1. Operations & Fleet (العمليات والأسطول)
  {
    href: "/admin",
    label: "لوحة التحكم",
    icon: <LayoutDashboard className="w-4 h-4" />,
    roles: ["ADMIN"],
    section: "OPERATIONS",
  },
  {
    href: "/admin/contracts",
    label: "سجل العقود الرسمية",
    icon: <FileText className="w-4 h-4" />,
    roles: ["ADMIN"],
    section: "OPERATIONS",
  },
  {
    href: "/admin/contracts/new",
    label: "إنشاء عقد رسمي",
    icon: <FilePlus2 className="w-4 h-4" />,
    badge: "جديد",
    badgeColor:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    roles: ["ADMIN"],
    section: "OPERATIONS",
  },
  {
    href: "/admin/captains",
    label: "إدارة الكباتن",
    icon: <UserCheck className="w-4 h-4" />,
    roles: ["ADMIN"],
    section: "OPERATIONS",
  },
  {
    href: "/admin/inspections",
    label: "فحص الكباتن والمركبات",
    icon: <ClipboardCheck className="w-4 h-4" />,
    badge: "يومي",
    badgeColor:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    roles: ["ADMIN"],
    section: "OPERATIONS",
  },
  {
    href: "/admin/fleet",
    label: "أسطول المركبات",
    icon: <Car className="w-4 h-4" />,
    roles: ["ADMIN"],
    section: "OPERATIONS",
  },

  // 2. Daily Work (العمل اليومي والمالية)
  {
    href: "/admin/invoices",
    label: "الفواتير",
    icon: <ReceiptText className="w-4 h-4" />,
    roles: ["ADMIN"],
    section: "DAILY",
  },
  {
    href: "/admin/purchases",
    label: "المصروفات والمشتريات",
    icon: <ShoppingBag className="w-4 h-4" />,
    roles: ["ADMIN"],
    section: "DAILY",
  },
  {
    href: "/admin/accounting",
    label: "القيود والقبض والدفع",
    icon: <Landmark className="w-4 h-4" />,
    roles: ["ADMIN"],
    section: "DAILY",
  },

  // 3. Review & Settings (المراجعة والإعدادات)
  {
    href: "/admin/vat-returns",
    label: "الإقرار الضريبي",
    icon: <Calculator className="w-4 h-4" />,
    roles: ["ADMIN"],
    section: "REVIEW",
  },
  {
    href: "/admin/accounts",
    label: "دليل الحسابات",
    icon: <BookOpen className="w-4 h-4" />,
    roles: ["ADMIN"],
    section: "REVIEW",
  },
  {
    href: "/admin/invoices/settings",
    label: "بيانات الشركة والبنك",
    icon: <Building2 className="w-4 h-4" />,
    roles: ["ADMIN"],
    section: "REVIEW",
  },
  {
    href: "/admin/zatca",
    label: "الفوترة الضريبية ZATCA",
    icon: <ShieldCheck className="w-4 h-4" />,
    badge: "متقدم",
    badgeColor:
      "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
    roles: ["ADMIN"],
    section: "REVIEW",
  },
  {
    href: "/admin/admins",
    label: "إدارة المسؤولين",
    icon: <ShieldCheck className="w-4 h-4" />,
    badge: "خاص",
    badgeColor:
      "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30",
    roles: ["ADMIN"],
    superAdminOnly: true,
    section: "REVIEW",
  },

  // Captain Navigation
  {
    href: "/captain",
    label: "الرئيسية",
    icon: <Home className="w-4 h-4" />,
    roles: ["CAPTAIN"],
    section: "CAPTAIN",
  },
  {
    href: "/captain/contract",
    label: "إنشاء عقد رحلة",
    icon: <FilePlus2 className="w-4 h-4" />,
    badge: "جديد",
    badgeColor:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    roles: ["CAPTAIN"],
    section: "CAPTAIN",
  },
  {
    href: "/captain/inspection",
    label: "فحص المركبة اليومي",
    icon: <ClipboardCheck className="w-4 h-4" />,
    badge: "إلزامي",
    badgeColor:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    roles: ["CAPTAIN"],
    section: "CAPTAIN",
  },
];

interface SidebarHeaderProps {
  collapsed: boolean;
  homePath: string;
  onNavigate: () => void;
}

function SidebarHeader({
  collapsed,
  homePath,
  onNavigate,
}: SidebarHeaderProps) {
  return (
    <div
      className={`shrink-0 flex items-center justify-center py-4 px-14 lg:px-3 border-b border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 ${
        collapsed ? "h-[70px]" : "h-[76px]"
      }`}
    >
      <Link
        href={homePath}
        onClick={onNavigate}
        className="group flex items-center justify-center transition-transform duration-200 active:scale-95"
        title="الرئيسية"
      >
        {collapsed ? (
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center p-1.5 shadow-2xs group-hover:border-amber-500 transition">
            <Image
              src="/logo.svg"
              alt="ميقات الخليج"
              width={36}
              height={36}
              className="object-contain w-full h-full"
              priority
            />
          </div>
        ) : (
          <div className="w-full max-w-[175px] h-12 flex items-center justify-center px-2 py-1">
            <Image
              src="/logo.svg"
              alt="ميقات الخليج"
              width={160}
              height={50}
              className="object-contain w-auto h-full max-h-12 transition-transform duration-200 group-hover:scale-[1.03]"
              priority
            />
          </div>
        )}
      </Link>
    </div>
  );
}

const SECTION_TITLES: Record<string, string> = {
  OPERATIONS: "العمليات والأسطول",
  DAILY: "العمل المالي اليومي",
  REVIEW: "المراجعة والإقرار والأنظمة",
  CAPTAIN: "بوابة الكابتن",
};

interface SidebarNavLinksProps {
  collapsed: boolean;
  pathname: string;
  filteredItems: NavItem[];
  onMobileClose: () => void;
}

function SidebarNavLinks({
  collapsed,
  pathname,
  filteredItems,
  onMobileClose,
}: SidebarNavLinksProps) {
  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/captain") return pathname === "/captain";
    if (href === "/admin/contracts")
      return (
        pathname === href ||
        (pathname.startsWith(`${href}/`) && pathname !== `${href}/new`)
      );
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      aria-label="القائمة الرئيسية"
      className="min-h-0 flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overscroll-contain"
    >
      {filteredItems.map((item, index) => {
        const active = isActive(item.href);
        const prevSection =
          index > 0 ? filteredItems[index - 1]?.section : undefined;
        const sectionChanged = Boolean(
          item.section && item.section !== prevSection,
        );

        return (
          <React.Fragment key={item.href}>
            {sectionChanged && (
              <div
                className={`${index > 0 ? "pt-3.5 mt-2 border-t border-slate-200/70 dark:border-slate-800/70" : ""}`}
              >
                {!collapsed && item.section && SECTION_TITLES[item.section] && (
                  <p className="px-3 pb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                    {SECTION_TITLES[item.section]}
                  </p>
                )}
              </div>
            )}
            <Link
              href={item.href}
              onClick={onMobileClose}
              aria-current={active ? "page" : undefined}
              className={`group relative min-h-12 lg:min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                active
                  ? "bg-amber-500/12 text-amber-700 dark:text-amber-400 font-black border border-amber-500/25 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-950 dark:hover:text-white border border-transparent"
              } ${collapsed ? "justify-center px-2 py-3" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              {/* Active right bar in RTL */}
              {active && (
                <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-500 rounded-l-full" />
              )}
              <span
                className={`shrink-0 transition-colors ${
                  active
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                }`}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <span className="truncate text-sm lg:text-xs font-bold tracking-normal">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={`mr-auto px-2 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

interface SidebarFooterProps {
  collapsed: boolean;
  user: SystemUser | null;
  onToggle: () => void;
}

function SidebarFooter({ collapsed, user, onToggle }: SidebarFooterProps) {
  const isSuper = user?.role === "ADMIN" && isSuperAdmin(user?.email);

  const roleTitle =
    user?.role === "ADMIN"
      ? isSuper
        ? "المدير العام الأساسي"
        : "مسؤول إداري"
      : "كابتن معتمد";

  return (
    <div className="shrink-0 p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
      {user && (
        <>
          {!collapsed ? (
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center gap-2.5 shadow-2xs">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                  isSuper
                    ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                {user.role === "ADMIN" ? (
                  isSuper ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )
                ) : (
                  <Car className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {user.name}
                </p>
                <span
                  className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                    isSuper
                      ? "text-purple-700 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20"
                      : "text-amber-700 dark:text-amber-400 bg-amber-500/10"
                  }`}
                >
                  {roleTitle}
                </span>
              </div>
            </div>
          ) : (
            <div
              className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                isSuper
                  ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20"
              }`}
              title={`${user.name} (${roleTitle})`}
            >
              {user.role === "ADMIN" ? (
                isSuper ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )
              ) : (
                <Car className="w-4 h-4" />
              )}
            </div>
          )}
        </>
      )}

      {/* Collapse button (desktop only) */}
      <button
        type="button"
        onClick={onToggle}
        className={`hidden lg:flex items-center justify-center py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-800 cursor-pointer ${
          collapsed ? "w-10 h-10 mx-auto" : "w-full px-3"
        }`}
        title={collapsed ? "توسيع القائمة" : "طي القائمة"}
        aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
      >
        {collapsed ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <>
            <ChevronRight className="w-4 h-4 ml-1.5" />
            <span className="text-xs">طي القائمة الجانبية</span>
          </>
        )}
      </button>
    </div>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { mode } = useWorkspaceMode();
  const drawerRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (mobileOpen && !drawer.open) drawer.showModal();
    if (!mobileOpen && drawer.open) drawer.close();
  }, [mobileOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) onMobileClose();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [onMobileClose]);

  const isSuper = isSuperAdmin(user?.email);

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (!user) return false;
    if (!item.roles.includes(user.role)) return false;
    if (item.superAdminOnly && !isSuper) return false;

    // Filter by active workspace mode for ADMIN
    if (user.role === "ADMIN") {
      if (mode === "OPERATIONS") {
        return item.section === "OPERATIONS";
      }
      if (mode === "FINANCE") {
        return item.section === "DAILY" || item.section === "REVIEW";
      }
    }

    return true;
  });

  const homePath =
    user?.role === "ADMIN"
      ? mode === "FINANCE"
        ? "/admin/invoices"
        : "/admin"
      : "/captain";

  const sidebarContent = (isCollapsed: boolean) => (
    <div className="flex min-h-0 flex-1 flex-col h-full bg-white dark:bg-[#090e17] text-slate-800 dark:text-slate-200 select-none">
      <SidebarHeader
        collapsed={isCollapsed}
        homePath={homePath}
        onNavigate={onMobileClose}
      />
      {user?.role === "ADMIN" && (
        <WorkspaceModeSwitcher variant="sidebar" collapsed={isCollapsed} />
      )}
      <SidebarNavLinks
        collapsed={isCollapsed}
        pathname={pathname}
        filteredItems={filteredItems}
        onMobileClose={onMobileClose}
      />
      <SidebarFooter collapsed={isCollapsed} user={user} onToggle={onToggle} />
    </div>
  );

  return (
    <>
      {/* Mobile overlay drawer */}
      <dialog
        id="mobile-navigation"
        ref={drawerRef}
        aria-label="القائمة الجانبية"
        onCancel={onMobileClose}
        onClose={onMobileClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) onMobileClose();
        }}
        className="mobile-drawer fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 lg:hidden"
      >
        <aside className="absolute inset-y-0 right-0 w-[min(21rem,calc(100vw-3rem))] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] bg-white dark:bg-[#090e17] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          <button
            onClick={onMobileClose}
            className="absolute top-[calc(1rem+env(safe-area-inset-top,0px))] left-2 min-w-11 min-h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition z-10 cursor-pointer"
            aria-label="إغلاق القائمة"
          >
            <X className="w-4 h-4" />
          </button>
          {sidebarContent(false)}
        </aside>
      </dialog>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-full sticky top-0 bg-white dark:bg-[#090e17] border-l border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {sidebarContent(collapsed)}
      </aside>
    </>
  );
}
