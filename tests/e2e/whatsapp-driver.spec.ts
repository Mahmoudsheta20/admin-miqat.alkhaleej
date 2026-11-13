import { test, expect, type Page } from "@playwright/test";
const ID = "11111111-1111-4111-8111-111111111111";
const baseTrip = {
  contractId: ID, tripId: ID, driverName: "سائق الاختبار", contract: { referenceNumber: "MQ-DRIVER-001", origin: "جدة", destination: "مكة" },
  status: "ASSIGNED", scheduledAt: "2026-11-13T10:00:00Z", updatedAt: "2026-11-13T09:00:00Z",
  arrivedAt: null, completedAt: null, lateAlerted: false, pollDispatch: "PENDING", masterDispatch: "PENDING",
};
async function open(page: Page, lang = "en", connected = true) {
  await page.route("**/api/proxy/whatsapp/status", route => route.fulfill({ json: { success: true, data: {
    status: connected ? "connected" : "disconnected", qrImage: null,
    driverWorkflow: { enabled: true, managementTarget: "120363000123456@g.us" },
  } } }));
  await page.context().addCookies([{ name: "miqat_language", value: lang, url: "http://127.0.0.1:3419" }]);
  await page.addInitScript(() => {
    const language = document.cookie.split("; ").find(c => c.startsWith("miqat_language="))?.split("=")[1];
    localStorage.setItem("miqat_language", language || "en");
    localStorage.setItem("miqat_theme", "light");
  });
  await page.goto("/login");
  await page.locator("#email").fill("admin@example.test");
  await page.locator("#password").fill("fixture-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/whatsapp");
  await expect(page.getByRole("heading", { name: lang === "ar" ? "متابعة رحلات السائقين" : "Driver trip tracking" })).toBeVisible();
}
test("tracking preserves URL filters, sends once, and shows live progress and review notices", async ({ page }) => {
  let trip = { ...baseTrip };
  let count = 0;
  await page.route("**/api/proxy/whatsapp/trips", route => route.fulfill({ json: { success: true, data: [trip] } }));
  await page.route("**/api/proxy/whatsapp/trips/notices", route => route.fulfill({ json: { success: true, data: [{
    id: "review", contractId: ID, state: "REVIEW_REQUIRED", error: "Dispatch unconfirmed", createdAt: baseTrip.updatedAt,
  }] } }));
  await page.route("**/api/proxy/whatsapp/trips/*/assign", async route => {
    count++; trip = { ...trip, pollDispatch: "SENT", masterDispatch: "SENT", status: "IN_PROGRESS" };
    await route.fulfill({ json: { success: true, data: { pollMessageId: "poll", managementDispatched: true } } });
  });
  await open(page);
  await expect(page.locator("#wa-flow-admin-phone")).toHaveCount(0);
  await expect(page.getByText("120363000123456@g.us", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Send driver poll", exact: true }).click();
  await expect(page.locator("p").filter({ hasText: /^In progress$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send driver poll", exact: true })).toHaveCount(0);
  expect(count).toBe(1);
  await expect(page.getByText("Review receipt before resending", { exact: true })).toBeVisible();
  await page.goto("/admin/whatsapp?keep=1");
  await page.locator("#driver-trip-filter").selectOption("SUPPORT_REQUESTED");
  await expect(page).toHaveURL(/keep=1&tripStatus=SUPPORT_REQUESTED/);
  await expect(page.getByText(/No matching trips/)).toBeVisible();
  await page.reload();
  await expect(page.locator("#driver-trip-filter")).toHaveValue("SUPPORT_REQUESTED");
});
test("tracking supports mobile Arabic and desktop English", async ({ page }) => {
  await page.route("**/api/proxy/whatsapp/trips", route => route.fulfill({ json: { success: true, data: [{ ...baseTrip, status: "SUPPORT_REQUESTED", pollDispatch: "DISPATCHING", lateAlerted: true }] } }));
  await page.route("**/api/proxy/whatsapp/trips/notices", route => route.fulfill({ json: { success: true, data: [] } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "ar");
  await expect(page.locator("p").filter({ hasText: /^طلب مساعدة$/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("heading", { name: "متابعة رحلات السائقين" }).scrollIntoViewIfNeeded();
  await page.setViewportSize({ width: 390, height: 1600 });
  await page.screenshot({ path: "/tmp/miqat-driver-mobile-confirm.png", fullPage: true });
  await page.context().addCookies([{ name: "miqat_language", value: "en", url: "http://127.0.0.1:3419" }]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await expect(page.locator("p").filter({ hasText: /^Support requested$/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1500 });
  await page.screenshot({ path: "/tmp/miqat-driver-desktop-confirm.png", fullPage: true });
});
test("offline and failed tracking queries prevent sending and can recover", async ({ page }) => {
  let failed = true;
  await page.route("**/api/proxy/whatsapp/trips", route => failed
    ? route.fulfill({ status: 503, json: { success: false, error: "Tracking unavailable" } })
    : route.fulfill({ json: { success: true, data: [baseTrip] } }));
  await page.route("**/api/proxy/whatsapp/trips/notices", route => route.fulfill({ json: { success: true, data: [] } }));
  await open(page, "en", false);
  await expect(page.getByText(/Trip tracking could not be loaded/)).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Refresh tracking" }).click();
  await expect(page.getByRole("button", { name: "Send driver poll", exact: true })).toBeDisabled();
});
test("manual contract send accepts a different number while driver polls are enabled", async ({ page }) => {
  await page.route("**/api/proxy/whatsapp/trips", route => route.fulfill({ json: { success: true, data: [] } }));
  await page.route("**/api/proxy/whatsapp/trips/notices", route => route.fulfill({ json: { success: true, data: [] } }));
  await page.route("**/api/proxy/whatsapp/send-contract", route => {
    expect(route.request().postDataJSON()).toEqual({ contractId: ID, phone: "+966500000009" });
    return route.fulfill({ json: { success: true, dispatchKind: "contract_document", phone: "+966500000009", hasPdfAttachment: true } });
  });
  await open(page);
  await page.goto("/admin/contracts/" + ID);
  await page.getByRole("button", { name: "Send via WhatsApp", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Send Contract to Captain via WhatsApp" })).toBeVisible();
  await expect(dialog.getByRole("textbox")).toBeEditable();
  await dialog.getByRole("textbox").fill("+966500000009");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByRole("textbox")).toHaveValue("+966500000009");
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/miqat-manual-contract-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "/tmp/miqat-manual-contract-desktop.png" });
  await dialog.getByRole("button", { name: "Send Now", exact: true }).click();
  await expect(dialog.getByText("Message dispatched to WhatsApp.")).toBeVisible();
  await expect(dialog.getByText("+966500000009", { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Only the text summary was sent/)).toHaveCount(0);
});

test("new and return contract forms show automatic driver tracking instead of phone overrides", async ({ page }) => {
  await page.route("**/api/proxy/whatsapp/trips", route => route.fulfill({ json: { success: true, data: [] } }));
  await page.route("**/api/proxy/whatsapp/trips/notices", route => route.fulfill({ json: { success: true, data: [] } }));
  await open(page);
  await page.goto("/admin/contracts/new");
  await expect(page.getByText("Driver tracking on WhatsApp", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Recipient WhatsApp phone (optional override)" })).toHaveCount(0);
  await page.goto("/admin/contracts/" + ID + "/edit");
  await page.getByRole("button", { name: "Return Trip", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Return Trip", exact: true });
  await expect(dialog.getByText("Driver tracking on WhatsApp", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Recipient WhatsApp phone (optional override)" })).toHaveCount(0);
});
