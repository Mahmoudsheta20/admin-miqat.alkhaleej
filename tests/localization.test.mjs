import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(
  new URL("../lib/translations.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const exports = {};
new Function("exports", "require", compiled)(exports, () => ({}));

test("translations dictionary contains all required keys for both ar and en", () => {
  const { TRANSLATIONS } = exports;
  assert.ok(TRANSLATIONS.ar);
  assert.ok(TRANSLATIONS.en);

  const keyChecklist = [
    "common.appName",
    "common.save",
    "common.cancel",
    "common.currency",
    "mode.operations",
    "mode.finance",
    "nav.dashboard",
    "nav.contracts",
    "nav.invoices",
    "nav.purchases",
    "nav.accounting",
    "nav.vatReturns",
    "header.makkahClock",
    "header.profile",
    "header.langToggle",
    "invoice.title",
    "purchases.title",
    "vat.title",
    "fleet.title",
    "captains.title",
    "contracts.title",
    "contracts.newContract",
    "contracts.refNumber",
    "inspections.title",
    "admins.title",
    "zatca.title",
  ];

  for (const key of keyChecklist) {
    assert.ok(TRANSLATIONS.ar[key], `Arabic translation missing for ${key}`);
    assert.ok(TRANSLATIONS.en[key], `English translation missing for ${key}`);
  }
});

test("translations correctly distinguish currency and mode labels between ar and en", () => {
  const { TRANSLATIONS } = exports;
  assert.equal(TRANSLATIONS.ar["common.currency"], "ر.س");
  assert.equal(TRANSLATIONS.en["common.currency"], "SAR");

  assert.equal(TRANSLATIONS.ar["mode.operations"], "العمليات والأسطول");
  assert.equal(TRANSLATIONS.en["mode.operations"], "Operations & Fleet");

  assert.equal(TRANSLATIONS.ar["mode.finance"], "المالية والضريبة");
  assert.equal(TRANSLATIONS.en["mode.finance"], "Finance & VAT");
});
