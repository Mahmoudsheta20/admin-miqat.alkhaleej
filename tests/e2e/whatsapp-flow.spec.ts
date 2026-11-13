import { test, expect, type Page } from "@playwright/test";

async function openWhatsApp(page: Page, language = "en") {
  await page.context().addCookies([{ name: "miqat_language", value: language, url: "http://127.0.0.1:3419" }]);
  await page.addInitScript(({ language }) => {
    const cookieLanguage = document.cookie.split("; ").find(cookie => cookie.startsWith("miqat_language="))?.split("=")[1];
    localStorage.setItem("miqat_language", cookieLanguage || language);
    localStorage.setItem("miqat_theme", "light");
  }, { language });
  await page.goto("/login");
  await page.locator("#email").fill("admin@example.test");
  await page.locator("#password").fill("fixture-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/whatsapp");
  await expect(page.locator("#wa-flow-admin-phone")).toBeVisible();
}

test("flow refresh preserves draft settings and tests cannot target an unsaved phone", async ({ page }) => {
  await openWhatsApp(page);
  const panel = page.locator("section").filter({ has: page.locator("#wa-flow-admin-phone") });
  const phone = page.locator("#wa-flow-admin-phone");
  await phone.fill("+966500000009");
  await expect(page.getByText("Unsaved changes. Save settings before sending a test notification.")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Send Test Flow" })).toBeDisabled();
  const refresh = page.waitForResponse(response => response.request().method() === "GET" && response.url().endsWith("/whatsapp/flow"));
  await panel.getByRole("button", { name: "Refresh", exact: true }).click();
  await refresh;
  await expect(phone).toHaveValue("+966500000009");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(phone).not.toHaveValue("+966500000009");
});

test("halted status disables test sends and uses current safeguards copy", async ({ page }) => {
  await page.route("**/api/proxy/whatsapp/status", route => route.fulfill({ json: {
    success: true, data: { status: "connected", qrImage: null, antiBan: {
      queueLength: 0, maxQueueSize: 100, sentLastMinute: 0, sentLast24Hours: 0,
      attemptedLastMinute: 15, attemptedLast24Hours: 300, perMinuteLimit: 15, dailyLimit: 300,
      minDelayMs: 1500, maxDelayMs: 3500, cooldownEveryMessages: 10, dedupWindowMs: 300000,
      haltReason: "Fixture: sending halted for account review",
    } },
  } }));
  await openWhatsApp(page);
  await expect(page.getByRole("button", { name: "Send Test Message", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Send Test Flow", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Sending Safeguards" })).toBeVisible();
  await expect(page.getByText("Randomized Delay & Typing")).toHaveCount(0);
  await expect(page.getByText("Fixture: sending halted for account review")).toBeVisible();
});

test("WhatsApp flow supports mobile Arabic and desktop English without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWhatsApp(page, "ar");
  const panel = page.locator("section").filter({ has: page.locator("#wa-flow-admin-phone") });
  await panel.scrollIntoViewIfNeeded();
  await expect(page.getByText("تسجيل تحديث الكابتن يدوياً باسم الإدارة")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/miqat-whatsapp-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.context().addCookies([{ name: "miqat_language", value: "en", url: "http://127.0.0.1:3419" }]);
  await page.evaluate(() => localStorage.setItem("miqat_language", "en"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "WhatsApp Connection & Settings" })).toBeVisible();
  await expect(page.locator("#wa-flow-admin-phone")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/miqat-whatsapp-desktop.png", fullPage: true });
});

test("send dialog reports text-only dispatch and stays open for explicit acknowledgement", async ({ page }) => {
  await page.route("**/api/proxy/whatsapp/status", route => route.fulfill({ json: {
    success: true, data: { status: "connected", qrImage: null },
  } }));
  await page.route("**/api/proxy/whatsapp/send-contract", route => route.fulfill({ json: {
    success: true, phone: "+966501234567", messageId: "fixture-text", hasPdfAttachment: false,
  } }));
  await openWhatsApp(page);
  await page.goto("/admin/contracts/11111111-1111-4111-8111-111111111111");
  await page.getByRole("button", { name: "Send via WhatsApp", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Send Now", exact: true }).click();
  await expect(dialog.getByText("Message dispatched to WhatsApp.")).toBeVisible();
  await expect(dialog.getByText("Official PDF document attached with message.")).toHaveCount(0);
  await expect(dialog.getByText(/Only the text summary was sent/)).toBeVisible();
  await expect(dialog.getByText(/Delivery and reading on the recipient/)).toBeVisible();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
