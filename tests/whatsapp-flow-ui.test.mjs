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

function setup(fetchImpl) {
  const storage = () => {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
  };

  const backendExports = {};
  const backendModule = { exports: backendExports };
  vm.runInNewContext(transpile("../lib/backend.ts"), {
    exports: backendExports,
    module: backendModule,
    process: { env: { NEXT_PUBLIC_BACKEND_URL: "https://backend.example/api/" } },
    window: { location: { protocol: "https:" } },
    document: { cookie: "" },
    localStorage: storage(),
    sessionStorage: storage(),
    fetch: fetchImpl,
    AbortSignal,
    FormData,
    URLSearchParams,
  });

  const waExports = {};
  const waModule = { exports: waExports };
  vm.runInNewContext(transpile("../lib/whatsapp.ts"), {
    exports: waExports,
    module: waModule,
    require: (specifier) => {
      if (specifier === "./backend") return backendModule.exports;
      throw new Error(`Unexpected require: ${specifier}`);
    },
    fetch: fetchImpl,
    URLSearchParams,
    FormData,
    AbortSignal,
  });

  return waModule.exports;
}

test("fetchWhatsAppFlowOverview requests /api/proxy/whatsapp/flow with credentials", async () => {
  const calls = [];
  const api = setup(async (url, init) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({
        success: true,
        config: {
          enabled: true,
          adminPhone: "+966577842926",
          notifyOnContractSent: true,
          notifyOnInvoiceSent: true,
          notifyOnCaptainAction: true,
          autoReplyToCaptain: true,
          includeActionMenuOnContract: true,
          includeAdminActionButtons: true,
          interactiveMode: "reactions_and_links",
          autoSendContractDefault: false,
          autoSendInvoiceDefault: false,
          captainButtons: [
            {
              id: "confirm_receipt",
              emoji: "👍",
              code: "1",
              labelAr: "تأكيد استلام العقد",
              labelEn: "Confirm Receipt",
              replyTextAr: "تم تسجيل تأكيد استلام العقد",
              adminNoticeTitleAr: "أكد الكابتن استلام العقد",
              targetStatus: "ACKNOWLEDGED",
              enabled: true,
            },
          ],
          adminActionButtons: [],
        },
        sessions: [],
        events: [],
        stats: { activeSessions: 0, arrivedSessions: 0, totalEvents: 0 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });

  const overview = await api.fetchWhatsAppFlowOverview();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/proxy/whatsapp/flow");
  assert.equal(calls[0].init.credentials, "include");
  assert.equal(overview.config.adminPhone, "+966577842926");
  assert.equal(overview.config.interactiveMode, "reactions_and_links");
  assert.equal(overview.config.captainButtons[0]?.emoji, "👍");
});

test("updateWhatsAppFlowConfig sends PUT payload and returns updated config", async () => {
  let sent;
  const api = setup(async (url, init) => {
    sent = { url, method: init.method, body: JSON.parse(init.body) };
    return new Response(
      JSON.stringify({
        success: true,
        config: {
          enabled: true,
          adminPhone: "+966577842926",
          autoSendContractDefault: true,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });

  const saved = await api.updateWhatsAppFlowConfig({
    adminPhone: "+966577842926",
    autoSendContractDefault: true,
  });
  assert.equal(sent.url, "/api/proxy/whatsapp/flow/config");
  assert.equal(sent.method, "PUT");
  assert.equal(sent.body.adminPhone, "+966577842926");
  assert.equal(sent.body.autoSendContractDefault, true);
  assert.equal(saved.autoSendContractDefault, true);
});

test("triggerWhatsAppFlowAction posts step execution and surfaces errors cleanly", async () => {
  let reqInfo;
  const okApi = setup(async (url, init) => {
    reqInfo = { url, method: init.method, body: JSON.parse(init.body) };
    return new Response(
      JSON.stringify({
        success: true,
        message: "OK",
        session: { id: "sess_1", status: "ARRIVED" },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });

  const res = await okApi.triggerWhatsAppFlowAction({
    sessionId: "sess_1",
    role: "CAPTAIN",
    actionId: "captain_arrived",
  });
  assert.equal(reqInfo.url, "/api/proxy/whatsapp/flow/trigger");
  assert.equal(reqInfo.method, "POST");
  assert.equal(reqInfo.body.actionId, "captain_arrived");
  assert.equal(res.session.status, "ARRIVED");

  const errApi = setup(async () =>
    new Response(JSON.stringify({ success: false, error: "Session not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    }),
  );
  await assert.rejects(
    () =>
      errApi.triggerWhatsAppFlowAction({
        sessionId: "missing",
        role: "CAPTAIN",
        actionId: "captain_arrived",
      }),
    /Session not found/,
  );
});

test("sendWhatsAppFlowTest posts to /api/proxy/whatsapp/flow/test", async () => {
  let targetUrl;
  let method;
  const api = setup(async (url, init) => {
    targetUrl = url;
    method = init.method;
    return new Response(
      JSON.stringify({
        success: true,
        message: "Queued",
        data: { jobId: "wa_1", position: 1, adminPhone: "+966577842926" },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });

  const res = await api.sendWhatsAppFlowTest();
  assert.equal(targetUrl, "/api/proxy/whatsapp/flow/test");
  assert.equal(method, "POST");
  assert.equal(res.data.adminPhone, "+966577842926");
});

test("document adapters preserve PDF fallback metadata and prefer server error reasons", async () => {
  const api = setup(async () => new Response(JSON.stringify({
    success: true, hasPdfAttachment: false, phone: "+966501234567", messageId: "fixture",
  }), { status: 200, headers: { "content-type": "application/json" } }));
  const sent = await api.sendContractWhatsApp("fixture-contract", "+966501234567");
  assert.equal(sent.hasPdfAttachment, false);
  assert.equal(sent.phone, "+966501234567");
  const failed = setup(async () => new Response(JSON.stringify({ success: false, error: "Fixture: account review required" }), {
    status: 400, headers: { "content-type": "application/json" },
  }));
  await assert.rejects(() => failed.sendInvoiceWhatsApp("fixture-invoice"), /account review required/);
});

test("sendInspectionWhatsApp posts to /api/proxy/whatsapp/send-inspection and returns dispatch metadata", async () => {
  let reqInfo;
  const okApi = setup(async (url, init) => {
    reqInfo = {
      url,
      method: init.method,
      credentials: init.credentials,
      body: JSON.parse(init.body),
    };
    return new Response(
      JSON.stringify({
        success: true,
        dispatchKind: "inspection_document",
        hasPdfAttachment: true,
        phone: "+966559876543",
        messageId: "wa-insp-1",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });

  const sent = await okApi.sendInspectionWhatsApp("fixture-inspection", "+966559876543");
  assert.equal(reqInfo.url, "/api/proxy/whatsapp/send-inspection");
  assert.equal(reqInfo.method, "POST");
  assert.equal(reqInfo.credentials, "include");
  assert.deepEqual(reqInfo.body, {
    inspectionId: "fixture-inspection",
    phone: "+966559876543",
  });
  assert.equal(sent.dispatchKind, "inspection_document");
  assert.equal(sent.hasPdfAttachment, true);
  assert.equal(sent.phone, "+966559876543");
  assert.equal(sent.messageId, "wa-insp-1");

  const errApi = setup(async () =>
    new Response(
      JSON.stringify({ success: false, error: "تقرير الفحص غير موجود" }),
      { status: 400, headers: { "content-type": "application/json" } },
    ),
  );
  await assert.rejects(() => errApi.sendInspectionWhatsApp("missing"), /تقرير الفحص غير موجود/);
});
