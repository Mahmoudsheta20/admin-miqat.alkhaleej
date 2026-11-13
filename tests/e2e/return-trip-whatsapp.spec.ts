import { test, expect, type Page } from "@playwright/test";
import type { Contract } from "../../lib/types";

const sourceId = "11111111-1111-4111-8111-111111111111";

async function mockReturnCreation(page: Page, sendSuccess = true) {
  const sourceResponse = await page.request.get(`/api/proxy/contracts/${sourceId}`);
  const source = await sourceResponse.json() as { data: Contract };
  await page.route("**/api/proxy/contracts", async route => {
    if (route.request().method() !== "POST") return route.continue();
    const { autoSendWhatsApp, whatsAppPhone, ...fields } = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, json: { success: true, data: {
      ...source.data, ...fields,
      id: "22222222-2222-4222-8222-222222222222", referenceNumber: "MQ-RETURN-FIXTURE", pdfPath: "fixture.pdf",
      ...(autoSendWhatsApp ? { whatsAppAutoSend: {
        attempted: true, success: sendSuccess,
        phone: whatsAppPhone || source.data.captain?.phone,
        ...(!sendSuccess ? { error: "Fixture: WhatsApp offline" } : {}),
      } } : {}),
    } } });
  });
}

async function openEditor(page: Page, language = "en") {
  await page.context().addCookies([{ name: "miqat_language", value: language, url: "http://127.0.0.1:3419" }]);
  await page.addInitScript(({ language }) => {
    localStorage.setItem("miqat_language", language);
    localStorage.setItem("miqat_theme", "light");
  }, { language });
  await page.route("**/api/proxy/whatsapp/status", route => route.fulfill({ json: {
    success: true, data: { status: "connected", qrImage: null },
  } }));
  await page.goto("/login");
  await page.locator("#email").fill("admin@example.test");
  await page.locator("#password").fill("fixture-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/admin/contracts/${sourceId}/edit`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("MQ-FIXTURE-001");
}

async function prepareReturn(page: Page, language = "en") {
  const isAr = language === "ar";
  await page.getByRole("button", { name: isAr ? "رحلة عودة" : "Return Trip", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: isAr ? "رحلة عودة" : "Return Trip", exact: true });
  await expect(dialog.getByText(isAr ? "جاري تحميل الكباتن والمركبات..." : "Loading captains and vehicles...")).toHaveCount(0);
  await dialog.getByRole("button", { name: isAr ? "تاريخ العودة" : "Return Date", exact: true }).click();
  await page.getByRole("button", { name: isAr ? "اليوم" : "Today", exact: true }).click();
  await dialog.getByRole("checkbox", { name: isAr ? /أؤكد إجراء الفحص/ : /I confirm that safety inspection/ }).check();
  return dialog;
}

test("contract editor sends the saved contract to its captain without saving edits", async ({ page }) => {
  let updates = 0;
  page.on("request", request => {
    if (request.method() === "PUT" && request.url().endsWith(`/contracts/${sourceId}`)) updates++;
  });
  await openEditor(page);
  await page.getByRole("button", { name: "Send via WhatsApp", exact: true }).click();
  const sendDialog = page.getByRole("dialog", { name: "Send Contract to Captain via WhatsApp" });
  await expect(sendDialog.getByRole("textbox")).toHaveValue("0551234567");
  const sent = page.waitForRequest(request => request.url().endsWith("/whatsapp/send-contract") && request.method() === "POST");
  await sendDialog.getByRole("button", { name: "Send Now", exact: true }).click();
  expect((await sent).postDataJSON()).toEqual({ contractId: sourceId, phone: "0551234567" });
  await expect(sendDialog.getByText("Message dispatched to WhatsApp.")).toBeVisible();
  expect(updates).toBe(0);
});

test("return contract can auto-send to an override and manual sending targets the new contract", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEditor(page);
  await mockReturnCreation(page);
  const dialog = await prepareReturn(page);
  const autoSend = dialog.getByRole("checkbox", { name: /Auto-send return contract via WhatsApp/ });
  await expect(autoSend).not.toBeChecked();
  await autoSend.check();
  await dialog.getByRole("textbox", { name: "Recipient WhatsApp phone (optional override)" }).fill("+966500000009");
  await page.screenshot({ path: "/tmp/miqat-return-whatsapp-desktop.png", fullPage: true });
  const created = page.waitForResponse(response => response.url().endsWith("/contracts") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Create Return Contract", exact: true }).click();
  const response = await created;
  const payload = response.request().postDataJSON();
  expect(payload.autoSendWhatsApp).toBe(true);
  expect(payload.whatsAppPhone).toBe("+966500000009");
  expect(payload.origin).toBe("مكة المكرمة");
  expect(payload.destination).toBe("جدة");
  const result = await response.json() as { data: { id: string } };
  expect(result.data.id).not.toBe(sourceId);
  await expect(dialog.getByText("Return contract dispatched to WhatsApp.")).toBeVisible();
  await dialog.getByRole("button", { name: "Send via WhatsApp", exact: true }).click();
  const sendDialog = page.getByRole("dialog", { name: "Send Contract to Captain via WhatsApp" });
  await expect(sendDialog.getByRole("textbox")).toHaveValue("+966500000009");
  const sent = page.waitForRequest(request => request.url().endsWith("/whatsapp/send-contract") && request.method() === "POST");
  await sendDialog.getByRole("button", { name: "Send Now", exact: true }).click();
  expect((await sent).postDataJSON().contractId).toBe(result.data.id);
  await expect(sendDialog.getByText("Message dispatched to WhatsApp.")).toBeVisible();
  await sendDialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Return Trip Created Successfully" })).toBeVisible();
});

test("Arabic mobile return creation preserves the saved contract when WhatsApp fails", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openEditor(page, "ar");
  await mockReturnCreation(page, false);
  const dialog = await prepareReturn(page, "ar");
  await dialog.getByRole("checkbox", { name: /إرسال عقد العودة تلقائياً/ }).check();
  await dialog.getByRole("textbox", { name: /رقم الواتساب المستهدف/ }).scrollIntoViewIfNeeded();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/miqat-return-whatsapp-mobile.png", fullPage: true });
  const created = page.waitForResponse(response => response.url().endsWith("/contracts") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "إنشاء عقد العودة", exact: true }).click();
  const response = await created;
  expect(response.request().postDataJSON().whatsAppPhone).toBeUndefined();
  await expect(dialog.getByRole("heading", { name: "تم إنشاء رحلة العودة بنجاح" })).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("Fixture: WhatsApp offline");
  await expect(dialog.getByRole("button", { name: "إرسال عبر واتساب", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "إنشاء عقد العودة", exact: true })).toHaveCount(0);
});

test("return creation does not request a WhatsApp send unless the option is selected", async ({ page }) => {
  await openEditor(page);
  await mockReturnCreation(page);
  const dialog = await prepareReturn(page);
  const created = page.waitForResponse(response => response.url().endsWith("/contracts") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Create Return Contract", exact: true }).click();
  const payload = (await created).request().postDataJSON();
  expect(payload.autoSendWhatsApp).toBeUndefined();
  expect(payload.whatsAppPhone).toBeUndefined();
  await expect(dialog.getByRole("heading", { name: "Return Trip Created Successfully" })).toBeVisible();
  await expect(dialog.getByText("Return contract dispatched to WhatsApp.")).toHaveCount(0);
});
