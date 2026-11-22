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

const FIXTURE_QR_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jI2YAAAAASUVORK5CYII=";

test("disconnected and connecting sessions support reconnecting same number vs switching to a new number", async ({
  page,
}) => {
  let currentStatus: Record<string, unknown> = {
    status: "disconnected",
    qrImage: null,
    haltCode: null,
    savedSession: {
      hasSession: true,
      me_id: "966501112233:2@s.whatsapp.net",
      me_push_name: "Miqat Ops",
    },
    recovery: { canReconnect: true, canRelink: true },
  };
  const reconnectBodies: unknown[] = [];
  const removals: unknown[] = [];
  let logoutCalls = 0;

  await page.route("**/api/proxy/whatsapp/status", (route) =>
    route.fulfill({ json: { success: true, data: currentStatus } }),
  );
  await page.route("**/api/proxy/whatsapp/reconnect", async (route) => {
    const body = route.request().postDataJSON();
    reconnectBodies.push(body);
    currentStatus = {
      status: "connecting",
      qrImage: null,
      haltCode: null,
      savedSession: {
        hasSession: true,
        me_id: "966501112233:2@s.whatsapp.net",
        me_push_name: "Miqat Ops",
      },
      recovery: { canReconnect: true, canRelink: true },
    };
    await route.fulfill({ json: { success: true, data: currentStatus } });
  });
  await page.route("**/api/proxy/whatsapp/logout", async (route) => {
    logoutCalls += 1;
    currentStatus = {
      status: "qr_ready",
      qrImage: FIXTURE_QR_URL,
      haltCode: null,
      savedSession: { hasSession: false },
      recovery: { canReconnect: true, canRelink: true },
    };
    await route.fulfill({ json: { success: true, data: currentStatus } });
  });

  await page.route("**/api/proxy/whatsapp/session/remove", async route => {
    removals.push(route.request().postDataJSON());
    currentStatus = {
      ...currentStatus, savedSession: { hasSession: false },
      sessionActions: { queueBusy: false, canRemove: false, intentionallyRemoved: true },
    };
    await route.fulfill({ json: { success: true, data: currentStatus } });
  });

  await openWhatsApp(page);
  await expect(page.getByText("Saved Session on Server")).toBeVisible();
  await expect(page.getByText("+966501112233")).toBeVisible();
  await expect(page.getByText("Miqat Ops")).toBeVisible();

  await page.getByRole("button", { name: "Reconnect Same Number", exact: true }).click();
  expect(reconnectBodies).toEqual([{ mode: "same_number" }]);
  await expect(page.getByText("Reconnecting to Saved Number...")).toBeVisible();
  await expect(page.getByText("+966501112233")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel & Switch Number", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Cancel & Switch Number", exact: true }).click();
  const switchDialog = page.getByRole("dialog");
  await expect(switchDialog.getByText(/\+966501112233/)).toBeVisible();
  await switchDialog.getByRole("button", { name: "Yes, Link New Number", exact: true }).click();
  expect(logoutCalls).toBe(1);
  await expect(page.getByAltText("WhatsApp Login QR Code")).toBeVisible();
  await expect(page.getByText(/Ready to link a new WhatsApp number/)).toBeVisible();

  // Logged out state with saved session requires re-link QR or switching to a new number
  currentStatus = {
    status: "disconnected",
    qrImage: null,
    haltCode: "logged_out",
    savedSession: {
      hasSession: true,
      me_id: "966501112233:2@s.whatsapp.net",
      me_push_name: "Miqat Ops",
    },
    recovery: { canReconnect: false, canRelink: true },
    antiBan: {
      queueLength: 0,
      maxQueueSize: 100,
      sentLastMinute: 0,
      sentLast24Hours: 0,
      perMinuteLimit: 15,
      dailyLimit: 300,
      minDelayMs: 1500,
      maxDelayMs: 3000,
      cooldownEveryMessages: 10,
      dedupWindowMs: 300000,
      haltReason: "Logged out",
    },
  };
  await page.reload();
  await expect(page.getByRole("button", { name: "Re-link Same Number (New QR)", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Connect New Number", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Re-link Same Number (New QR)", exact: true }).click();
  const relinkDialog = page.getByRole("dialog");
  await expect(relinkDialog.getByText(/\+966501112233/)).toBeVisible();
  await relinkDialog.getByRole("button", { name: "Generate QR Code", exact: true }).click();
  expect(logoutCalls).toBe(2);
  await expect(page.getByText(/Ready to re-link the same number/)).toBeVisible();

  // Forbidden (403) state disables both reconnect and switch-number actions
  currentStatus = {
    status: "disconnected",
    qrImage: null,
    haltCode: "forbidden",
    savedSession: {
      hasSession: true,
      me_id: "966501112233:2@s.whatsapp.net",
      me_push_name: "Miqat Ops",
    },
    recovery: { canReconnect: false, canRelink: false },
    sessionActions: { queueBusy: false, canRemove: true, intentionallyRemoved: false },
    antiBan: {
      queueLength: 0,
      maxQueueSize: 100,
      sentLastMinute: 0,
      sentLast24Hours: 0,
      perMinuteLimit: 15,
      dailyLimit: 300,
      minDelayMs: 1500,
      maxDelayMs: 3000,
      cooldownEveryMessages: 10,
      dedupWindowMs: 300000,
      haltReason: "403 refusal",
    },
  };
  await page.reload();
  await expect(page.getByRole("button", { name: "Reconnect Same Number", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Connect New Number", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Change / New Number", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Remove saved number", exact: true }).click();
  const removeDialog = page.getByRole("dialog");
  await expect(removeDialog.getByText(/\+966501112233/)).toBeVisible();
  await removeDialog.getByRole("button", { name: "Remove number", exact: true }).click();
  expect(removals).toEqual([{ expectedAccount: "966501112233:2@s.whatsapp.net" }]);
  await expect(page.getByText(/Number removed from Miqat/)).toBeVisible();
  await expect(page.getByText("403 refusal", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change / New Number", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Remove saved number", exact: true })).toHaveCount(0);
});
