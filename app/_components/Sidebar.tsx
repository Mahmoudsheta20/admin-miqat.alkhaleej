"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/languageContext";
import { isSuperAdmin } from "@/lib/adminConstants";
import { NAVIGATION_GROUPS, navigationFor, routeInfo } from "@/lib/navigation";
import { Card } from "@/components/ui/card";
import NavigationIcon from "./NavigationIcon";

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
  const { user } = useAuth();
  const { language, dir } = useLanguage();
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = drawer.current;
    if (mobileOpen && dialog && !dialog.open) dialog.showModal();
    if (!mobileOpen && dialog?.open) dialog.close();
  }, [mobileOpen]);

  if (!user) return null;

  const items = navigationFor(user.role, isSuperAdmin(user.email));
  const active = routeInfo(pathname)?.href;
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  function desktopContent(isCollapsed: boolean) {
    return (
      <>
        <div className="sidebar-brand">
          <Link
            href={user?.role === "ADMIN" ? "/admin" : "/captain"}
            onClick={onMobileClose}
            aria-label={text("ميقات الخليج — الرئيسية", "Miqat Al Khaleej — Home")}
          >
            <Image
              src="/logo.svg"
              alt="ميقات الخليج"
              width={144}
              height={54}
              loading="eager"
              className={isCollapsed ? "h-auto w-11 object-contain" : "h-auto w-36 object-contain"}
            />
          </Link>
        </div>
        <nav aria-label={text("القائمة الرئيسية", "Main navigation")} className="sidebar-navigation">
          {Object.entries(NAVIGATION_GROUPS).map(([group, label]) => {
            const entries = items.filter((item) => item.group === group);
            if (!entries.length) return null;
            return (
              <section key={group} className="sidebar-group">
                {!isCollapsed && <h2 className="sidebar-group-label">{label[language]}</h2>}
                {entries.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${active === item.href ? "is-active" : ""} ${isCollapsed ? "is-collapsed" : ""}`}
                    aria-current={active === item.href ? "page" : undefined}
                    title={isCollapsed ? item[language] : undefined}
                    onClick={onMobileClose}
                  >
                    <NavigationIcon name={item.icon} />
                    {!isCollapsed && <span>{item[language]}</span>}
                  </Link>
                ))}
              </section>
            );
          })}
        </nav>
        <footer className="sidebar-footer">
          <span className={isCollapsed ? "sr-only" : "truncate"}>{user?.name}</span>
          <button
            type="button"
            className="icon-button hidden lg:inline-flex"
            onClick={onToggle}
            aria-label={text("تبديل حجم القائمة", "Toggle sidebar")}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </button>
        </footer>
      </>
    );
  }

  return (
    <>
      <aside className={`workspace-sidebar hidden lg:flex ${collapsed ? "is-collapsed" : ""}`}>
        {desktopContent(collapsed)}
      </aside>

      <dialog
        ref={drawer}
        id="mobile-navigation"
        dir={dir}
        className="navigation-drawer"
        aria-labelledby="mobile-hub-title"
        onCancel={(event) => {
          event.preventDefault();
          onMobileClose();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onMobileClose();
        }}
      >
        <div className="mobile-hub-panel">
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-[var(--control-border)]/50 shrink-0" />
          <header className="flex items-center justify-between gap-3 px-4 py-3 border-b theme-border shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Image
                src="/logo.svg"
                alt="ميقات الخليج"
                width={38}
                height={38}
                loading="eager"
                className="h-9 w-9 object-contain shrink-0"
              />
              <div className="min-w-0">
                <h2
                  id="mobile-hub-title"
                  className="text-sm font-semibold text-[var(--text-main)] truncate"
                >
                  {text("أقسام المنظومة", "All Sections")}
                </h2>
                <p className="text-xs text-[var(--text-muted)] truncate">{user.name}</p>
              </div>
            </div>

            <button
              type="button"
              className="icon-button drawer-close"
              onClick={onMobileClose}
              aria-label={text("إغلاق القائمة", "Close navigation")}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 space-y-5">
            {user.role === "ADMIN" && (
              <section aria-label={text("اختصارات الإنشاء", "Quick create actions")} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/admin/contracts/new"
                    onClick={onMobileClose}
                    className="min-h-11 rounded-xl button-primary px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Plus size={15} aria-hidden="true" />
                    <span>{text("عقد نقل جديد", "New contract")}</span>
                  </Link>
                  <Link
                    href="/admin/invoices/new"
                    onClick={onMobileClose}
                    className="min-h-11 rounded-xl secondary-btn px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Plus size={15} aria-hidden="true" />
                    <span>{text("فاتورة جديدة", "New invoice")}</span>
                  </Link>
                </div>
              </section>
            )}

            <nav aria-label={text("القائمة الرئيسية", "Main navigation")} className="space-y-4">
              {Object.entries(NAVIGATION_GROUPS).map(([group, label]) => {
                const entries = items.filter((item) => item.group === group);
                if (!entries.length) return null;
                return (
                  <section key={group} className="space-y-2">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] px-1">
                      {label[language]}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {entries.map((item) => {
                        const isActive = active === item.href;
                        return (
                            <Link
                            key={item.href}
                            href={item.href}
                            onClick={onMobileClose}
                            aria-current={isActive ? "page" : undefined}
                            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)] rounded-xl"
                          >
                            <Card
                              className={`p-3 min-h-12 shadow-none flex items-center gap-2.5 transition-colors ${
                                isActive
                                  ? "border-[var(--accent-gold)]/55 bg-[var(--accent-surface)] text-[var(--accent-gold)] font-semibold"
                                  : "theme-card border theme-border text-[var(--text-main)] hover:border-[var(--border-hover)]"
                              }`}
                            >
                              <span
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isActive
                                    ? "bg-[var(--bg-card)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/35"
                                    : "bg-[var(--bg-card-subtle)] text-[var(--text-muted)]"
                                }`}
                              >
                                <NavigationIcon name={item.icon} />
                              </span>
                              <span className="text-xs font-medium leading-tight break-words">
                                {item[language]}
                              </span>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </nav>
          </div>
        </div>
      </dialog>
    </>
  );
}
