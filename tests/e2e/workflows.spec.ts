import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
const ID = "11111111-1111-4111-8111-111111111111";
async function preferences(page: Page, language = "en", theme = "light") {
  await page.context().addCookies([{ name: "miqat_language", value: language, url: "http://127.0.0.1:3419" }]);
  await page.addInitScript(({ language, theme }) => { localStorage.setItem("miqat_language", language); localStorage.setItem("miqat_theme", theme); }, { language, theme });
}
async function login(page: Page, email = "admin@example.test", persistent = true) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("fixture-password");
  if (!persistent) await page.getByRole("checkbox").uncheck();
  await page.locator('button[type="submit"]').click();
  if (email !== "temporary@example.test") await expect(page).toHaveURL(email === "captain@example.test" ? /\/captain$/ : /\/admin$/);
}
function routes(directory = "app"): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return routes(file);
    if (entry.name !== "page.tsx") return [];
    return ["/" + path.dirname(file).split(path.sep).slice(1).filter(segment => !segment.startsWith("(")).map(segment => segment === "[ref]" ? "MQ-FIXTURE-001" : segment.startsWith("[") ? ID : segment).join("/")];
  });
}
test("cookie-only sessions survive reload and logout clears protected access", async ({ page }) => {
  await preferences(page); await login(page, "admin@example.test", false);
  const cookie = (await page.context().cookies()).find(item => item.name === "miqat_token");
  expect(cookie?.httpOnly).toBe(true); expect(cookie?.expires).toBe(-1);
  expect(await page.evaluate(() => localStorage.getItem("miqat_token") || sessionStorage.getItem("miqat_token"))).toBeNull();
  await page.reload(); await expect(page.getByRole("heading", { name: "Workspace overview" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin/fleet"); await expect(page).toHaveURL(/\/login$/);
});
test("temporary password requires a change before business access", async ({ page }) => {
  await preferences(page); await login(page, "temporary@example.test");
  await expect(page.getByRole("heading", { name: "Set a new password" })).toBeVisible();
  await page.locator("#password").fill("new-fixture-password");
  await page.locator("#confirm-password").fill("new-fixture-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin$/);
});
test("navigation reaches finance and people without switching workspaces; filters survive details", async ({ page }) => {
  await preferences(page); await login(page);
  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/customers$/);
  await page.getByRole("link", { name: "Fleet", exact: true }).click();
  const search = page.getByRole("searchbox"); await search.fill("Toyota");
  await expect(page).toHaveURL(/q=Toyota/);
  await expect(page.getByText("Hiace", { exact: false }).first()).toBeVisible();
  await page.goto("/admin/invoices"); await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue("Toyota");
});
test("captain cannot open admin workspace and historical inspections do not grant readiness", async ({ page }) => {
  await preferences(page); await login(page, "captain@example.test");
  await page.goto("/admin/fleet"); await expect(page).toHaveURL(/\/captain$/);
  await page.route("**/api/proxy/inspections/today**", route => route.fulfill({ json: { success: true, data: null } }));
  await page.route("**/api/proxy/inspections?**", route => route.fulfill({ json: { success: true, data: [{ id: ID, vehiclePlate: "أ ب ج 1234", inspectionDate: "2000-01-01T09:00:00+03:00" }] } }));
  await page.reload();
  await expect(page.getByText("Vehicle inspection has not been recorded yet", { exact: false })).toBeVisible();
});
test("failed requests expose retry and cookie-authenticated documents contain no token in URLs", async ({ page }) => {
  await preferences(page); await login(page);
  await page.route("**/api/proxy/dashboard/stats", route => route.fulfill({ status: 503, json: { success: false, error: "Fixture unavailable" } }));
  await page.reload(); await expect(page.getByRole("alert").first()).toContainText("Fixture unavailable");
  await page.unroute("**/api/proxy/dashboard/stats");
  await page.getByRole("button", { name: "Retry", exact: true }).first().click();
  await expect(page.getByRole("button", { name: /Preview contract MQ-FIXTURE/ })).toBeVisible();
  await page.getByRole("button", { name: /Preview contract MQ-FIXTURE/ }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  expect(await dialog.locator("iframe").getAttribute("src")).toContain("/api/proxy/contracts/");
  expect(await dialog.locator("iframe").getAttribute("src")).not.toContain("token=");
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible();
});
test("invoice payment review rejects excess amounts without posting and dialogs trap focus", async ({ page }) => {
  await preferences(page); await login(page); await page.goto("/admin/invoices");
  const payment = page.getByRole("button", { name: /Record Payment|Record payment|Collect payment|تسجيل دفعة|تحصيل/i }).first();
  await payment.click(); const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[inputmode="decimal"], input[type="number"]').first()).toBeVisible();
  const amount = dialog.locator("#pay-amount");
  await expect(amount).toHaveValue("115.00");
  await amount.fill("115.01");
  expect(await amount.evaluate((input: HTMLInputElement) => input.validity.rangeOverflow)).toBe(true);
  await amount.fill("115.00");
  const saved = page.waitForRequest(request => request.method() === "POST" && request.url().includes("/accounting/payments"));
  await dialog.locator('button[type="submit"]').click();
  expect((await saved).postDataJSON().amount).toBe("115.00");
  await expect(dialog).not.toBeVisible();
});
for (const language of ["ar", "en"]) for (const theme of ["light", "dark"]) {
  test(`every page route renders in ${language} / ${theme}`, async ({ page }) => {
    test.setTimeout(240_000); await preferences(page, language, theme); await login(page);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    for (const route of routes().filter(route => route.startsWith("/admin"))) {
      await page.goto(route); await expect(page.locator("#main-content")).toBeVisible();
      await expect(page.locator("#main-content").getByRole("heading").first()).toBeVisible();
      await expect(page.getByText(language === "ar" ? "تعذر عرض الصفحة" : "Unable to display page", { exact: true })).toHaveCount(0);
    }
    await page.context().request.post("/api/proxy/auth/logout");
    for (const route of ["/login", "/forgot-password", "/reset-password", "/verify/contract/MQ-FIXTURE-001", `/verify/inspection/${ID}`, `/verify/invoice/${ID}#key=${"a".repeat(43)}`]) {
      await page.goto(route); await expect(page.locator("main")).toBeVisible();
    }
    await login(page, "captain@example.test");
    for (const route of routes().filter(route => route.startsWith("/captain"))) {
      await page.goto(route); await expect(page.locator("#main-content")).toBeVisible();
      await expect(page.locator("#main-content").getByRole("heading").first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
test("responsive layouts, keyboard access, and accessibility", async ({ page }) => {
  test.setTimeout(120_000); await preferences(page); await login(page);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 }); await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Workspace overview" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width < 1024) { await page.getByRole("button", { name: "Open navigation" }).click(); await expect(page.locator("#mobile-navigation")).toBeVisible(); await page.keyboard.press("Escape"); await expect(page.locator("#mobile-navigation")).not.toBeVisible(); }
    fs.mkdirSync("/tmp/miqat-redesign-review", { recursive: true });
    await page.screenshot({ path: `/tmp/miqat-redesign-review/${width === 1440 ? "desktop" : width === 390 ? "mobile" : "tablet"}.png`, fullPage: true });
  }
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  await page.context().request.post("/api/proxy/auth/logout"); await page.goto("/login");
  const authResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(authResults.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
});

test("admin contract creation uses the shared fields, inspection, and protected preview", async ({ page }) => {
  await preferences(page); await login(page); await page.goto("/admin/contracts/new");
  const picker = page.locator("details.search-select").first();
  await picker.locator("summary").click();
  await picker.getByRole("button", { name: /Fixture Captain/ }).click();
  await page.getByLabel("Lead guest name").fill("Created Fixture Guest");
  await page.locator('input[name="passengers.0.name"]').fill("Created Fixture Passenger");
  const saved = page.waitForResponse(response => response.request().method() === "POST" && /\/contracts$/.test(response.url()));
  await page.locator('form button[type="submit"]').click();
  const response = await saved;
  const payload = response.request().postDataJSON();
  const created = (await response.json()) as { data: { status: string; referenceNumber: string } };
  expect(payload.customerName).toBe("Created Fixture Guest"); expect(payload.captainId).toBe(ID); expect(payload.inspectionId).toBe(ID);
  expect(created.data.status).toBe("ACTIVE");
  await expect(page.getByRole("dialog", { name: "Contract preview" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/admin");
  await expect(page.getByText("Contracts awaiting review")).toHaveCount(0);
});
test("captain inspection requires an explicit declaration and saves the complete checklist", async ({ page }) => {
  await preferences(page, "ar"); await login(page, "captain@example.test");
  await page.goto("/captain/inspection");
  const declaration = page.getByRole("checkbox", { name: /إقرار وتعهد الكابتن/ });
  await expect(declaration).not.toBeChecked(); await declaration.check();
  const saved = page.waitForRequest(request => request.method() === "POST" && /\/inspections$/.test(request.url()));
  await page.locator('form button[type="submit"]').click();
  const payload = (await saved).postDataJSON(); expect(payload.driverDeclared).toBe(true); expect(payload.captainId).toBe(ID); expect(payload.seatBelts).toBe(true);
});
test("invoice creation preserves exact totals through review and issuance", async ({ page }) => {
  await preferences(page, "ar"); await login(page); await page.goto("/admin/invoices/new?type=TAX");
  await page.locator('input[name="customerName"]').fill("عميل الاختبار");
  await page.locator('input[type="tel"]').fill("551234567");
  await page.locator("#main-content nav button").nth(1).click();
  await page.getByLabel("عنوان الانطلاق", { exact: false }).fill("مطار جدة");
  await page.getByLabel("عنوان الوصول", { exact: false }).fill("مكة");
  await page.locator("#main-content nav button").nth(2).click();
  await page.getByLabel("وصف الخدمة", { exact: false }).fill("خدمة نقل تجريبية");
  await page.getByLabel("السعر (ر.س)", { exact: false }).fill("100");
  await page.getByLabel("المعاملة الضريبية", { exact: false }).selectOption("S");
  await expect(page.getByTestId("invoice-total")).toContainText("115.00");
  await page.locator("#main-content nav button").nth(3).click();
  await page.getByRole("checkbox", { name: /أقر بأنني راجعت/ }).check();
  const saved = page.waitForRequest(request => request.method() === "POST" && /\/invoices$/.test(request.url()));
  await page.locator('button[type="submit"]').click();
  const payload = (await saved).postDataJSON(); expect(payload.lines[0].unitPrice).toBe("100"); expect(payload.documentType).toBe("TAX");
});
test("expense entry saves supplier details and exact amounts in the isolated backend", async ({ page }) => {
  await preferences(page, "ar"); await login(page); await page.goto("/admin/purchases");
  await page.getByRole("button", { name: /إضافة مصروف|تسجيل مصروف|فاتورة مورد جديدة|مصروف جديد|تسجيل فاتورة/ }).first().click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  await dialog.getByLabel("اسم المورد", { exact: false }).fill("مورد الاختبار");
  await dialog.getByLabel("رقم مستند المورد", { exact: false }).fill("FIXTURE-EXPENSE");
  await dialog.getByLabel("المبلغ قبل الضريبة", { exact: false }).fill("100");
  const saved = page.waitForRequest(request => request.method() === "POST" && /\/accounting\/purchases$/.test(request.url()));
  await dialog.locator('button[type="submit"]').click();
  const payload = (await saved).postDataJSON(); expect(payload.purchase.supplierName).toBe("مورد الاختبار"); expect(payload.purchase.netAmount).toBe("100");
});

test("capture representative sections in both languages and themes", async ({ browser }) => {
  test.setTimeout(180_000);
  const output = "/tmp/miqat-redesign-review"; fs.mkdirSync(output, { recursive: true });
  const geometry: unknown[] = [];
  for (const language of ["ar", "en"]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const loginPage = await context.newPage(); await preferences(loginPage, language, theme); await login(loginPage); await loginPage.close();
    for (const [route, name] of [["/admin", "dashboard"], ["/admin/fleet", "fleet"], ["/admin/contracts/new", "contract"], ["/admin/invoices/new", "invoice"]]) {
      for (const width of [390, 768, 1440]) {
        // A fresh page avoids stale fixed-layer rasterization when Chrome changes viewport sizes.
        const page = await context.newPage(); await page.setViewportSize({ width, height: 1000 });
        await page.goto(route); await expect(page.locator("#main-content").getByRole("heading").first()).toBeVisible();
        await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const metrics = await page.evaluate(() => ({ headerCount: document.querySelectorAll(".workspace-header").length, headers: Array.from(document.querySelectorAll(".workspace-header")).map(element => { const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; }), viewport: { width: innerWidth, height: innerHeight }, navigation: Array.from(document.querySelectorAll(".mobile-bottom-nav")).map(element => ({ display: getComputedStyle(element).display, top: element.getBoundingClientRect().top })) }));
        expect(metrics.headerCount).toBe(1);
        expect(metrics.headers[0].y).toBe(0);
        expect(metrics.navigation[0].display === "none").toBe(width >= 1024);
        geometry.push({ route, name, language, theme, width, ...metrics });
        await page.screenshot({ path: `${output}/${name}-${language}-${theme}-${width}.png`, animations: "disabled", caret: "hide" });
        await page.close();
      }
    }
    await context.close();
  }
  fs.writeFileSync(`${output}/geometry.json`, JSON.stringify(geometry, null, 2));
});

test("a failed logout keeps the current session visible and offers an error", async ({ page }) => {
  await preferences(page); await login(page);
  await page.route("**/api/proxy/auth/logout", route => route.fulfill({ status: 503, json: { success: false, error: "Fixture sign-out unavailable" } }));
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Fixture sign-out unavailable" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeEnabled();
});

test("root redirects anonymous, admin, and captain sessions to the correct workspace", async ({ page }) => {
  await preferences(page); await page.goto("/"); await expect(page).toHaveURL(/\/login$/);
  await login(page); await page.goto("/"); await expect(page).toHaveURL(/\/admin$/);
  await page.context().request.post("/api/proxy/auth/logout");
  await login(page, "captain@example.test"); await page.goto("/"); await expect(page).toHaveURL(/\/captain$/);
});

test("mobile admin quick-create, More drawer, zero horizontal overflow, and accessibility", async ({ page }) => {
  test.setTimeout(120_000);
  const output = "/tmp/miqat-redesign-review";
  fs.mkdirSync(output, { recursive: true });
  await preferences(page, "en", "light");
  await page.setViewportSize({ width: 390, height: 960 });
  await login(page);

  await page.locator(".mobile-quick-create-btn").click();
  const quickCreate = page.locator("#mobile-quick-create");
  await expect(quickCreate).toBeVisible();
  await expect(quickCreate.locator('a[href="/admin/contracts/new"]')).toBeVisible();
  await expect(quickCreate.locator('a[href="/admin/invoices/new"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(quickCreate).not.toBeVisible();

  await page.locator(".mobile-bottom-nav").getByRole("button", { name: "More" }).click();
  const mobileHub = page.locator("#mobile-navigation");
  await expect(mobileHub).toBeVisible();
  await expect(mobileHub.locator('a[href="/admin/accounting"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(mobileHub).not.toBeVisible();

  for (const route of [
    "/admin/contracts",
    "/admin/invoices",
    "/admin/customers",
    "/admin/accounting",
    "/admin/vat-returns",
    "/admin/captains",
    "/admin/inspections",
    "/admin/admins",
  ]) {
    await page.goto(route);
    await expect(page.locator("#main-content").getByRole("heading").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (route === "/admin/contracts") {
      await page.evaluate(() => document.querySelector("#contracts-list-heading")?.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${output}/contracts-en-light-390.png`, animations: "disabled", caret: "hide" });
      await page.locator('[aria-labelledby="contracts-list-heading"] article').first().screenshot({ path: `${output}/contract-card-en-light-390.png`, animations: "disabled" });
      const contractsAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(contractsAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
      await page.locator("article button", { hasText: /Passengers|الركاب/ }).first().click();
      const detailsDialog = page.getByRole("dialog");
      await expect(detailsDialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(detailsDialog).not.toBeVisible();
    }
    if (route === "/admin/customers") {
      await page.screenshot({ path: `${output}/customers-en-light-390.png`, animations: "disabled", caret: "hide" });
    }
    if (route === "/admin/accounting") {
      await page.screenshot({ path: `${output}/accounting-en-light-390.png`, animations: "disabled", caret: "hide" });
    }
  }

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);

  // Capture Arabic dark mobile contracts cards for RTL/dark visual & accessibility verification
  const rtlContext = await page.context().browser()?.newContext({ viewport: { width: 390, height: 960 } });
  if (rtlContext) {
    const rtlPage = await rtlContext.newPage();
    await preferences(rtlPage, "ar", "dark");
    await login(rtlPage);
    await rtlPage.goto("/admin/contracts");
    await expect(rtlPage.locator("#contracts-list-heading")).toBeVisible();
    await rtlPage.evaluate(() => document.fonts.ready);
    expect(await rtlPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await rtlPage.evaluate(() => document.querySelector("#contracts-list-heading")?.scrollIntoView({ block: "start" }));
    await rtlPage.waitForTimeout(150);
    await rtlPage.screenshot({ path: `${output}/contracts-ar-dark-390.png`, animations: "disabled", caret: "hide" });
    await rtlPage.locator('[aria-labelledby="contracts-list-heading"] article').first().screenshot({ path: `${output}/contract-card-ar-dark-390.png`, animations: "disabled" });
    const rtlAxe = await new AxeBuilder({ page: rtlPage }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(rtlAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    await rtlContext.close();
  }
});

test("mobile captain field routes keep zero horizontal overflow and clean accessibility", async ({ page }) => {
  test.setTimeout(90_000);
  const output = "/tmp/miqat-redesign-review";
  fs.mkdirSync(output, { recursive: true });
  await preferences(page, "ar", "dark");
  await page.setViewportSize({ width: 390, height: 960 });
  await login(page, "captain@example.test");

  for (const [route, shot] of [
    ["/captain", "captain-ar-dark-390.png"],
    ["/captain/inspection", "captain-inspection-ar-dark-390.png"],
    ["/captain/contract", "captain-contract-ar-dark-390.png"],
  ] as const) {
    await page.goto(route);
    await expect(page.locator("#main-content").getByRole("heading").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (shot === "captain-ar-dark-390.png") {
      await page.evaluate(() => document.querySelector("#main-content article")?.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: `${output}/${shot}`, animations: "disabled", caret: "hide" });
  }

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);

  // Capture Arabic dark mobile contracts cards for RTL/dark visual & accessibility verification
  const rtlContext = await page.context().browser()?.newContext({ viewport: { width: 390, height: 960 } });
  if (rtlContext) {
    const rtlPage = await rtlContext.newPage();
    await preferences(rtlPage, "ar", "dark");
    await login(rtlPage);
    await rtlPage.goto("/admin/contracts");
    await expect(rtlPage.locator("#contracts-list-heading")).toBeVisible();
    await rtlPage.evaluate(() => document.fonts.ready);
    expect(await rtlPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await rtlPage.evaluate(() => document.querySelector("#contracts-list-heading")?.scrollIntoView({ block: "start" }));
    await rtlPage.waitForTimeout(150);
    await rtlPage.screenshot({ path: `${output}/contracts-ar-dark-390.png`, animations: "disabled", caret: "hide" });
    await rtlPage.locator('[aria-labelledby="contracts-list-heading"] article').first().screenshot({ path: `${output}/contract-card-ar-dark-390.png`, animations: "disabled" });
    const rtlAxe = await new AxeBuilder({ page: rtlPage }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(rtlAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    await rtlContext.close();
  }
});

test("contract review page exposes pricing and commissions as optional checkbox sections", async ({ page }) => {
  test.setTimeout(90_000);
  const output = "/tmp/miqat-redesign-review";
  fs.mkdirSync(output, { recursive: true });

  await preferences(page, "en", "light");
  await page.setViewportSize({ width: 1440, height: 960 });
  await login(page);
  await page.goto(`/admin/contracts/${ID}`);

  // Stored business data (e.g. Arabic destination) stays intact in English mode
  await expect(page.getByText("مكة المكرمة", { exact: true })).toBeVisible();
  await expect(page.getByText("Makkah Time", { exact: true })).toHaveCount(0);

  const pricingToggle = page.getByRole("checkbox", { name: /^Trip pricing and VAT/ });
  const commissionsToggle = page.getByRole("checkbox", { name: /^Commissions/ });
  await expect(pricingToggle).toBeChecked();
  await expect(commissionsToggle).not.toBeChecked();

  const amountInput = page.getByLabel("Service price after discount, excluding VAT");
  await expect(amountInput).toHaveValue("100.00");

  // Uncheck pricing and verify inputs collapse cleanly
  await pricingToggle.uncheck();
  await expect(amountInput).toHaveCount(0);

  // Check commissions, enable Driver commission, and enter a fixed commission
  await commissionsToggle.check();
  const driverToggle = page.getByRole("checkbox", { name: /^Driver commission/ });
  await expect(driverToggle).not.toBeChecked();
  await driverToggle.check();
  const commissionAmountInput = page.getByLabel("Commission amount");
  await commissionAmountInput.fill("75");

  await page.evaluate(() => {
    document.querySelector('form button[type="submit"]')?.scrollIntoView({ block: "end" });
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${output}/contract-detail-en-light-1440.png`, animations: "disabled", caret: "hide" });

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const desktopAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(desktopAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);

  const savedPut = page.waitForRequest(req => req.method() === "PUT" && req.url().includes(`/workforce/contracts/${ID}`));
  await page.getByRole("button", { name: "Save customer and entitlements" }).click();
  const sentPayload = (await savedPut).postDataJSON() as {
    commercial: { netAmount: string; taxCategory: string; driverCommission: { mode: string; amount: string } };
  };
  expect(sentPayload.commercial.netAmount).toBe("0");
  expect(sentPayload.commercial.taxCategory).toBe("S");
  expect(sentPayload.commercial.driverCommission.mode).toBe("FIXED");
  expect(sentPayload.commercial.driverCommission.amount).toBe("75");

  // Mobile AR dark view with unconfigured commercial data (both checkboxes start unchecked)
  const mobileCtx = await page.context().browser()?.newContext({ viewport: { width: 390, height: 960 } });
  if (mobileCtx) {
    const mobilePage = await mobileCtx.newPage();
    await preferences(mobilePage, "ar", "dark");
    await login(mobilePage);
    await mobilePage.route(`**/api/proxy/workforce/contracts/${ID}`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { success: true, data: null } });
        return;
      }
      await route.continue();
    });
    await mobilePage.goto(`/admin/contracts/${ID}`);

    const arPricingToggle = mobilePage.getByRole("checkbox", { name: /^تسعير الرحلة والضريبة/ });
    const arCommissionsToggle = mobilePage.getByRole("checkbox", { name: /^العمولات/ });
    await expect(arPricingToggle).not.toBeChecked();
    await expect(arCommissionsToggle).not.toBeChecked();

    await arPricingToggle.scrollIntoViewIfNeeded();
    await mobilePage.waitForTimeout(150);
    await mobilePage.screenshot({ path: `${output}/contract-detail-ar-dark-390.png`, animations: "disabled", caret: "hide" });

    // Opt into both on mobile and verify zero overflow + Axe WCAG 2.1 AA
    await arPricingToggle.check();
    await mobilePage.getByLabel("قيمة الخدمة بعد الخصم وقبل الضريبة").fill("250");
    await arCommissionsToggle.check();
    await mobilePage.getByRole("checkbox", { name: /^عمولة السائق/ }).check();
    await mobilePage.getByLabel("مبلغ العمولة").fill("40");
    await mobilePage.waitForTimeout(150);
    await mobilePage.screenshot({ path: `${output}/contract-detail-checked-ar-dark-390.png`, animations: "disabled", caret: "hide" });

    expect(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const mobileAxe = await new AxeBuilder({ page: mobilePage }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(mobileAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    await mobileCtx.close();
  }
});

test("rebuilt staff directory and statement tables render cleanly across breakpoints, themes, and languages", async ({ page }) => {
  test.setTimeout(120_000);
  const output = "/tmp/miqat-redesign-review";
  fs.mkdirSync(output, { recursive: true });

  const fixtureMembers = [
    {
      id: ID,
      captainId: ID,
      name: "عبدالله الحربي",
      kind: "DRIVER",
      isRepresentative: false,
      phone: "0551112233",
      vatNumber: null,
      bankDetails: {
        bankName: "مصرف الإنماء",
        accountHolder: "عبدالله الحربي",
        iban: "SA0380000000608010167519",
      },
      active: true,
      version: 1,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      captainId: null,
      name: "شركة الرافد للسياحة",
      kind: "EXTERNAL_COMPANY",
      isRepresentative: true,
      phone: "0509988776",
      vatNumber: "310123456700003",
      bankDetails: {
        bankName: "مصرف الراجحي",
        accountHolder: "شركة الرافد للسياحة",
        iban: "SA4420000001234567891234",
      },
      active: true,
      version: 2,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      captainId: null,
      name: "خالد السبيعي",
      kind: "EMPLOYEE",
      isRepresentative: true,
      phone: null,
      vatNumber: null,
      bankDetails: null,
      active: false,
      version: 1,
    },
  ];

  const fixtureStatement = {
    member: fixtureMembers[0],
    balances: {
      entitlement: "2450.50",
      custody: "500.00",
      advance: "300.00",
    },
    operations: [
      {
        id: "op-1",
        kind: "SALARY",
        amount: "3000.00",
        entitlementDelta: "3000.00",
        custodyDelta: "0",
        advanceDelta: "0",
        effectiveDate: "2026-10-01T00:00:00Z",
        description: "اعتماد راتب شهر أكتوبر — مسير معتمد",
        reversalOfId: null,
      },
      {
        id: "op-2",
        kind: "CUSTODY_ISSUE",
        amount: "500.00",
        entitlementDelta: "0",
        custodyDelta: "500.00",
        advanceDelta: "-100.00",
        effectiveDate: "2026-10-05T00:00:00Z",
        description: "صرف عهدة تشغيلية لرحلة مكة — المدينة مع تسوية سلفة",
        reversalOfId: null,
      },
      {
        id: "op-3",
        kind: "PAYOUT",
        amount: "800.00",
        entitlementDelta: "-800.00",
        custodyDelta: "0",
        advanceDelta: "0",
        effectiveDate: "2026-10-10T00:00:00Z",
        description: "صرف جزء من المستحقات — خطأ إدخال",
        reversalOfId: null,
      },
      {
        id: "op-4",
        kind: "REVERSAL",
        amount: "800.00",
        entitlementDelta: "800.00",
        custodyDelta: "0",
        advanceDelta: "0",
        effectiveDate: "2026-10-10T00:00:00Z",
        description: "عكس صرف المستحقات غير المكتمل",
        reversalOfId: "op-3",
      },
      {
        id: "op-5",
        kind: "COMMISSION_BILL",
        amount: "250.50",
        entitlementDelta: "250.50",
        custodyDelta: "0",
        advanceDelta: "0",
        effectiveDate: "2026-10-12T00:00:00Z",
        description: "عمولة رحلة عقد MQ-FIXTURE-001",
        reversalOfId: null,
      },
    ],
    salaryTerms: [
      { id: "st-1", effectiveFrom: "2026-01-01T00:00:00Z", amount: "3000.00" },
    ],
    payroll: [
      {
        id: "pay-1",
        month: "2026-11",
        amount: "2850.00",
        adjustmentReason: "خصم تأخير يوم واحد",
        status: "DRAFT",
        version: 1,
      },
      {
        id: "pay-2",
        month: "2026-10",
        amount: "3000.00",
        adjustmentReason: "",
        status: "APPROVED",
        version: 2,
      },
    ],
    commissions: [
      {
        contractId: ID,
        contract: { referenceNumber: "MQ-FIXTURE-001", tripDate: "2026-10-12" },
        amount: "450.50",
        status: "COMPLETED",
        paidAmount: "200.00",
        remainingAmount: "250.50",
        paymentStatus: "DUE",
      },
      {
        contractId: "44444444-4444-4444-8444-444444444444",
        contract: { referenceNumber: "MQ-FIXTURE-002", tripDate: "2026-09-20" },
        amount: "300.00",
        status: "COMPLETED",
        paidAmount: "300.00",
        remainingAmount: "0.00",
        paymentStatus: "PAID",
      },
    ],
    legacy: [
      {
        id: "leg-1",
        effectiveDate: "2025-12-15T00:00:00Z",
        description: "رصيد مرحّل من الدفتر القديم",
        direction: "+",
        amount: "150.00",
      },
    ],
  };

  await page.route("**/api/proxy/workforce/members?*", async (route) => {
    await route.fulfill({ json: { success: true, data: { items: fixtureMembers } } });
  });
  await page.route(`**/api/proxy/workforce/members/${ID}`, async (route) => {
    await route.fulfill({ json: { success: true, data: fixtureStatement } });
  });
  await page.route("**/api/proxy/workforce/payroll/*/approve", async (route) => {
    await route.fulfill({
      status: 409,
      json: { success: false, error: "Payroll period locked in fixture" },
    });
  });

  // 1) English / Light Desktop Directory + Statement Verification
  await preferences(page, "en", "light");
  await page.setViewportSize({ width: 1440, height: 960 });
  await login(page);
  await page.goto("/admin/staff");
  await expect(page.getByRole("heading", { name: "Accounts directory" })).toBeVisible();
  const dirTable = page.getByRole("region", { name: "Accounts directory" });
  await expect(dirTable.getByText("SA03 8000 0000 6080 1016 7519")).toBeVisible();
  await expect(dirTable.getByText("310123456700003")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await dirTable.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/staff-list-en-light-1440.png`, animations: "disabled", caret: "hide" });

  // Filter persistence via URL params & reset
  await page.getByRole("button", { name: /Drivers/ }).click();
  await expect(page).toHaveURL(/kind=DRIVER/);
  await page.getByRole("searchbox").fill("SA038000");
  await expect(page).toHaveURL(/q=SA038000/);
  await expect(dirTable.locator("tbody th[scope='row']")).toHaveCount(1);
  await page.getByRole("button", { name: /Clear Filters/ }).click();
  await expect(dirTable.locator("tbody th[scope='row']")).toHaveCount(3);

  const staffListEnAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(staffListEnAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);

  // Tablet breakpoint (768px) renders mobile record cards cleanly without crammed 6-col table
  await page.setViewportSize({ width: 768, height: 960 });
  await expect(page.locator("article").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `${output}/staff-list-en-light-768.png`, animations: "disabled", caret: "hide" });

  // Statement detail page on desktop (EN Light 1440)
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`/admin/staff/${ID}`);
  await expect(page.getByRole("heading", { name: "Transactions and operations ledger" })).toBeVisible();
  const opsTable = page.getByRole("region", { name: "Transactions and operations ledger" });
  await expect(opsTable.getByText("Reversed", { exact: true })).toBeVisible();
  // Combined custody & advance delta both appear on row op-2
  const op2Row = opsTable.locator("tbody tr").filter({ hasText: "صرف عهدة تشغيلية لرحلة مكة" });
  await expect(op2Row).toContainText("+500.00");
  await expect(op2Row).toContainText("-100.00");
  await expect(opsTable.locator("tfoot")).toContainText("Filtered ledger summary (5)");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await opsTable.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/staff-detail-ops-en-light-1440.png`, animations: "disabled", caret: "hide" });

  const opsEnAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(opsEnAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);

  // Switch to Payroll tab -> trigger approve error & confirm visible alert banner
  await page.getByRole("tab", { name: /Payroll and salaries/ }).click();
  await expect(page.getByRole("heading", { name: "Monthly payroll drafts" })).toBeVisible();
  const payrollTable = page.getByRole("region", { name: "Monthly payroll drafts" });
  await payrollTable.getByRole("button", { name: "Approve accrual 2026-11" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Payroll period locked in fixture" })).toBeVisible();
  await page.screenshot({ path: `${output}/staff-detail-payroll-en-light-1440.png`, animations: "disabled", caret: "hide" });

  // Keyboard arrow navigation to Commissions tab -> check footer totals & tripDate
  const payrollTab = page.getByRole("tab", { name: /Payroll and salaries/ });
  await payrollTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Trip commissions" })).toBeVisible();
  const commTable = page.getByRole("region", { name: "Trip commissions" });
  await expect(commTable.locator("tfoot")).toContainText("750.50 SAR");
  expect(await commTable.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.locator('[data-slot="card-footer"]').filter({ hasText: "Total commissions" })).toBeHidden();
  await page.screenshot({ path: `${output}/staff-detail-commissions-en-light-1440.png`, animations: "disabled", caret: "hide" });

  // 2) Arabic RTL / Dark context across 1440 Desktop & 390 Mobile
  const arCtx = await page.context().browser()?.newContext({ viewport: { width: 1440, height: 960 } });
  if (arCtx) {
    const arPage = await arCtx.newPage();
    await arPage.route("**/api/proxy/workforce/members?*", async (route) => {
      await route.fulfill({ json: { success: true, data: { items: fixtureMembers } } });
    });
    await arPage.route(`**/api/proxy/workforce/members/${ID}`, async (route) => {
      await route.fulfill({ json: { success: true, data: fixtureStatement } });
    });

    await preferences(arPage, "ar", "dark");
    await login(arPage);
    await arPage.goto("/admin/staff");
    await expect(arPage.getByRole("heading", { name: "سجل الحسابات" })).toBeVisible();
    const arDirTable = arPage.getByRole("region", { name: "سجل الحسابات" });
    await arPage.evaluate(() => document.fonts.ready);
    expect(await arPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await arDirTable.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await arPage.screenshot({ path: `${output}/staff-list-ar-dark-1440.png`, animations: "disabled", caret: "hide" });

    // Mobile 390px AR dark directory cards + statement operations cards
    await arPage.setViewportSize({ width: 390, height: 960 });
    await expect(arPage.locator("article").first()).toBeVisible();
    expect(await arPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await arPage.screenshot({ path: `${output}/staff-list-ar-dark-390.png`, animations: "disabled", caret: "hide" });
    const staffMobAxe = await new AxeBuilder({ page: arPage }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(staffMobAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);

    await arPage.goto(`/admin/staff/${ID}`);
    await expect(arPage.getByRole("heading", { name: "كشف العمليات والحركات" })).toBeVisible();
    await arPage.evaluate(() => document.fonts.ready);
    expect(await arPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await arPage.screenshot({ path: `${output}/staff-detail-ops-ar-dark-390.png`, animations: "disabled", caret: "hide" });
    const mobOpCard = arPage.locator("article").filter({ hasText: "صرف عهدة تشغيلية لرحلة مكة" });
    await mobOpCard.scrollIntoViewIfNeeded();
    await expect(mobOpCard).toBeVisible();
    await arPage.screenshot({ path: `${output}/staff-detail-ops-cards-ar-dark-390.png`, animations: "disabled", caret: "hide" });
    const opsMobAxe = await new AxeBuilder({ page: arPage }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(opsMobAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);

    await arCtx.close();
  }
});
