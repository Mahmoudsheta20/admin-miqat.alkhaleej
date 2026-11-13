import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function transpile(relativePath) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

function loadPermissionModules() {
  const adminConstantsExports = {};
  const adminConstantsModule = { exports: adminConstantsExports };
  vm.runInNewContext(transpile("../lib/adminConstants.ts"), {
    exports: adminConstantsExports,
    module: adminConstantsModule,
  });

  const permissionsExports = {};
  const permissionsModule = { exports: permissionsExports };
  vm.runInNewContext(transpile("../lib/permissions.ts"), {
    exports: permissionsExports,
    module: permissionsModule,
    require: (specifier) => {
      if (specifier === "./adminConstants") return adminConstantsModule.exports;
      throw new Error(`Unexpected require: ${specifier}`);
    },
  });

  const navigationExports = {};
  const navigationModule = { exports: navigationExports };
  vm.runInNewContext(transpile("../lib/navigation.ts"), {
    exports: navigationExports,
    module: navigationModule,
    require: (specifier) => {
      if (specifier === "./types" || specifier === "./permissions") return {};
      throw new Error(`Unexpected require: ${specifier}`);
    },
  });

  return {
    ...adminConstantsModule.exports,
    ...permissionsModule.exports,
    ...navigationModule.exports,
  };
}

test("normalizePermissionsInput strips unknown entries and implies view for elevated actions", () => {
  const { normalizePermissionsInput } = loadPermissionModules();

  const clean = normalizePermissionsInput({
    invoices: { write: true, delete: false },
    customers: { view: true, approve: true },
    dashboard: { write: true },
    unknownSection: { view: true },
  });

  assert.deepEqual(JSON.parse(JSON.stringify(clean)), {
    customers: { view: true },
    invoices: { view: true, write: true },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(normalizePermissionsInput(null))), {});
  assert.deepEqual(JSON.parse(JSON.stringify(normalizePermissionsInput(["bad"]))), {});
});

test("finance_accounts preset scopes admin strictly to accounting, invoices, and tax modules", () => {
  const {
    getPresetPermissions,
    hasClientPermission,
    canAccessAdminPath,
    defaultAdminRoute,
    navigationFor,
    SUPER_ADMIN_EMAIL,
  } = loadPermissionModules();

  const financePerms = getPresetPermissions("finance_accounts");
  const accountant = {
    role: "ADMIN",
    email: "finance@example.test",
    permissions: financePerms,
  };

  assert.equal(hasClientPermission(accountant, "invoices", "write"), true);
  assert.equal(hasClientPermission(accountant, "accounting", "approve"), true);
  assert.equal(hasClientPermission(accountant, "vatReturns", "write"), true);
  assert.equal(hasClientPermission(accountant, "customers", "view"), true);
  assert.equal(hasClientPermission(accountant, "customers", "write"), false);
  assert.equal(hasClientPermission(accountant, "contracts", "view"), false);
  assert.equal(hasClientPermission(accountant, "whatsapp", "write"), false);

  assert.equal(canAccessAdminPath(accountant, "/admin/invoices"), true);
  assert.equal(canAccessAdminPath(accountant, "/admin/accounting"), true);
  assert.equal(canAccessAdminPath(accountant, "/admin/accounts"), true);
  assert.equal(canAccessAdminPath(accountant, "/admin/vat-returns/q1/selected"), true);
  assert.equal(canAccessAdminPath(accountant, "/admin/invoices/settings"), true);
  assert.equal(canAccessAdminPath(accountant, "/admin/captains/cap-1/account"), true);

  assert.equal(canAccessAdminPath(accountant, "/admin"), false);
  assert.equal(canAccessAdminPath(accountant, "/admin/contracts"), false);
  assert.equal(canAccessAdminPath(accountant, "/admin/fleet"), false);
  assert.equal(canAccessAdminPath(accountant, "/admin/captains"), false);
  assert.equal(canAccessAdminPath(accountant, "/admin/whatsapp"), false);
  assert.equal(canAccessAdminPath(accountant, "/admin/admins"), false);

  assert.equal(defaultAdminRoute(accountant), "/admin/invoices");

  const navHrefs = navigationFor("ADMIN", false, financePerms).map((item) => item.href);
  assert.ok(navHrefs.includes("/admin/invoices"));
  assert.ok(navHrefs.includes("/admin/accounting"));
  assert.ok(navHrefs.includes("/admin/accounts"));
  assert.ok(navHrefs.includes("/admin/vat-returns"));
  assert.ok(!navHrefs.includes("/admin"));
  assert.ok(!navHrefs.includes("/admin/contracts"));
  assert.ok(!navHrefs.includes("/admin/whatsapp"));
  assert.ok(!navHrefs.includes("/admin/admins"));

  // Super Admin retains everything regardless of stored permissions
  const superAdmin = {
    role: "ADMIN",
    email: SUPER_ADMIN_EMAIL,
    permissions: {},
  };
  assert.equal(hasClientPermission(superAdmin, "contracts", "approve"), true);
  assert.equal(canAccessAdminPath(superAdmin, "/admin/admins"), true);
  assert.equal(defaultAdminRoute(superAdmin), "/admin");
  assert.ok(navigationFor("ADMIN", true, {}).some((item) => item.href === "/admin/admins"));
});

test("canAccessAdminPath enforces companySettings separately from invoices and handles legacy null permissions", () => {
  const {
    canAccessAdminPath,
    defaultAdminRoute,
    hasClientPermission,
    summarizeAdminPermissions,
  } = loadPermissionModules();

  const invoicesOnlyAdmin = {
    role: "ADMIN",
    email: "billing@example.test",
    permissions: { invoices: { view: true, write: true } },
  };
  assert.equal(canAccessAdminPath(invoicesOnlyAdmin, "/admin/invoices"), true);
  assert.equal(canAccessAdminPath(invoicesOnlyAdmin, "/admin/invoices/new"), true);
  assert.equal(canAccessAdminPath(invoicesOnlyAdmin, "/admin/invoices/settings"), false);

  const emptyAdmin = {
    role: "ADMIN",
    email: "locked@example.test",
    permissions: {},
  };
  assert.equal(defaultAdminRoute(emptyAdmin), "/profile");
  assert.equal(summarizeAdminPermissions({}, "en"), "No module access");

  const legacyAdmin = {
    role: "ADMIN",
    email: "legacy@example.test",
    permissions: null,
  };
  assert.equal(hasClientPermission(legacyAdmin, "contracts", "delete"), true);
  assert.equal(canAccessAdminPath(legacyAdmin, "/admin/contracts"), true);
  assert.equal(canAccessAdminPath(legacyAdmin, "/admin/admins"), false);
  assert.equal(defaultAdminRoute(legacyAdmin), "/admin");
});
