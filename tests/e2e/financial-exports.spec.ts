import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function setPreferences(page: Page, language: "ar" | "en", theme: "light" | "dark") {
  await page
    .context()
    .addCookies([
      { name: "miqat_language", value: language, url: "http://127.0.0.1:3419" },
    ]);
  await page.addInitScript(
    ({ lang, thm }) => {
      localStorage.setItem("miqat_language", lang);
      localStorage.setItem("miqat_theme", thm);
    },
    { lang: language, thm: theme },
  );
}

async function loginAdmin(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill("admin@example.test");
  await page.locator("#password").fill("fixture-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("Financial Exports Center supports presets, advanced filters, live preview, CSV/PDF/JSON exports, mobile layout, and accessibility", async ({
  page,
}) => {
  await setPreferences(page, "en", "light");
  await loginAdmin(page);

  const previewPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/accounting/exports/preview") &&
      res.request().method() === "POST",
  );
  await page.goto("/admin/accounting/exports");
  await expect(
    page.getByRole("heading", { name: "Financial Exports Center" }),
  ).toBeVisible();
  const initialPreview = await previewPromise;
  expect(initialPreview.status()).toBe(200);

  // Switch preset to ZATCA VAT & Tax Pack
  const presetBtn = page.getByRole("button", { name: /ZATCA VAT & Tax Pack/ });
  const presetPreview = page.waitForResponse(
    (res) =>
      res.url().includes("/accounting/exports/preview") &&
      res.request().method() === "POST",
  );
  await presetBtn.click();
  const presetReq = (await presetPreview).request().postDataJSON() as {
    sections: string[];
  };
  expect(presetReq.sections).toEqual(["VAT_RETURN", "INVOICES", "PURCHASES"]);

  // Open Advanced Filters panel & trigger filtered preview
  const advBtn = page.getByRole("button", { name: /Advanced filters/ });
  await advBtn.click();
  await expect(advBtn).toHaveAttribute("aria-expanded", "true");

  const filteredPreview = page.waitForResponse(
    (res) =>
      res.url().includes("/accounting/exports/preview") &&
      res.request().method() === "POST",
  );
  await page.getByLabel("Document type").selectOption("TAX");
  const filteredReq = (await filteredPreview).request().postDataJSON() as {
    filters: { invoiceType: string };
  };
  expect(filteredReq.filters.invoiceType).toBe("TAX");

  // Trigger CSV, PDF, and JSON export downloads cleanly
  for (const [btnLabel, expectedFmt] of [
    [/Export Unified Excel \/ CSV/, "csv"],
    [/Export Official PDF/, "pdf"],
    [/Export Structured JSON/, "json"],
  ] as const) {
    const reqPromise = page.waitForRequest(
      (req) =>
        req.url().includes("/accounting/exports/download") &&
        req.method() === "POST",
    );
    const resPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/accounting/exports/download") &&
        res.request().method() === "POST",
    );
    await page.getByRole("button", { name: btnLabel }).click();
    const req = await reqPromise;
    const res = await resPromise;
    expect(res.status()).toBe(200);
    const body = req.postDataJSON() as { format: string };
    expect(body.format).toBe(expectedFmt);
  }

  // Accessibility scan (desktop EN light)
  const enAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(enAxe.violations).toEqual([]);

  // Arabic RTL Dark mobile 390px layout & zero horizontal overflow + axe check
  await setPreferences(page, "ar", "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "مركز التصدير المالي الموحد" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);

  const arDarkAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(arDarkAxe.violations).toEqual([]);
});
