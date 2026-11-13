import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
const ID = "11111111-1111-4111-8111-111111111111";
async function preferences(page: Page, language = "en", theme = "light") {
  await page
    .context()
    .addCookies([
      { name: "miqat_language", value: language, url: "http://127.0.0.1:3419" },
    ]);
  await page.addInitScript(
    ({ language, theme }) => {
      localStorage.setItem("miqat_language", language);
      localStorage.setItem("miqat_theme", theme);
    },
    { language, theme },
  );
}
async function login(
  page: Page,
  email = "admin@example.test",
  persistent = true,
) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("fixture-password");
  if (!persistent) await page.getByRole("checkbox").uncheck();
  await page.locator('button[type="submit"]').click();
  if (email !== "temporary@example.test")
    await expect(page).toHaveURL(
      email === "captain@example.test" ? /\/captain$/ : /\/admin$/,
    );
}
function routes(directory = "app"): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return routes(file);
    if (entry.name !== "page.tsx") return [];
    return [
      "/" +
        path
          .dirname(file)
          .split(path.sep)
          .slice(1)
          .filter((segment) => !segment.startsWith("("))
          .map((segment) =>
            segment === "[ref]"
              ? "MQ-FIXTURE-001"
              : segment.startsWith("[")
                ? ID
                : segment,
          )
          .join("/"),
    ];
  });
}
test("cookie-only sessions survive reload and logout clears protected access", async ({
  page,
}) => {
  await preferences(page);
  await login(page, "admin@example.test", false);
  const cookie = (await page.context().cookies()).find(
    (item) => item.name === "miqat_token",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.expires).toBe(-1);
  expect(
    await page.evaluate(
      () =>
        localStorage.getItem("miqat_token") ||
        sessionStorage.getItem("miqat_token"),
    ),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Workspace overview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin/fleet");
  await expect(page).toHaveURL(/\/login$/);
});
test("temporary password requires a change before business access", async ({
  page,
}) => {
  await preferences(page);
  await login(page, "temporary@example.test");
  await expect(
    page.getByRole("heading", { name: "Set a new password" }),
  ).toBeVisible();
  await page.locator("#password").fill("new-fixture-password");
  await page.locator("#confirm-password").fill("new-fixture-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin$/);
});
test("navigation reaches finance and people without switching workspaces; filters survive details", async ({
  page,
}) => {
  await preferences(page);
  await login(page);
  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/customers$/);
  await page.getByRole("link", { name: "Fleet", exact: true }).click();
  const search = page.getByRole("searchbox");
  await search.fill("Toyota");
  await expect(page).toHaveURL(/q=Toyota/);
  await expect(page.getByText("Hiace", { exact: false }).first()).toBeVisible();
  await page.goto("/admin/invoices");
  await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue("Toyota");
});
test("captain cannot open admin workspace and historical inspections do not grant readiness", async ({
  page,
}) => {
  await preferences(page);
  await login(page, "captain@example.test");
  await page.goto("/admin/fleet");
  await expect(page).toHaveURL(/\/captain$/);
  await page.route("**/api/proxy/inspections/today**", (route) =>
    route.fulfill({ json: { success: true, data: null } }),
  );
  await page.route("**/api/proxy/inspections?**", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [
          {
            id: ID,
            vehiclePlate: "أ ب ج 1234",
            inspectionDate: "2000-01-01T09:00:00+03:00",
          },
        ],
      },
    }),
  );
  await page.reload();
  await expect(
    page.getByText("Vehicle inspection has not been recorded yet", {
      exact: false,
    }),
  ).toBeVisible();
});
test("failed requests expose retry and cookie-authenticated documents contain no token in URLs", async ({
  page,
}) => {
  await preferences(page);
  await login(page);
  await page.route("**/api/proxy/dashboard/stats", (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, error: "Fixture unavailable" },
    }),
  );
  await page.reload();
  await expect(page.getByRole("alert").first()).toContainText(
    "Fixture unavailable",
  );
  await page.unroute("**/api/proxy/dashboard/stats");
  await page
    .getByRole("button", { name: "Retry", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: /Preview contract MQ-FIXTURE/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Preview contract MQ-FIXTURE/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.locator("iframe").getAttribute("src")).toContain(
    "/api/proxy/contracts/",
  );
  expect(await dialog.locator("iframe").getAttribute("src")).not.toContain(
    "token=",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
test("invoice payment review rejects excess amounts without posting and dialogs trap focus", async ({
  page,
}) => {
  await preferences(page);
  await login(page);
  await page.goto("/admin/invoices");
  const payment = page
    .getByRole("button", {
      name: /Record Payment|Record payment|Collect payment|تسجيل دفعة|تحصيل/i,
    })
    .first();
  await payment.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.locator('input[inputmode="decimal"], input[type="number"]').first(),
  ).toBeVisible();
  const amount = dialog.locator("#pay-amount");
  await expect(amount).toHaveValue("115.00");
  await amount.fill("115.01");
  expect(
    await amount.evaluate(
      (input: HTMLInputElement) => input.validity.rangeOverflow,
    ),
  ).toBe(true);
  await amount.fill("115.00");
  const saved = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().includes("/accounting/payments"),
  );
  await dialog.locator('button[type="submit"]').click();
  expect((await saved).postDataJSON().amount).toBe("115.00");
  await expect(dialog).not.toBeVisible();
});
for (const language of ["ar", "en"])
  for (const theme of ["light", "dark"]) {
    test(`every page route renders in ${language} / ${theme}`, async ({
      page,
    }) => {
      test.setTimeout(240_000);
      await preferences(page, language, theme);
      await login(page);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const route of routes().filter((route) =>
        route.startsWith("/admin"),
      )) {
        await page.goto(route);
        await expect(page.locator("#main-content")).toBeVisible();
        await expect(
          page.locator("#main-content").getByRole("heading").first(),
        ).toBeVisible();
        await expect(
          page.getByText(
            language === "ar" ? "تعذر عرض الصفحة" : "Unable to display page",
            { exact: true },
          ),
        ).toHaveCount(0);
      }
      await page.context().request.post("/api/proxy/auth/logout");
      for (const route of [
        "/login",
        "/forgot-password",
        "/reset-password",
        "/verify/contract/MQ-FIXTURE-001",
        `/verify/inspection/${ID}`,
        `/verify/invoice/${ID}#key=${"a".repeat(43)}`,
      ]) {
        await page.goto(route);
        await expect(page.locator("main")).toBeVisible();
      }
      await login(page, "captain@example.test");
      for (const route of routes().filter((route) =>
        route.startsWith("/captain"),
      )) {
        await page.goto(route);
        await expect(page.locator("#main-content")).toBeVisible();
        await expect(
          page.locator("#main-content").getByRole("heading").first(),
        ).toBeVisible();
      }
      expect(errors).toEqual([]);
    });
  }
test("responsive layouts, keyboard access, and accessibility", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await preferences(page);
  await login(page);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Workspace overview" }),
    ).toBeVisible();
    await expect(page.locator("#operational-feed-title")).toBeVisible();
    const order = await page.evaluate(() => {
      const feed =
        document
          .querySelector("#operational-feed-title")
          ?.getBoundingClientRect().top ?? Infinity;
      const quick =
        document
          .querySelector("#quick-workflows-heading")
          ?.getBoundingClientRect().top ?? -1;
      const kpi =
        document.querySelector("#kpi-strip-heading")?.getBoundingClientRect()
          .top ?? -1;
      const charts =
        document
          .querySelector("#charts-section-heading")
          ?.getBoundingClientRect().top ?? -1;
      return { feed, quick, kpi, charts };
    });
    expect(order.quick).toBeLessThan(order.feed);
    expect(order.kpi).toBeLessThan(order.feed);
    expect(order.feed).toBeLessThan(order.charts);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width < 1024) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.locator("#mobile-navigation")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("#mobile-navigation")).not.toBeVisible();
    }
    fs.mkdirSync("/tmp/miqat-redesign-review", { recursive: true });
    await page.screenshot({
      path: `/tmp/miqat-redesign-review/${width === 1440 ? "desktop" : width === 390 ? "mobile" : "tablet"}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: /Recent invoices/ }).click();
  await expect(
    page.getByRole("region", { name: "Live operations & records desk" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Captains & fleet/ }).click();
  await expect(
    page.getByRole("region", { name: "Captain readiness today" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Fleet status & expiries" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Recent contracts/ }).click();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.context().request.post("/api/proxy/auth/logout");
  await page.goto("/login");
  const authResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    authResults.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});

test("admin contract creation uses the shared fields, inspection, and protected preview", async ({
  page,
}) => {
  await preferences(page);
  await login(page);
  await page.setViewportSize({ width: 390, height: 960 });
  await page.goto("/admin/contracts/new");
  const submitBar = page.locator(".contract-submit-bar");
  await expect(submitBar).toBeAttached();
  expect(await submitBar.evaluate((el) => getComputedStyle(el).position)).toBe(
    "static",
  );
  await submitBar.scrollIntoViewIfNeeded();
  await expect(submitBar).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  fs.mkdirSync("/tmp/miqat-redesign-review", { recursive: true });
  await page.screenshot({
    path: "/tmp/miqat-redesign-review/contract-submit-bottom-390.png",
    animations: "disabled",
    caret: "hide",
  });
  await page.setViewportSize({ width: 768, height: 960 });
  expect(await submitBar.evaluate((el) => getComputedStyle(el).position)).toBe(
    "static",
  );
  await page.setViewportSize({ width: 1280, height: 960 });
  expect(await submitBar.evaluate((el) => getComputedStyle(el).position)).toBe(
    "sticky",
  );
  const captainPickerButton = page
    .locator('button[data-search-select="true"]')
    .first();
  await captainPickerButton.click();
  const captainPopover = page.locator(".picker-popover:popover-open");
  await expect(captainPopover).toBeVisible();
  await expect(
    page.locator("dialog.fullscreen-dialog--focus[open]"),
  ).toHaveCount(0);
  await captainPopover.getByRole("button", { name: /Fixture Captain/ }).click();
  await expect(captainPopover).not.toBeVisible();

  // Service type starts empty ("None") with unselected templates and no premature invalid state
  const opTypeInput = page.locator('input[name="operationType"]');
  await expect(opTypeInput).toHaveValue("");
  await expect(opTypeInput).not.toHaveAttribute("aria-invalid", "true");
  const cityTourChip = page.getByRole("button", { name: "+ City tour" });
  await expect(cityTourChip).toHaveAttribute("aria-pressed", "false");

  await page.getByLabel("Lead guest name").fill("Created Fixture Guest");
  await page
    .locator('input[name="passengers.0.name"]')
    .fill("Created Fixture Passenger");

  // Submitting with default None blocks POST and highlights required Service type
  await page.locator('form button[type="submit"]').click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Service type is required" }),
  ).toBeVisible();
  await expect(opTypeInput).toHaveAttribute("aria-invalid", "true");

  // Typing a compound custom phrase previews the canonical operation type written to the PDF
  await opTypeInput.fill("توصيل بين المدن");
  await expect(
    page.getByText(/Service type on PDF:\s*Intercity transport/),
  ).toBeVisible();

  // Selecting a template fills the input, shows active pressed state, and supports clear
  await cityTourChip.click();
  await expect(opTypeInput).toHaveValue("جولة سياحية");
  await expect(page.getByText("Service type on PDF:")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "City tour", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Clear Service type" }).click();
  await expect(opTypeInput).toHaveValue("");
  await page.getByRole("button", { name: "+ City tour" }).click();
  await expect(opTypeInput).toHaveValue("جولة سياحية");

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/contracts$/.test(response.url()),
  );
  await page.locator('form button[type="submit"]').click();
  const response = await saved;
  const payload = response.request().postDataJSON();
  const created = (await response.json()) as {
    data: { status: string; referenceNumber: string };
  };
  expect(payload.operationType).toBe("CITY_TOUR");
  expect(payload.customerName).toBe("Created Fixture Guest");
  expect(payload.captainId).toBe(ID);
  expect(payload.inspectionId).toBe(ID);
  expect(created.data.status).toBe("ACTIVE");
  await expect(
    page.getByRole("dialog", { name: "Contract preview" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/admin");
  await expect(page.getByText("Contracts awaiting review")).toHaveCount(0);
});

test("captain contract creation starts with Service type as None and validates before submit", async ({
  page,
}) => {
  await preferences(page, "ar", "light");
  await login(page, "captain@example.test");
  await page.goto("/captain/contract");

  const opSelect = page.locator('button[name="operationType"]');
  await expect(opSelect).toHaveAttribute("data-value", "");
  await expect(opSelect).not.toHaveAttribute("data-invalid", "true");
  await expect(opSelect).toContainText("بدون — اختر نوع العملية");

  await page.locator('input[name="customerName"]').fill("ضيف الكابتن التجريبي");
  await page.locator('form button[type="submit"]').click();
  await expect(
    page.getByRole("alert").filter({ hasText: "نوع العملية التشغيلية مطلوب" }),
  ).toBeVisible();
  await expect(opSelect).toHaveAttribute("data-invalid", "true");

  await opSelect.click();
  const opPopover = page.locator(".picker-popover:popover-open");
  await expect(opPopover).toBeVisible();
  await expect(
    page.locator("dialog.fullscreen-dialog--focus[open]"),
  ).toHaveCount(0);
  await opPopover
    .getByRole("button", { name: /Intercity|نقل بين المدن/ })
    .click();
  await expect(opPopover).not.toBeVisible();
  await expect(opSelect).toHaveAttribute("data-value", "INTERCITY");
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/contracts$/.test(response.url()),
  );
  await page.locator('form button[type="submit"]').click();
  const response = await saved;
  expect(response.request().postDataJSON().operationType).toBe("INTERCITY");

  await expect(
    page.getByRole("dialog", { name: "معاينة العقد" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "معاينة العقد" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "+ إنشاء عقد جديد" }).click();
  await expect(page.locator('button[name="operationType"]')).toHaveAttribute(
    "data-value",
    "",
  );

  const captainAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    captainAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test("captain inspection requires an explicit declaration and saves the complete checklist", async ({
  page,
}) => {
  await preferences(page, "ar");
  await login(page, "captain@example.test");
  await page.goto("/captain/inspection");
  const declaration = page.getByRole("checkbox", {
    name: /إقرار وتعهد الكابتن/,
  });
  await expect(declaration).not.toBeChecked();
  await declaration.check();
  const saved = page.waitForRequest(
    (request) =>
      request.method() === "POST" && /\/inspections$/.test(request.url()),
  );
  await page.locator('form button[type="submit"]').click();
  const payload = (await saved).postDataJSON();
  expect(payload.driverDeclared).toBe(true);
  expect(payload.captainId).toBe(ID);
  expect(payload.seatBelts).toBe(true);
});
test("invoice creation preserves exact totals through review and issuance", async ({
  page,
}) => {
  await preferences(page, "ar");
  await login(page);
  await page.goto("/admin/invoices/new?type=TAX");
  await page.locator('input[name="customerName"]').fill("عميل الاختبار");
  await page.locator('input[type="tel"]').fill("551234567");
  await page.locator("#main-content nav button").nth(1).click();
  await page.getByLabel("عنوان الانطلاق", { exact: false }).fill("مطار جدة");
  await page.getByLabel("عنوان الوصول", { exact: false }).fill("مكة");
  await page.locator("#main-content nav button").nth(2).click();
  await page
    .getByLabel("وصف الخدمة", { exact: false })
    .fill("خدمة نقل تجريبية");
  await page.getByLabel("السعر (ر.س)", { exact: false }).fill("100");
  await page.getByLabel("المعاملة الضريبية", { exact: false }).click();
  const vatSelectPopover = page.locator(".picker-popover:popover-open");
  await expect(vatSelectPopover).toBeVisible();
  await expect(
    page.locator("dialog.fullscreen-dialog--focus[open]"),
  ).toHaveCount(0);
  await vatSelectPopover
    .getByRole("button", { name: /خاضع لضريبة ١٥٪/ })
    .click();
  await expect(vatSelectPopover).not.toBeVisible();
  await expect(page.getByTestId("invoice-total")).toContainText("115.00");
  await page.locator("#main-content nav button").nth(3).click();
  await page.getByRole("checkbox", { name: /أقر بأنني راجعت/ }).check();
  const saved = page.waitForRequest(
    (request) =>
      request.method() === "POST" && /\/invoices$/.test(request.url()),
  );
  await page.locator('button[type="submit"]').click();
  const payload = (await saved).postDataJSON();
  expect(payload.lines[0].unitPrice).toBe("100");
  expect(payload.documentType).toBe("TAX");
});
test("invoice creation supports 0% VAT without reason and preserves zero VAT total", async ({
  page,
}) => {
  await preferences(page, "ar");
  await login(page);
  await page.goto("/admin/invoices/new?type=TAX");
  await page.locator('input[name="customerName"]').fill("عميل النسبة الصفرية");
  await page.locator('input[type="tel"]').fill("559998877");
  await page.locator("#main-content nav button").nth(1).click();
  await page.getByLabel("عنوان الانطلاق", { exact: false }).fill("جدة");
  await page.getByLabel("عنوان الوصول", { exact: false }).fill("مكة");
  await page.locator("#main-content nav button").nth(2).click();
  await page
    .getByLabel("وصف الخدمة", { exact: false })
    .fill("نقل بري صفر ضريبة");
  await page.getByLabel("السعر (ر.س)", { exact: false }).fill("500");
  await page.getByLabel("المعاملة الضريبية", { exact: false }).click();
  const vatSelectPopover = page.locator(".picker-popover:popover-open");
  await expect(vatSelectPopover).toBeVisible();
  await vatSelectPopover
    .getByRole("button", { name: /نسبة صفرية 0% \(بدون سبب\)/ })
    .click();
  await expect(vatSelectPopover).not.toBeVisible();
  await expect(
    page.getByLabel("رمز الإعفاء الضريبي الرسمي", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("سبب الإعفاء أو النسبة الصفرية بالعربية", { exact: false }),
  ).toHaveCount(0);
  await expect(page.getByTestId("invoice-total")).toContainText("500.00");
  await page.locator("#main-content nav button").nth(3).click();
  await page.getByRole("checkbox", { name: /أقر بأنني راجعت/ }).check();
  const saved = page.waitForRequest(
    (request) =>
      request.method() === "POST" && /\/invoices$/.test(request.url()),
  );
  await page.locator('button[type="submit"]').click();
  const payload = (await saved).postDataJSON();
  expect(payload.lines[0].unitPrice).toBe("500");
  expect(payload.lines[0].category).toBe("Z");
  expect(payload.lines[0].rate).toBe("0");
  expect(payload.lines[0].exemptionCode).toBe("VATEX-SA-32");
});
test("proforma invoice creation catches missing service description before submit and saves via review", async ({
  page,
}) => {
  await preferences(page, "ar");
  await login(page);
  await page.goto("/admin/invoices/new?type=PROFORMA");
  await page.locator('input[name="customerName"]').fill("4brothers");
  await page.locator('input[type="tel"]').fill("0501347193");
  await page.locator("#main-content nav button").nth(1).click();
  await page.getByLabel("عنوان الانطلاق", { exact: false }).fill("مكة");
  await page.getByLabel("عنوان الوصول", { exact: false }).fill("المدينة");
  await page.locator("#main-content nav button").nth(2).click();
  await page.getByLabel("السعر (ر.س)", { exact: false }).fill("200");
  await page.getByLabel("المعاملة الضريبية", { exact: false }).click();
  const vatSelectPopover = page.locator(".picker-popover:popover-open");
  await expect(vatSelectPopover).toBeVisible();
  await vatSelectPopover
    .getByRole("button", { name: /نسبة صفرية 0% \(بدون سبب\)/ })
    .click();
  await expect(vatSelectPopover).not.toBeVisible();

  // Clicking Next without service description catches it in Stage 3 instead of failing later
  await page
    .getByRole("button", { name: /المتابعة: الدفع والمراجعة/ })
    .click();
  await expect(page.locator("#main-content [role='alert']")).toContainText(
    "أدخل وصف الخدمة للبند رقم 1",
  );

  await page
    .getByLabel("وصف الخدمة", { exact: false })
    .fill("نقل ركاب مكة - المدينة");
  await page
    .getByRole("button", { name: /المتابعة: الدفع والمراجعة/ })
    .click();

  await expect(page.getByText("ضريبة القيمة المضافة (0%)")).toBeVisible();
  await expect(page.getByText("نقل ركاب مكة - المدينة")).toBeVisible();
  await page.getByRole("checkbox", { name: /أقر بأنني راجعت/ }).check();
  const saved = page.waitForRequest(
    (request) =>
      request.method() === "POST" && /\/invoices$/.test(request.url()),
  );
  await page.locator('button[type="submit"]').click();
  const payload = (await saved).postDataJSON();
  expect(payload.documentType).toBe("PROFORMA");
  expect(payload.accounting).toBeUndefined();
  expect(payload.lines[0].description).toBe("نقل ركاب مكة - المدينة");
  expect(payload.lines[0].rate).toBe("0");
});
test("admin WhatsApp settings page displays QR code from backend status", async ({
  page,
}) => {
  await preferences(page, "ar");
  await login(page);
  await page.goto("/admin/whatsapp");
  await expect(
    page.getByRole("heading", { name: /ربط الواتساب/ }),
  ).toBeVisible();
  const qrImg = page.getByAltText("رمز QR لربط الواتساب");
  await expect(qrImg).toBeVisible();
  await expect(qrImg).toHaveAttribute("src", /^data:image\/png;base64,/);
});
test("admin WhatsApp flow panel configures +966577842926 and triggers flow steps cleanly", async ({
  page,
}) => {
  await preferences(page, "ar");
  await login(page);
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.goto("/admin/whatsapp");

  const adminPhoneInput = page.locator("#wa-flow-admin-phone");
  await expect(adminPhoneInput).toBeVisible();
  await expect(adminPhoneInput).toHaveValue("+966577842926");
  await expect(page.getByText("MQ-FIXTURE-001").first()).toBeVisible();

  await adminPhoneInput.fill("+966500000001");
  const configUpdate = page.waitForRequest(
    (req) =>
      req.method() === "PUT" && /\/whatsapp\/flow\/config$/.test(req.url()),
  );
  await page
    .getByRole("button", { name: "حفظ إعدادات التدفق والأزرار" })
    .click();
  const updateBody = (await configUpdate).postDataJSON();
  expect(updateBody.adminPhone).toBe("+966500000001");
  await expect(
    page.getByText("تم حفظ إعدادات نظام التدفق والأزرار التفاعلية بنجاح."),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "+966577842926", exact: true })
    .click();
  await expect(adminPhoneInput).toHaveValue("+966577842926");
  const restoreSave = page.waitForResponse(
    (res) =>
      res.request().method() === "PUT" &&
      /\/whatsapp\/flow\/config$/.test(res.url()),
  );
  await page
    .getByRole("button", { name: "حفظ إعدادات التدفق والأزرار" })
    .click();
  await restoreSave;

  const triggerReq = page.waitForRequest(
    (req) =>
      req.method() === "POST" && /\/whatsapp\/flow\/trigger$/.test(req.url()),
  );
  await page
    .getByRole("button", { name: /وصلت لموقع العميل/ })
    .first()
    .click();
  const triggerBody = (await triggerReq).postDataJSON();
  expect(triggerBody.role).toBe("CAPTAIN");
  expect(triggerBody.actionId).toBe("captain_arrived");
  await expect(page.getByText("وصل للموقع", { exact: true }).first()).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
test("admin contract creation supports WhatsApp auto-send and shows confirmation notice", async ({
  page,
}) => {
  await preferences(page, "en");
  await login(page);
  await page.goto("/admin/contracts/new");

  const captainPickerButton = page
    .locator('button[data-search-select="true"]')
    .first();
  await captainPickerButton.click();
  const captainPopover = page.locator(".picker-popover:popover-open");
  await captainPopover.getByRole("button", { name: /Fixture Captain/ }).click();

  await page.getByLabel("Lead guest name").fill("AutoSend Fixture Guest");
  await page
    .locator('input[name="passengers.0.name"]')
    .fill("AutoSend Fixture Passenger");
  await page.getByRole("button", { name: "+ City tour" }).click();

  const autoSendCheckbox = page.getByRole("checkbox", {
    name: /Auto-send contract via WhatsApp on save/,
  });
  await autoSendCheckbox.check();
  await page
    .getByLabel("Recipient WhatsApp phone (optional override)")
    .fill("+966551234567");

  const saved = page.waitForRequest(
    (request) =>
      request.method() === "POST" && /\/contracts$/.test(request.url()),
  );
  await page.locator('form button[type="submit"]').click();
  const payload = (await saved).postDataJSON();
  expect(payload.autoSendWhatsApp).toBe(true);
  expect(payload.whatsAppPhone).toBe("+966551234567");

  const previewDialog = page.getByRole("dialog", { name: "Contract preview" });
  await expect(previewDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(previewDialog).not.toBeVisible();

  await expect(
    page.getByText("Contract auto-sent via WhatsApp to +966551234567"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Admin notification queued for +966577842926. Check the event log for dispatch confirmation.",
    ),
  ).toBeVisible();
});
test("admin invoice creation supports WhatsApp auto-send and shows notice on invoice page", async ({
  page,
}) => {
  await preferences(page, "ar");
  await login(page);
  await page.goto("/admin/invoices/new?type=TAX");

  await page.locator('input[name="customerName"]').fill("عميل الإرسال التلقائي");
  await page.locator('input[type="tel"]').fill("551234567");
  await page.locator("#main-content nav button").nth(1).click();
  await page.getByLabel("عنوان الانطلاق", { exact: false }).fill("مطار جدة");
  await page.getByLabel("عنوان الوصول", { exact: false }).fill("مكة");
  await page.locator("#main-content nav button").nth(2).click();
  await page
    .getByLabel("وصف الخدمة", { exact: false })
    .fill("خدمة نقل مع إرسال تلقائي");
  await page.getByLabel("السعر (ر.س)", { exact: false }).fill("100");
  await page.getByLabel("المعاملة الضريبية", { exact: false }).click();
  const vatSelectPopover = page.locator(".picker-popover:popover-open");
  await vatSelectPopover
    .getByRole("button", { name: /خاضع لضريبة ١٥٪/ })
    .click();
  await page.locator("#main-content nav button").nth(3).click();

  const autoSendCheckbox = page.getByRole("checkbox", {
    name: /إرسال الفاتورة تلقائياً للعميل عبر واتساب فور الإصدار/,
  });
  await autoSendCheckbox.check();
  await page
    .getByLabel("رقم الواتساب المستهدف (هاتف العميل)")
    .fill("+966559998877");

  await page.getByRole("checkbox", { name: /أقر بأنني راجعت/ }).check();
  const saved = page.waitForRequest(
    (request) =>
      request.method() === "POST" && /\/invoices$/.test(request.url()),
  );
  await page.locator('button[type="submit"]').click();
  const payload = (await saved).postDataJSON();
  expect(payload.autoSendWhatsApp).toBe(true);
  expect(payload.whatsAppPhone).toBe("+966559998877");

  await expect(page).toHaveURL(/\/admin\/invoices\/.*waAuto=sent/);
  const statusBanner = page
    .getByRole("status")
    .filter({ hasText: "تم إرسال الفاتورة تلقائياً عبر واتساب" });
  await expect(statusBanner).toContainText(
    "تم إرسال الفاتورة تلقائياً عبر واتساب إلى +966559998877",
  );
  await expect(statusBanner).toContainText("+966577842926");
});
test("expense entry saves supplier details and exact amounts in the isolated backend", async ({
  page,
}) => {
  await preferences(page, "ar");
  await login(page);
  await page.goto("/admin/purchases");
  await page
    .getByRole("button", {
      name: /إضافة مصروف|تسجيل مصروف|فاتورة مورد جديدة|مصروف جديد|تسجيل فاتورة/,
    })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("اسم المورد", { exact: false }).fill("مورد الاختبار");
  await dialog
    .getByLabel("رقم مستند المورد", { exact: false })
    .fill("FIXTURE-EXPENSE");
  await dialog.getByLabel("المبلغ قبل الضريبة", { exact: false }).fill("100");
  const saved = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      /\/accounting\/purchases$/.test(request.url()),
  );
  await dialog.locator('button[type="submit"]').click();
  const payload = (await saved).postDataJSON();
  expect(payload.purchase.supplierName).toBe("مورد الاختبار");
  expect(payload.purchase.netAmount).toBe("100");
});

test("capture representative sections in both languages and themes", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const output = "/tmp/miqat-redesign-review";
  fs.mkdirSync(output, { recursive: true });
  const geometry: unknown[] = [];
  for (const language of ["ar", "en"])
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const loginPage = await context.newPage();
      await preferences(loginPage, language, theme);
      await login(loginPage);
      await loginPage.close();
      for (const [route, name] of [
        ["/admin", "dashboard"],
        ["/admin/fleet", "fleet"],
        ["/admin/contracts/new", "contract"],
        ["/admin/invoices/new", "invoice"],
      ]) {
        for (const width of [390, 768, 1440]) {
          // A fresh page avoids stale fixed-layer rasterization when Chrome changes viewport sizes.
          const page = await context.newPage();
          await page.setViewportSize({ width, height: 1000 });
          await page.goto(route);
          await expect(
            page.locator("#main-content").getByRole("heading").first(),
          ).toBeVisible();
          await page.evaluate(async () => {
            await document.fonts.ready;
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            );
          });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          const metrics = await page.evaluate(() => ({
            headerCount: document.querySelectorAll(".workspace-header").length,
            headers: Array.from(
              document.querySelectorAll(".workspace-header"),
            ).map((element) => {
              const box = element.getBoundingClientRect();
              return {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
              };
            }),
            viewport: { width: innerWidth, height: innerHeight },
            navigation: Array.from(
              document.querySelectorAll(".mobile-bottom-nav"),
            ).map((element) => ({
              display: getComputedStyle(element).display,
              top: element.getBoundingClientRect().top,
            })),
          }));
          expect(metrics.headerCount).toBe(1);
          expect(metrics.headers[0].y).toBe(0);
          expect(metrics.navigation[0].display === "none").toBe(width >= 1024);
          geometry.push({ route, name, language, theme, width, ...metrics });
          await page.screenshot({
            path: `${output}/${name}-${language}-${theme}-${width}.png`,
            animations: "disabled",
            caret: "hide",
          });
          await page.close();
        }
      }
      await context.close();
    }
  fs.writeFileSync(
    `${output}/geometry.json`,
    JSON.stringify(geometry, null, 2),
  );
});

test("a failed logout keeps the current session visible and offers an error", async ({
  page,
}) => {
  await preferences(page);
  await login(page);
  await page.route("**/api/proxy/auth/logout", (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, error: "Fixture sign-out unavailable" },
    }),
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Fixture sign-out unavailable" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeEnabled();
});

test("root redirects anonymous, admin, and captain sessions to the correct workspace", async ({
  page,
}) => {
  await preferences(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/admin$/);
  await page.context().request.post("/api/proxy/auth/logout");
  await login(page, "captain@example.test");
  await page.goto("/");
  await expect(page).toHaveURL(/\/captain$/);
});

test("mobile admin quick-create, More drawer, zero horizontal overflow, and accessibility", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const output = "/tmp/miqat-redesign-review";
  fs.mkdirSync(output, { recursive: true });
  await preferences(page, "en", "light");
  await page.setViewportSize({ width: 390, height: 960 });
  await login(page);

  await page.locator(".mobile-quick-create-btn").click();
  const quickCreate = page.locator("#mobile-quick-create");
  await expect(quickCreate).toBeVisible();
  await expect(
    quickCreate.locator('a[href="/admin/contracts/new"]'),
  ).toBeVisible();
  await expect(
    quickCreate.locator('a[href="/admin/invoices/new"]'),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(quickCreate).not.toBeVisible();

  await page
    .locator(".mobile-bottom-nav")
    .getByRole("button", { name: "More" })
    .click();
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
    await expect(
      page.locator("#main-content").getByRole("heading").first(),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (route === "/admin/contracts") {
      await page.evaluate(() =>
        document
          .querySelector("#contracts-list-heading")
          ?.scrollIntoView({ block: "start" }),
      );
      await page.waitForTimeout(150);
      await page.screenshot({
        path: `${output}/contracts-en-light-390.png`,
        animations: "disabled",
        caret: "hide",
      });
      await page
        .locator('[aria-labelledby="contracts-list-heading"] article')
        .first()
        .screenshot({
          path: `${output}/contract-card-en-light-390.png`,
          animations: "disabled",
        });
      const contractsAxe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        contractsAxe.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      await page
        .locator("article button", { hasText: /Passengers|الركاب/ })
        .first()
        .click();
      const detailsDialog = page.getByRole("dialog");
      await expect(detailsDialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(detailsDialog).not.toBeVisible();
    }
    if (route === "/admin/customers") {
      await page.screenshot({
        path: `${output}/customers-en-light-390.png`,
        animations: "disabled",
        caret: "hide",
      });
    }
    if (route === "/admin/accounting") {
      await page.screenshot({
        path: `${output}/accounting-en-light-390.png`,
        animations: "disabled",
        caret: "hide",
      });
    }
  }

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);

  // Capture Arabic dark mobile contracts cards for RTL/dark visual & accessibility verification
  const rtlContext = await page
    .context()
    .browser()
    ?.newContext({ viewport: { width: 390, height: 960 } });
  if (rtlContext) {
    const rtlPage = await rtlContext.newPage();
    await preferences(rtlPage, "ar", "dark");
    await login(rtlPage);
    await rtlPage.goto("/admin/contracts");
    await expect(rtlPage.locator("#contracts-list-heading")).toBeVisible();
    await rtlPage.evaluate(() => document.fonts.ready);
    expect(
      await rtlPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await rtlPage.evaluate(() =>
      document
        .querySelector("#contracts-list-heading")
        ?.scrollIntoView({ block: "start" }),
    );
    await rtlPage.waitForTimeout(150);
    await rtlPage.screenshot({
      path: `${output}/contracts-ar-dark-390.png`,
      animations: "disabled",
      caret: "hide",
    });
    await rtlPage
      .locator('[aria-labelledby="contracts-list-heading"] article')
      .first()
      .screenshot({
        path: `${output}/contract-card-ar-dark-390.png`,
        animations: "disabled",
      });
    const rtlAxe = await new AxeBuilder({ page: rtlPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      rtlAxe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await rtlContext.close();
  }
});

test("mobile captain field routes keep zero horizontal overflow and clean accessibility", async ({
  page,
}) => {
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
    await expect(
      page.locator("#main-content").getByRole("heading").first(),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (shot === "captain-ar-dark-390.png") {
      await page.evaluate(() =>
        document
          .querySelector("#main-content article")
          ?.scrollIntoView({ block: "center" }),
      );
      await page.waitForTimeout(150);
    }
    if (route === "/captain/inspection") {
      const submitBar = page.locator(".contract-submit-bar");
      if ((await submitBar.count()) > 0) {
        expect(
          await submitBar.evaluate((el) => getComputedStyle(el).position),
        ).toBe("static");
      }
    }
    await page.screenshot({
      path: `${output}/${shot}`,
      animations: "disabled",
      caret: "hide",
    });
  }

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);

  // Capture Arabic dark mobile contracts cards for RTL/dark visual & accessibility verification
  const rtlContext = await page
    .context()
    .browser()
    ?.newContext({ viewport: { width: 390, height: 960 } });
  if (rtlContext) {
    const rtlPage = await rtlContext.newPage();
    await preferences(rtlPage, "ar", "dark");
    await login(rtlPage);
    await rtlPage.goto("/admin/contracts");
    await expect(rtlPage.locator("#contracts-list-heading")).toBeVisible();
    await rtlPage.evaluate(() => document.fonts.ready);
    expect(
      await rtlPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await rtlPage.evaluate(() =>
      document
        .querySelector("#contracts-list-heading")
        ?.scrollIntoView({ block: "start" }),
    );
    await rtlPage.waitForTimeout(150);
    await rtlPage.screenshot({
      path: `${output}/contracts-ar-dark-390.png`,
      animations: "disabled",
      caret: "hide",
    });
    await rtlPage
      .locator('[aria-labelledby="contracts-list-heading"] article')
      .first()
      .screenshot({
        path: `${output}/contract-card-ar-dark-390.png`,
        animations: "disabled",
      });
    const rtlAxe = await new AxeBuilder({ page: rtlPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      rtlAxe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await rtlContext.close();
  }
});

test("contract review page exposes pricing and commissions as optional checkbox sections", async ({
  page,
}) => {
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

  const pricingToggle = page.getByRole("checkbox", {
    name: /^Trip pricing and VAT/,
  });
  const commissionsToggle = page.getByRole("checkbox", {
    name: /^Commissions/,
  });
  await expect(pricingToggle).toBeChecked();
  await expect(commissionsToggle).not.toBeChecked();

  const amountInput = page.getByLabel(
    "Service price after discount, excluding VAT",
  );
  await expect(amountInput).toHaveValue("100.00");

  // Uncheck pricing and verify inputs collapse cleanly
  await pricingToggle.uncheck();
  await expect(amountInput).toHaveCount(0);

  // Check commissions, enable Driver commission, and enter a fixed commission
  await commissionsToggle.check();
  const driverToggle = page.getByRole("checkbox", {
    name: /^Driver commission/,
  });
  await expect(driverToggle).not.toBeChecked();
  await driverToggle.check();
  const commissionAmountInput = page.getByLabel("Commission amount");
  await commissionAmountInput.fill("75");

  await page.evaluate(() => {
    document
      .querySelector('form button[type="submit"]')
      ?.scrollIntoView({ block: "end" });
  });
  await page.waitForTimeout(150);
  await page.screenshot({
    path: `${output}/contract-detail-en-light-1440.png`,
    animations: "disabled",
    caret: "hide",
  });

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const desktopAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    desktopAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);

  const savedPut = page.waitForRequest(
    (req) =>
      req.method() === "PUT" &&
      req.url().includes(`/workforce/contracts/${ID}`),
  );
  await page
    .getByRole("button", { name: "Save customer and entitlements" })
    .click();
  const sentPayload = (await savedPut).postDataJSON() as {
    commercial: {
      netAmount: string;
      taxCategory: string;
      driverCommission: { mode: string; amount: string };
    };
  };
  expect(sentPayload.commercial.netAmount).toBe("0");
  expect(sentPayload.commercial.taxCategory).toBe("S");
  expect(sentPayload.commercial.driverCommission.mode).toBe("FIXED");
  expect(sentPayload.commercial.driverCommission.amount).toBe("75");

  // Mobile AR dark view with unconfigured commercial data (both checkboxes start unchecked)
  const mobileCtx = await page
    .context()
    .browser()
    ?.newContext({ viewport: { width: 390, height: 960 } });
  if (mobileCtx) {
    const mobilePage = await mobileCtx.newPage();
    await preferences(mobilePage, "ar", "dark");
    await login(mobilePage);
    await mobilePage.route(
      `**/api/proxy/workforce/contracts/${ID}`,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({ json: { success: true, data: null } });
          return;
        }
        await route.continue();
      },
    );
    await mobilePage.goto(`/admin/contracts/${ID}`);

    const arPricingToggle = mobilePage.getByRole("checkbox", {
      name: /^تسعير الرحلة والضريبة/,
    });
    const arCommissionsToggle = mobilePage.getByRole("checkbox", {
      name: /^العمولات/,
    });
    await expect(arPricingToggle).not.toBeChecked();
    await expect(arCommissionsToggle).not.toBeChecked();

    await arPricingToggle.scrollIntoViewIfNeeded();
    await mobilePage.waitForTimeout(150);
    await mobilePage.screenshot({
      path: `${output}/contract-detail-ar-dark-390.png`,
      animations: "disabled",
      caret: "hide",
    });

    // Opt into both on mobile and verify zero overflow + Axe WCAG 2.1 AA
    await arPricingToggle.check();
    await mobilePage
      .getByLabel("قيمة الخدمة بعد الخصم وقبل الضريبة")
      .fill("250");
    await arCommissionsToggle.check();
    await mobilePage.getByRole("checkbox", { name: /^عمولة السائق/ }).check();
    await mobilePage.getByLabel("مبلغ العمولة").fill("40");
    await mobilePage.waitForTimeout(150);
    await mobilePage.screenshot({
      path: `${output}/contract-detail-checked-ar-dark-390.png`,
      animations: "disabled",
      caret: "hide",
    });

    expect(
      await mobilePage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const mobileAxe = await new AxeBuilder({ page: mobilePage })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      mobileAxe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await mobileCtx.close();
  }
});

test("rebuilt staff directory and statement tables render cleanly across breakpoints, themes, and languages", async ({
  page,
}) => {
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
    await route.fulfill({
      json: { success: true, data: { items: fixtureMembers } },
    });
  });
  await page.route(`**/api/proxy/workforce/members/${ID}`, async (route) => {
    await route.fulfill({ json: { success: true, data: fixtureStatement } });
  });
  await page.route(
    "**/api/proxy/workforce/payroll/*/approve",
    async (route) => {
      await route.fulfill({
        status: 409,
        json: { success: false, error: "Payroll period locked in fixture" },
      });
    },
  );

  // 1) English / Light Desktop Directory + Statement Verification
  await preferences(page, "en", "light");
  await page.setViewportSize({ width: 1440, height: 960 });
  await login(page);
  await page.goto("/admin/staff");
  await expect(
    page.getByRole("heading", { name: "Accounts directory" }),
  ).toBeVisible();
  const dirTable = page.getByRole("region", { name: "Accounts directory" });
  await expect(
    dirTable.getByText("SA03 8000 0000 6080 1016 7519"),
  ).toBeVisible();
  await expect(dirTable.getByText("310123456700003")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await dirTable.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: `${output}/staff-list-en-light-1440.png`,
    animations: "disabled",
    caret: "hide",
  });

  // Filter persistence via URL params & reset
  await page.getByRole("button", { name: /Drivers/ }).click();
  await expect(page).toHaveURL(/kind=DRIVER/);
  await page.getByRole("searchbox").fill("SA038000");
  await expect(page).toHaveURL(/q=SA038000/);
  await expect(dirTable.locator("tbody th[scope='row']")).toHaveCount(1);
  await page.getByRole("button", { name: /Clear Filters/ }).click();
  await expect(dirTable.locator("tbody th[scope='row']")).toHaveCount(3);

  const staffListEnAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    staffListEnAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);

  // Tablet breakpoint (768px) renders mobile record cards cleanly without crammed 6-col table
  await page.setViewportSize({ width: 768, height: 960 });
  await expect(page.locator("article").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${output}/staff-list-en-light-768.png`,
    animations: "disabled",
    caret: "hide",
  });

  // Statement detail page on desktop (EN Light 1440)
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`/admin/staff/${ID}`);
  await expect(
    page.getByRole("heading", { name: "Transactions and operations ledger" }),
  ).toBeVisible();
  const opsTable = page.getByRole("region", {
    name: "Transactions and operations ledger",
  });
  await expect(opsTable.getByText("Reversed", { exact: true })).toBeVisible();
  // Combined custody & advance delta both appear on row op-2
  const op2Row = opsTable
    .locator("tbody tr")
    .filter({ hasText: "صرف عهدة تشغيلية لرحلة مكة" });
  await expect(op2Row).toContainText("+500.00");
  await expect(op2Row).toContainText("-100.00");
  await expect(opsTable.locator("tfoot")).toContainText(
    "Filtered ledger summary (5)",
  );
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await opsTable.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: `${output}/staff-detail-ops-en-light-1440.png`,
    animations: "disabled",
    caret: "hide",
  });

  const opsEnAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    opsEnAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);

  // Switch to Payroll tab -> trigger approve error & confirm visible alert banner
  await page.getByRole("tab", { name: /Payroll and salaries/ }).click();
  await expect(
    page.getByRole("heading", { name: "Monthly payroll drafts" }),
  ).toBeVisible();
  const payrollTable = page.getByRole("region", {
    name: "Monthly payroll drafts",
  });
  await payrollTable
    .getByRole("button", { name: "Approve accrual 2026-11" })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Payroll period locked in fixture" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${output}/staff-detail-payroll-en-light-1440.png`,
    animations: "disabled",
    caret: "hide",
  });

  // Keyboard arrow navigation to Commissions tab -> check footer totals & tripDate
  const payrollTab = page.getByRole("tab", { name: /Payroll and salaries/ });
  await payrollTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("heading", { name: "Trip commissions" }),
  ).toBeVisible();
  const commTable = page.getByRole("region", { name: "Trip commissions" });
  await expect(commTable.locator("tfoot")).toContainText("750.50 SAR");
  expect(
    await commTable.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await expect(
    page
      .locator('[data-slot="card-footer"]')
      .filter({ hasText: "Total commissions" }),
  ).toBeHidden();
  await page.screenshot({
    path: `${output}/staff-detail-commissions-en-light-1440.png`,
    animations: "disabled",
    caret: "hide",
  });

  // 2) Arabic RTL / Dark context across 1440 Desktop & 390 Mobile
  const arCtx = await page
    .context()
    .browser()
    ?.newContext({ viewport: { width: 1440, height: 960 } });
  if (arCtx) {
    const arPage = await arCtx.newPage();
    await arPage.route("**/api/proxy/workforce/members?*", async (route) => {
      await route.fulfill({
        json: { success: true, data: { items: fixtureMembers } },
      });
    });
    await arPage.route(
      `**/api/proxy/workforce/members/${ID}`,
      async (route) => {
        await route.fulfill({
          json: { success: true, data: fixtureStatement },
        });
      },
    );

    await preferences(arPage, "ar", "dark");
    await login(arPage);
    await arPage.goto("/admin/staff");
    await expect(
      arPage.getByRole("heading", { name: "سجل الحسابات" }),
    ).toBeVisible();
    const arDirTable = arPage.getByRole("region", { name: "سجل الحسابات" });
    await arPage.evaluate(() => document.fonts.ready);
    expect(
      await arPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await arDirTable.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await arPage.screenshot({
      path: `${output}/staff-list-ar-dark-1440.png`,
      animations: "disabled",
      caret: "hide",
    });

    // Mobile 390px AR dark directory cards + statement operations cards
    await arPage.setViewportSize({ width: 390, height: 960 });
    await expect(arPage.locator("article").first()).toBeVisible();
    expect(
      await arPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await arPage.screenshot({
      path: `${output}/staff-list-ar-dark-390.png`,
      animations: "disabled",
      caret: "hide",
    });
    const staffMobAxe = await new AxeBuilder({ page: arPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      staffMobAxe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);

    await arPage.goto(`/admin/staff/${ID}`);
    await expect(
      arPage.getByRole("heading", { name: "كشف العمليات والحركات" }),
    ).toBeVisible();
    await arPage.evaluate(() => document.fonts.ready);
    expect(
      await arPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await arPage.screenshot({
      path: `${output}/staff-detail-ops-ar-dark-390.png`,
      animations: "disabled",
      caret: "hide",
    });
    const mobOpCard = arPage
      .locator("article")
      .filter({ hasText: "صرف عهدة تشغيلية لرحلة مكة" });
    await mobOpCard.scrollIntoViewIfNeeded();
    await expect(mobOpCard).toBeVisible();
    await arPage.screenshot({
      path: `${output}/staff-detail-ops-cards-ar-dark-390.png`,
      animations: "disabled",
      caret: "hide",
    });
    const opsMobAxe = await new AxeBuilder({ page: arPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      opsMobAxe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);

    await arCtx.close();
  }
});

test("mobile-only full-screen field/selector/picker popups and desktop inline/anchored dropdowns", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const output = "/tmp/miqat-redesign-review";
  fs.mkdirSync(output, { recursive: true });

  const anyFullscreenDialog = page.locator("dialog.fullscreen-dialog[open]");
  const workspaceDialog = page.locator(
    "dialog.fullscreen-dialog--workspace[open]",
  );
  const focusDialog = page.locator("dialog.fullscreen-dialog--focus[open]");
  const activePopover = page.locator(".picker-popover:popover-open");
  const bannedFullscreenButtons = page.getByRole("button", {
    name: /وضع ملء الشاشة|إنشاء بملء الشاشة|تحرير البنود بملء الشاشة|توسيع الكشف|إنهاء ملء الشاشة|Full-screen popup|Full-screen services|Full-screen list|Exit full-screen|Standard view|تصغير للصفحة/i,
  });

  const waitSettled = async (locator: Locator) => {
    await expect(locator).toBeVisible();
    await locator.evaluate(async (el) => {
      await Promise.all(
        el.getAnimations().map((animation) => animation.finished.catch(() => {})),
      );
    });
    await expect(locator).toHaveCSS("opacity", "1");
  };

  // 1) Desktop (>= 768px): never opens fullscreen workspace or focus popups; uses inline inputs + anchored popovers
  await preferences(page, "ar", "dark");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);

  for (const listRoute of ["/admin/contracts", "/admin/invoices"]) {
    await page.goto(listRoute);
    await expect(
      page.locator("#main-content").getByRole("heading").first(),
    ).toBeVisible();
    await expect(anyFullscreenDialog).toHaveCount(0);
    await expect(bannedFullscreenButtons).toHaveCount(0);
  }

  await page.goto("/admin/contracts/new");
  const guestInput = page.locator('input[name="customerName"]');
  await expect(guestInput).toBeVisible();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(workspaceDialog).toHaveCount(0);
  await expect(bannedFullscreenButtons).toHaveCount(0);

  const inlineFontSize = await guestInput.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  expect(inlineFontSize).toBeGreaterThanOrEqual(12);
  expect(inlineFontSize).toBeLessThan(16);

  await guestInput.click();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(guestInput).toBeFocused();
  await guestInput.fill("ضيف الحجز على سطح المكتب");
  await expect(guestInput).toHaveValue("ضيف الحجز على سطح المكتب");

  const captainTrigger = page
    .locator('button[data-search-select="true"]')
    .first();
  await captainTrigger.click();
  await waitSettled(activePopover);
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(activePopover.getByRole("searchbox")).toBeFocused();
  const captainPopoverBox = await activePopover.boundingBox();
  expect(captainPopoverBox).not.toBeNull();
  if (captainPopoverBox) {
    expect(captainPopoverBox.width).toBeGreaterThanOrEqual(260);
    expect(captainPopoverBox.width).toBeLessThan(700);
    expect(captainPopoverBox.x).toBeGreaterThanOrEqual(0);
    expect(captainPopoverBox.x + captainPopoverBox.width).toBeLessThanOrEqual(
      1440,
    );
    expect(captainPopoverBox.y + captainPopoverBox.height).toBeLessThanOrEqual(
      1000,
    );
  }
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${output}/desktop-captain-popover-ar-dark-1440.png`,
    animations: "disabled",
    caret: "hide",
  });

  const desktopSelectAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    desktopSelectAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(activePopover).toHaveCount(0);
  await expect(anyFullscreenDialog).toHaveCount(0);

  await captainTrigger.click();
  await expect(activePopover).toBeVisible();
  await activePopover.getByRole("button", { name: /Fixture Captain/ }).click();
  await expect(activePopover).toHaveCount(0);
  await expect(captainTrigger).toContainText(/Fixture Captain/);

  // Desktop DatePicker & TimePicker open anchored popovers instead of full-screen modals
  await page.getByRole("button", { name: /تاريخ الرحلة/ }).click();
  await waitSettled(activePopover);
  await expect(anyFullscreenDialog).toHaveCount(0);
  const datePopoverBox = await activePopover.boundingBox();
  expect(datePopoverBox?.width ?? 999).toBeLessThan(420);
  await page.screenshot({
    path: `${output}/desktop-date-popover-ar-dark-1440.png`,
    animations: "disabled",
    caret: "hide",
  });
  await page.keyboard.press("Escape");
  await expect(activePopover).toHaveCount(0);

  await page.getByRole("button", { name: /وقت الرحلة/ }).click();
  await expect(activePopover).toBeVisible();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(
    activePopover.getByRole("button", { name: "الآن" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(activePopover).toHaveCount(0);

  // 2) Mobile (< 768px): text inputs edit directly inline without opening full-screen popups; selectors and date/time pickers open full-screen focus dialogs
  await page.setViewportSize({ width: 390, height: 960 });
  await expect(anyFullscreenDialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".workspace-header")).toBeVisible();
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();

  await guestInput.click();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(guestInput).toBeFocused();
  await expect(page.locator(".workspace-header")).toBeHidden();
  await expect(page.locator(".mobile-bottom-nav")).toBeHidden();
  const mobileInputFontSize = await guestInput.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  expect(mobileInputFontSize).toBeGreaterThanOrEqual(16);

  await guestInput.fill("ضيف الجوال بملء الشاشة");
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(guestInput).toHaveValue("ضيف الجوال بملء الشاشة");
  await guestInput.blur();
  await expect(page.locator(".workspace-header")).toBeVisible();
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();

  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${output}/mobile-fullscreen-field-popup-ar-dark-390.png`,
    animations: "disabled",
    caret: "hide",
  });

  const mobileFieldAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    mobileFieldAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);

  await captainTrigger.click();
  await waitSettled(focusDialog);
  await expect(activePopover).toHaveCount(0);
  await expect(focusDialog.locator("header")).toHaveCount(0);
  await expect(focusDialog.getByRole("heading")).toHaveCount(0);
  await expect(focusDialog.getByRole("searchbox")).toBeFocused();
  await expect(focusDialog.getByRole("searchbox")).toHaveAttribute(
    "placeholder",
    "الكابتن المسؤول عن التنفيذ",
  );
  const mobileOptionFontSize = await focusDialog
    .locator(".fullscreen-select-option")
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(mobileOptionFontSize).toBeGreaterThanOrEqual(16);

  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${output}/mobile-fullscreen-captain-select-ar-dark-390.png`,
    animations: "disabled",
    caret: "hide",
  });

  const mobileSelectAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    mobileSelectAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);

  await focusDialog.getByRole("button", { name: /Fixture Captain/ }).click();
  await expect(focusDialog).not.toBeVisible();
  await expect(anyFullscreenDialog).toHaveCount(0);

  await page.getByRole("button", { name: /تاريخ الرحلة/ }).click();
  await expect(focusDialog).toBeVisible();
  await expect(focusDialog.locator("header")).toHaveCount(0);
  await expect(activePopover).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(focusDialog).not.toBeVisible();

  await page.getByRole("button", { name: /وقت الرحلة/ }).click();
  await expect(focusDialog).toBeVisible();
  await expect(focusDialog.locator("header")).toHaveCount(0);
  await expect(activePopover).toHaveCount(0);
  await focusDialog.getByRole("button", { name: "الآن" }).click();
  await expect(focusDialog).not.toBeVisible();
  await expect(anyFullscreenDialog).toHaveCount(0);

  // Primary passenger name auto-syncs from lead guest name on mobile contract creation
  await expect(page.locator('input[name="passengers.0.name"]')).toHaveValue(
    "ضيف الجوال بملء الشاشة",
  );

  // 3) Admin invoice: desktop (1440px & 768px) inline + popover vs mobile (390px) full-screen inputs, selects & date/time pickers
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/invoices/new?type=TAX");
  const invoiceCustomerInput = page.locator('input[name="customerName"]');
  await expect(invoiceCustomerInput).toBeVisible();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(bannedFullscreenButtons).toHaveCount(0);
  await invoiceCustomerInput.click();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await invoiceCustomerInput.fill("شركة القمة للنقل");
  await expect(invoiceCustomerInput).toHaveValue("شركة القمة للنقل");

  // Stage 2 trip date & time use CustomDatePicker & CustomTimePicker (popover on desktop)
  await page.locator("#main-content nav button").nth(1).click();
  await page.getByRole("button", { name: /تاريخ الذهاب/ }).click();
  await expect(activePopover).toBeVisible();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(activePopover).toHaveCount(0);

  // Stage 3 VAT select opens compact anchored popover on desktop 1440px and 768px
  await page.locator("#main-content nav button").nth(2).click();
  await expect(bannedFullscreenButtons).toHaveCount(0);
  const vatTrigger = page.getByLabel("المعاملة الضريبية", { exact: false });
  await vatTrigger.click();
  await waitSettled(activePopover);
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(
    activePopover.locator(".fullscreen-select-option").first(),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${output}/desktop-invoice-vat-popover-ar-dark-1440.png`,
    animations: "disabled",
    caret: "hide",
  });
  await page.keyboard.press("Escape");
  await expect(activePopover).toHaveCount(0);

  // Tablet boundary (768px) stays desktop mode (no auto full-screen modal) and keeps zero horizontal overflow
  await page.setViewportSize({ width: 768, height: 960 });
  await expect(anyFullscreenDialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await vatTrigger.click();
  await waitSettled(activePopover);
  await expect(anyFullscreenDialog).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(activePopover).toHaveCount(0);

  // Mobile (< 768px at 390px) switches VAT select, trip date/time pickers, and invoice inputs to full-screen focus dialogs
  await page.setViewportSize({ width: 390, height: 960 });
  await expect(anyFullscreenDialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await vatTrigger.click();
  await waitSettled(focusDialog);
  await expect(activePopover).toHaveCount(0);
  await expect(
    focusDialog.locator(".fullscreen-select-option").first(),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${output}/mobile-fullscreen-invoice-select-ar-dark-390.png`,
    animations: "disabled",
    caret: "hide",
  });
  await page.keyboard.press("Escape");
  await expect(focusDialog).not.toBeVisible();

  await page.locator("#main-content nav button").nth(1).click();
  await page.getByRole("button", { name: /تاريخ الذهاب/ }).click();
  await expect(focusDialog).toBeVisible();
  await expect(activePopover).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(focusDialog).not.toBeVisible();

  await page.getByRole("button", { name: /وقت الذهاب/ }).click();
  await expect(focusDialog).toBeVisible();
  await expect(activePopover).toHaveCount(0);
  await focusDialog.getByRole("button", { name: "الآن" }).click();
  await expect(focusDialog).not.toBeVisible();

  await page.locator("#main-content nav button").nth(0).click();
  await invoiceCustomerInput.click();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(page.locator(".workspace-header")).toBeHidden();
  await expect(page.locator(".mobile-bottom-nav")).toBeHidden();
  await invoiceCustomerInput.fill("شركة القمة للجوال");
  await expect(invoiceCustomerInput).toHaveValue("شركة القمة للجوال");
  await invoiceCustomerInput.blur();
  await expect(page.locator(".workspace-header")).toBeVisible();
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
  await expect(anyFullscreenDialog).toHaveCount(0);

  // 4) Captain contract EN LTR: desktop inline/popover and mobile inline inputs + full-screen selector/pickers
  await page.context().request.post("/api/proxy/auth/logout");
  await preferences(page, "en", "light");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, "captain@example.test");

  await page.goto("/captain");
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(bannedFullscreenButtons).toHaveCount(0);

  await page.goto("/captain/contract");
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(bannedFullscreenButtons).toHaveCount(0);

  const captainOpSelect = page.locator('button[name="operationType"]');
  await captainOpSelect.click();
  await expect(activePopover).toBeVisible();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await activePopover.getByRole("button", { name: /Intercity/ }).click();
  await expect(activePopover).toHaveCount(0);
  await expect(captainOpSelect).toHaveAttribute("data-value", "INTERCITY");

  await page.getByRole("button", { name: /Trip date/ }).click();
  await expect(activePopover).toBeVisible();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(activePopover).toHaveCount(0);

  const captainGuest = page.locator('input[name="customerName"]');
  await captainGuest.click();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await captainGuest.fill("Captain Desktop Guest");
  await expect(captainGuest).toHaveValue("Captain Desktop Guest");
  await captainGuest.blur();

  await page.setViewportSize({ width: 390, height: 960 });
  await expect(anyFullscreenDialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".workspace-header")).toBeVisible();
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();

  await captainGuest.click();
  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(page.locator(".workspace-header")).toBeHidden();
  await expect(page.locator(".mobile-bottom-nav")).toBeHidden();
  await captainGuest.fill("Captain Mobile Guest");
  await captainGuest.blur();
  await expect(page.locator(".workspace-header")).toBeVisible();
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
  await expect(captainGuest).toHaveValue("Captain Mobile Guest");

  await page.getByRole("button", { name: /Trip date/ }).click();
  await expect(focusDialog).toBeVisible();
  await expect(activePopover).toHaveCount(0);
  await focusDialog.getByRole("button", { name: "Today" }).click();
  await expect(focusDialog).not.toBeVisible();

  await page.getByRole("button", { name: /Trip time/ }).click();
  await expect(focusDialog).toBeVisible();
  await expect(activePopover).toHaveCount(0);
  await focusDialog.getByRole("button", { name: "Now" }).click();
  await expect(focusDialog).not.toBeVisible();

  await expect(anyFullscreenDialog).toHaveCount(0);
  await expect(captainGuest).toHaveValue("Captain Mobile Guest");
  await expect(captainOpSelect).toHaveAttribute("data-value", "INTERCITY");
});

test("Super Admin creates and updates scoped Finance Admin permissions via presets and checkboxes", async ({
  page,
}) => {
  await preferences(page, "en", "light");
  await login(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/admins");

  // Wait for seeded admins table to load (Finance Accountant row + Super Admin row)
  await expect(page.getByText("Finance Accountant").first()).toBeVisible();

  // Edit existing Finance Accountant permissions via modal and verify PUT payload
  await page
    .getByRole("button", { name: /Edit permissions — Finance Accountant/ })
    .first()
    .click();
  const editDialog = page.getByRole("dialog");
  await expect(editDialog).toBeVisible();

  // Uncheck ZATCA view and check Contracts view, verify PUT payload
  await editDialog.locator('[data-perm="contracts:view"] input[type="checkbox"]').check();
  const putReq = page.waitForRequest(
    (req) =>
      req.method() === "PUT" &&
      /\/admins\/admin-finance-fixture\/permissions$/.test(req.url()),
  );
  await editDialog.getByRole("button", { name: /Save Permissions/ }).click();
  const putBody = (await putReq).postDataJSON();
  expect(putBody.permissions?.contracts?.view).toBe(true);
  expect(putBody.permissions?.invoices?.write).toBe(true);
  await expect(editDialog).toHaveCount(0);

  // Restore Finance preset cleanly
  await page
    .getByRole("button", { name: /Edit permissions — Finance Accountant/ })
    .first()
    .click();
  const restoreDialog = page.getByRole("dialog");
  await restoreDialog.locator('button[data-preset="finance_accounts"]').click();
  const restorePut = page.waitForResponse(
    (res) =>
      res.request().method() === "PUT" &&
      /\/admins\/admin-finance-fixture\/permissions$/.test(res.url()),
  );
  await restoreDialog.getByRole("button", { name: /Save Permissions/ }).click();
  await restorePut;
  await expect(restoreDialog).toHaveCount(0);

  // Create a brand new scoped Admin using Accounting & Invoices preset + POST payload check
  await page.getByRole("button", { name: "Add administrator" }).click();
  const createDialog = page.getByRole("dialog");
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[autocomplete="name"]').fill("Accounts Clerk");
  await createDialog.locator('input[autocomplete="email"]').fill("clerk@example.test");
  await createDialog.locator('button[data-preset="finance_accounts"]').click();

  // Explicitly ensure Contracts stays unchecked and ZATCA is checked
  await expect(
    createDialog.locator('[data-perm="contracts:view"] input[type="checkbox"]'),
  ).not.toBeChecked();
  await expect(
    createDialog.locator('[data-perm="invoices:write"] input[type="checkbox"]'),
  ).toBeChecked();

  const createReq = page.waitForRequest(
    (req) => req.method() === "POST" && /\/admins$/.test(req.url()),
  );
  await createDialog.locator('button[type="submit"]').click();
  const createBody = (await createReq).postDataJSON();
  expect(createBody.email).toBe("clerk@example.test");
  expect(createBody.permissions?.invoices?.write).toBe(true);
  expect(createBody.permissions?.accounting?.approve).toBe(true);
  expect(createBody.permissions?.contracts).toBeUndefined();
});

test("Scoped Finance Admin lands on Finance workspace, sees filtered navigation, and gets restricted alert on unauthorized routes", async ({
  page,
}) => {
  await preferences(page, "en", "light");
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto("/login");
  await page.locator("#email").fill("finance@example.test");
  await page.locator("#password").fill("fixture-password");
  await page.locator('button[type="submit"]').click();

  // Finance-only admin automatically lands on /admin/invoices instead of /admin
  await expect(page).toHaveURL(/\/admin\/invoices$/);
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await expect(
    page.locator("#main-content").getByRole("heading").first(),
  ).toBeVisible();

  // Navigation shows permitted finance items and hides restricted operational/admin items
  const desktopNav = page.locator("aside").getByRole("navigation");
  await expect(desktopNav.locator('a[href="/admin/invoices"]')).toBeVisible();
  await expect(desktopNav.locator('a[href="/admin/accounting"]')).toBeVisible();
  await expect(desktopNav.locator('a[href="/admin/contracts"]')).toHaveCount(0);
  await expect(desktopNav.locator('a[href="/admin/whatsapp"]')).toHaveCount(0);
  await expect(desktopNav.locator('a[href="/admin/admins"]')).toHaveCount(0);

  // Direct URL visit to unauthorized section displays localized Access Restricted alert
  await page.goto("/admin/contracts");
  const alertBox = page.locator('#main-content [role="alert"]');
  await expect(alertBox).toBeVisible();
  await expect(
    alertBox.getByRole("heading", { name: "Access restricted for this account" }),
  ).toBeVisible();
  const returnLink = alertBox.getByRole("link", { name: "Go to available workspace" });
  await expect(returnLink).toHaveAttribute("href", "/admin/invoices");
  await returnLink.click();
  await expect(page).toHaveURL(/\/admin\/invoices$/);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("dashboard uses single main scroll container, keyboard scrolling, sidebar scroll, and route scroll reset", async ({
  page,
}) => {
  await preferences(page, "ar", "light");
  await login(page);

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/admin");
    await expect(
      page.locator("#main-content").getByRole("heading").first(),
    ).toBeVisible();

    const layoutMetrics = await page.evaluate(() => {
      const main = document.querySelector("#main-content");
      return {
        htmlSH: document.documentElement.scrollHeight,
        innerH: window.innerHeight,
        htmlSW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        mainSH: main?.scrollHeight ?? 0,
        mainCH: main?.clientHeight ?? 0,
        mainPos: main ? getComputedStyle(main).position : "",
      };
    });
    expect(layoutMetrics.htmlSH).toBe(layoutMetrics.innerH);
    expect(layoutMetrics.htmlSW).toBeLessThanOrEqual(layoutMetrics.innerW);
    expect(layoutMetrics.mainSH).toBeGreaterThan(layoutMetrics.mainCH);
    expect(layoutMetrics.mainPos).toBe("relative");

    await page.keyboard.press("PageDown");
    await expect
      .poll(() =>
        page.evaluate(() => ({
          winY: window.scrollY,
          mainTop: document.querySelector("#main-content")?.scrollTop ?? 0,
          headerTop: Math.round(
            document.querySelector(".workspace-header")?.getBoundingClientRect().top ?? -1,
          ),
        })),
      )
      .toEqual(
        expect.objectContaining({
          winY: 0,
          headerTop: 0,
        }),
      );
    const afterPageDown = await page.evaluate(
      () => document.querySelector("#main-content")?.scrollTop ?? 0,
    );
    expect(afterPageDown).toBeGreaterThan(150);

    await page.keyboard.press("End");
    const afterEnd = await page.evaluate(
      () => document.querySelector("#main-content")?.scrollTop ?? 0,
    );
    expect(afterEnd).toBeGreaterThan(afterPageDown);

    await page.keyboard.press("Home");
    await expect
      .poll(() =>
        page.evaluate(
          () => document.querySelector("#main-content")?.scrollTop ?? -1,
        ),
      )
      .toBe(0);
  }

  // Verify independent sidebar navigation scrolling and route navigation scroll reset on short desktop
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/admin");
  await expect(
    page.locator("#main-content").getByRole("heading").first(),
  ).toBeVisible();

  const sidebarBox = await page.locator(".workspace-sidebar").boundingBox();
  expect(sidebarBox).not.toBeNull();
  if (sidebarBox) {
    await page.mouse.move(
      sidebarBox.x + sidebarBox.width / 2,
      sidebarBox.y + sidebarBox.height / 2,
    );
    await page.mouse.wheel(0, 220);
    await expect
      .poll(() =>
        page.evaluate(() => ({
          sidebarTop: document.querySelector(".sidebar-navigation")?.scrollTop ?? 0,
          mainTop: document.querySelector("#main-content")?.scrollTop ?? -1,
        })),
      )
      .toEqual(
        expect.objectContaining({
          mainTop: 0,
        }),
      );
    const sidebarTop = await page.evaluate(
      () => document.querySelector(".sidebar-navigation")?.scrollTop ?? 0,
    );
    expect(sidebarTop).toBeGreaterThan(0);
  }

  await page.evaluate(() => {
    document.querySelector("#main-content")?.scrollTo({ top: 500, behavior: "auto" });
  });
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("#main-content")?.scrollTop ?? 0),
    )
    .toBeGreaterThan(400);

  await page.locator('aside a[href="/admin/whatsapp"]').click();
  await expect(page).toHaveURL(/\/admin\/whatsapp$/);
  await expect(
    page.locator("#main-content").getByRole("heading").first(),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        mainTop: document.querySelector("#main-content")?.scrollTop ?? -1,
        winY: window.scrollY,
      })),
    )
    .toEqual({ mainTop: 0, winY: 0 });
});
