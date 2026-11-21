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

function loadExportsModules() {
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
    require: (id) => {
      if (id === "./adminConstants") return adminConstantsModule.exports;
      throw new Error(`Unexpected require: ${id}`);
    },
  });

  const backendExports = {};
  const backendModule = { exports: backendExports };
  vm.runInNewContext(transpile("../lib/backend.ts"), {
    exports: backendExports,
    module: backendModule,
    URL,
    URLSearchParams,
    fetch: () => Promise.reject(new Error("unused")),
  });

  const accountingExports = {};
  const accountingModule = { exports: accountingExports };
  vm.runInNewContext(transpile("../lib/accounting.ts"), {
    exports: accountingExports,
    module: accountingModule,
    URLSearchParams,
    require: (id) => {
      if (id === "./backend") return backendModule.exports;
      throw new Error(`Unexpected require: ${id}`);
    },
  });

  const finExports = {};
  const finModule = { exports: finExports };
  vm.runInNewContext(transpile("../lib/financial-exports.ts"), {
    exports: finExports,
    module: finModule,
    URL,
    require: (id) => {
      if (id === "./accounting") return accountingModule.exports;
      if (id === "./backend") return backendModule.exports;
      if (id === "./permissions") return permissionsModule.exports;
      if (id === "./types") return {};
      throw new Error(`Unexpected require: ${id}`);
    },
  });

  return {
    ...finModule.exports,
    backendSource: fs.readFileSync(new URL("../lib/backend.ts", import.meta.url), "utf8"),
  };
}

test("allowedExportSections respects Super Admin, Finance, Invoices-only, and Operations permissions", () => {
  const { allowedExportSections, ALL_EXPORT_SECTIONS } = loadExportsModules();

  const superAdmin = { role: "ADMIN", email: "miqatalkhaleej@gmail.com", permissions: null };
  assert.deepEqual([...allowedExportSections(superAdmin)], [...ALL_EXPORT_SECTIONS]);

  const invoicesOnly = { role: "ADMIN", email: "inv@miqat.test", permissions: { invoices: { view: true } } };
  assert.deepEqual([...allowedExportSections(invoicesOnly)], ["INVOICES"]);

  const vatAndPurchases = {
    role: "ADMIN",
    email: "vat@miqat.test",
    permissions: { purchases: { view: true }, vatReturns: { view: true } },
  };
  assert.deepEqual([...allowedExportSections(vatAndPurchases)], ["PURCHASES", "VAT_RETURN"]);

  const opsOnly = { role: "ADMIN", email: "ops@miqat.test", permissions: { contracts: { view: true } } };
  assert.deepEqual([...allowedExportSections(opsOnly)], []);

  const captain = { role: "CAPTAIN", email: "cap@miqat.test", permissions: null };
  assert.deepEqual([...allowedExportSections(captain)], []);
});

test("resolvePresetSections intersects presets cleanly with allowed sections", () => {
  const { EXPORT_PRESETS, resolvePresetSections } = loadExportsModules();
  const zatcaPreset = EXPORT_PRESETS.find((p) => p.id === "ZATCA_VAT_PACK");
  assert.ok(zatcaPreset);
  assert.deepEqual(
    [...resolvePresetSections(zatcaPreset, ["INVOICES", "PURCHASES"])],
    ["INVOICES", "PURCHASES"],
  );
  assert.deepEqual(
    [...resolvePresetSections(zatcaPreset, ["VAT_RETURN", "INVOICES", "PURCHASES"])],
    ["VAT_RETURN", "INVOICES", "PURCHASES"],
  );
});

test("countActiveAdvancedFilters counts non-default advanced filters excluding global search", () => {
  const { countActiveAdvancedFilters, DEFAULT_EXPORT_FILTERS } = loadExportsModules();
  assert.equal(countActiveAdvancedFilters(DEFAULT_EXPORT_FILTERS), 0);
  assert.equal(
    countActiveAdvancedFilters({
      ...DEFAULT_EXPORT_FILTERS,
      search: "global query",
    }),
    0,
  );
  assert.equal(
    countActiveAdvancedFilters({
      ...DEFAULT_EXPORT_FILTERS,
      invoiceType: "TAX",
      purchaseCategory: "FUEL",
      vehiclePlate: "ABC",
      minAmount: "100.00",
      nonZeroTrialOnly: false,
    }),
    5,
  );
});

test("buildPeriodShortcut and serializeReportPeriod construct valid month, quarter, and year payloads", () => {
  const { buildPeriodShortcut, serializeReportPeriod } = loadExportsModules();
  const monthPeriod = buildPeriodShortcut("THIS_MONTH", "2026-05-19");
  assert.deepEqual(JSON.parse(JSON.stringify(serializeReportPeriod(monthPeriod))), {
    mode: "CUSTOM",
    startDate: "2026-05-01",
    endDate: "2026-05-31",
  });
  const quarterPeriod = buildPeriodShortcut("THIS_QUARTER", "2026-05-19");
  assert.deepEqual(JSON.parse(JSON.stringify(serializeReportPeriod(quarterPeriod))), {
    mode: "QUARTER",
    year: 2026,
    quarter: 2,
  });
  const yearPeriod = buildPeriodShortcut("THIS_YEAR", "2026-05-19");
  assert.deepEqual(JSON.parse(JSON.stringify(serializeReportPeriod(yearPeriod))), {
    mode: "YEAR",
    year: 2026,
  });
});

test("lib/backend.ts marks financial export POST endpoints as read-only for query invalidation", () => {
  const { backendSource } = loadExportsModules();
  assert.match(backendSource, /\/accounting\/exports\/preview/);
  assert.match(backendSource, /\/accounting\/exports\/download/);
});
