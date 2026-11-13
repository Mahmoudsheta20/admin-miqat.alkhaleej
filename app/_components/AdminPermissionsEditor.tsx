"use client";

import { useLanguage } from "@/lib/languageContext";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PERMISSION_ACTION_LABELS,
  PERMISSION_GROUP_LABELS,
  PERMISSION_MODULES,
  PERMISSION_MODULE_CATALOG,
  PERMISSION_PRESETS,
  getPresetPermissions,
  normalizePermissionsInput,
  type AdminPermissions,
  type PermissionAction,
  type PermissionGroupKey,
  type PermissionModule,
  type PermissionPresetKey,
} from "@/lib/permissions";

interface AdminPermissionsEditorProps {
  value: AdminPermissions;
  onChange: (next: AdminPermissions) => void;
  disabled?: boolean;
}

const GROUPS_ORDER: readonly PermissionGroupKey[] = [
  "overview",
  "finance",
  "people",
  "operations",
  "settings",
];

/** Reusable preset + per-module/per-action permission matrix editor for admin accounts. */
export default function AdminPermissionsEditor({
  value,
  onChange,
  disabled = false,
}: AdminPermissionsEditorProps) {
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const applyPreset = (preset: PermissionPresetKey) => {
    if (disabled) return;
    onChange(getPresetPermissions(preset));
  };

  const toggleAction = (
    moduleId: PermissionModule,
    supportedActions: readonly PermissionAction[],
    action: PermissionAction,
    checked: boolean
  ) => {
    if (disabled) return;
    const current = { ...(value[moduleId] ?? {}) };
    if (action === "view" && !checked) {
      for (const act of supportedActions) {
        current[act] = false;
      }
    } else {
      current[action] = checked;
      if (checked && action !== "view") {
        current.view = true;
      }
    }
    const draft: AdminPermissions = { ...value, [moduleId]: current };
    onChange(normalizePermissionsInput(draft));
  };

  const toggleModuleAll = (
    moduleId: PermissionModule,
    supportedActions: readonly PermissionAction[],
    checked: boolean
  ) => {
    if (disabled) return;
    const nextEntry: Record<string, boolean> = {};
    for (const action of supportedActions) {
      nextEntry[action] = checked;
    }
    onChange(normalizePermissionsInput({ ...value, [moduleId]: nextEntry }));
  };

  const activeModuleCount = PERMISSION_MODULES.filter((mod) => value[mod]?.view === true).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[var(--text-main)]">
            {text("صلاحيات الأقسام والإجراءات", "Module & Action Permissions")}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {text(
              `مفعل حالياً: ${activeModuleCount} من ${PERMISSION_MODULES.length} قسم`,
              `Enabled: ${activeModuleCount} of ${PERMISSION_MODULES.length} modules`
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({})}
          className="min-h-8 px-2.5 py-1 rounded-lg border theme-border text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-gold)] transition cursor-pointer disabled:opacity-50"
        >
          {text("إلغاء التحديد", "Clear all")}
        </button>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PERMISSION_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            disabled={disabled}
            onClick={() => applyPreset(preset.key)}
            data-preset={preset.key}
            className="text-start rounded-xl border theme-border bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-surface)] px-3 py-2.5 transition cursor-pointer disabled:opacity-50"
          >
            <span className="block text-xs font-bold text-[var(--text-main)]">
              {text(preset.ar, preset.en)}
            </span>
            <span className="block text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
              {text(preset.descriptionAr, preset.descriptionEn)}
            </span>
          </button>
        ))}
      </div>

      {/* Per-module & per-action matrix */}
      <div className="space-y-2.5 max-h-[340px] overflow-y-auto pe-1">
        {GROUPS_ORDER.map((groupKey) => {
          const items = PERMISSION_MODULE_CATALOG.filter((m) => m.group === groupKey);
          if (!items.length) return null;
          const groupLabel = PERMISSION_GROUP_LABELS[groupKey];
          return (
            <div
              key={groupKey}
              className="rounded-xl border theme-border bg-[var(--bg-card)] overflow-hidden"
            >
              <div className="px-3 py-2 bg-[var(--table-header-bg)] border-b theme-border text-[11px] font-bold text-[var(--accent-gold)]">
                {text(groupLabel.ar, groupLabel.en)}
              </div>
              <div className="divide-y divide-[var(--border-color)]">
                {items.map((mod) => {
                  const modPerm = value[mod.id] ?? {};
                  const allSelected = mod.actions.every((act) => modPerm[act] === true);
                  return (
                    <div key={mod.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-main)]">
                            {text(mod.ar, mod.en)}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {text(mod.descriptionAr, mod.descriptionEn)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleModuleAll(mod.id, mod.actions, !allSelected)}
                          className="min-h-8 px-2 py-1 rounded-md border theme-border text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {text(allSelected ? "إلغاء القسم" : "كل القسم", allSelected ? "Uncheck" : "Select all")}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {mod.actions.map((action) => {
                          const label = PERMISSION_ACTION_LABELS[action];
                          const checked = modPerm[action] === true;
                          return (
                            <label
                              key={action}
                              data-perm={`${mod.id}:${action}`}
                              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition ${
                                checked
                                  ? "border-[var(--accent-gold)]/55 bg-[var(--accent-surface)] text-[var(--text-main)]"
                                  : "theme-border bg-[var(--bg-card-subtle)] text-[var(--text-muted)]"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={disabled}
                                onChange={(e) =>
                                  toggleAction(mod.id, mod.actions, action, e.target.checked)
                                }
                              />
                              <span>{text(label.ar, label.en)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
