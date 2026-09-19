"use client";

import React from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { UserRole, SystemUser } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  // Admin Navigation
  {
    href: "/admin",
    label: "لوحة التحكم",
    icon: <LayoutDashboard className="w-4 h-4" />,
    roles: ["ADMIN"],
  },
  {
    href: "/admin/captains",
    label: "إدارة الكباتن",
    icon: <UserCheck className="w-4 h-4" />,
    roles: ["ADMIN"],
  },
  {
    href: "/admin/fleet",
    label: "أسطول المركبات",
    icon: <Car className="w-4 h-4" />,
    roles: ["ADMIN"],
  },
  {
    href: "/admin/contracts",
    label: "سجل العقود الرسمية",
    icon: <FileText className="w-4 h-4" />,
    roles: ["ADMIN"],
  },

  // Captain Navigation
  {
    href: "/captain",
    label: "الرئيسية",
    icon: <Home className="w-4 h-4" />,
    roles: ["CAPTAIN"],
  },
  {
    href: "/captain/inspection",
    label: "فحص المركبة اليومي",
    icon: <ClipboardCheck className="w-4 h-4" />,
    badge: "إلزامي",
    badgeColor: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    roles: ["CAPTAIN"],
  },
  {
    href: "/captain/contract",
    label: "إنشاء عقد رحلة",
    icon: <FilePlus2 className="w-4 h-4" />,
    badge: "جديد",
    badgeColor: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    roles: ["CAPTAIN"],
  },
];

interface SidebarHeaderProps {
  collapsed: boolean;
}

function SidebarHeader({ collapsed }: SidebarHeaderProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 pl-12 py-4.5 border-b border-slate-200/80 dark:border-slate-800/80 ${
        collapsed ? "justify-center pl-4" : ""
      }`}
    >
      <div className="w-12 h-12 flex items-center justify-center shrink-0">
        <Image
          src="/logo.svg"
          alt="ميقات الخليج"
          width={48}
          height={48}
          className="object-contain w-full h-full"
          priority
        />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            ميقات الخليج
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
            منظومة إدارة الأسطول والعمليات
          </p>
        </div>
      )}
    </div>
  );
}

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
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
      {!collapsed && (
        <p className="px-3 pb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          القائمة الرئيسية
        </p>
      )}
      {filteredItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onMobileClose}
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
              active
                ? "bg-amber-500/12 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/25 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-950 dark:hover:text-white border border-transparent"
            } ${collapsed ? "justify-center" : ""}`}
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
                <span className="truncate text-[14px]">{item.label}</span>
                {item.badge && (
                  <span
                    className={`mr-auto px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
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
  return (
    <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
      {!collapsed && user && (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {user.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </p>
          </div>
        </div>
      )}

      {/* Collapse button (desktop only) */}
      <button
        onClick={onToggle}
        className="hidden lg:flex items-center justify-center w-full py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
        aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
      >
        {collapsed ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {!collapsed && (
          <span className="mr-1.5 text-[12px]">طي القائمة الجانبية</span>
        )}
      </button>

      {!collapsed && (
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 font-mono">
          نظام ميقات الخليج • إصدار 3.0
        </p>
      )}
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

  const filteredItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#090e17] text-slate-800 dark:text-slate-200 select-none">
      <SidebarHeader collapsed={collapsed} />
      <SidebarNavLinks
        collapsed={collapsed}
        pathname={pathname}
        filteredItems={filteredItems}
        onMobileClose={onMobileClose}
      />
      <SidebarFooter collapsed={collapsed} user={user} onToggle={onToggle} />
    </div>
  );

  return (
    <>
      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 right-0 w-72 bg-white dark:bg-[#090e17] border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col">
            <button
              onClick={onMobileClose}
              className="absolute top-4 left-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 bg-white dark:bg-[#090e17] border-l border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
