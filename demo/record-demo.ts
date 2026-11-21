import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type CDPSession,
  type Locator,
  type Page,
} from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SCRIPT_PATH = path.join(ROOT_DIR, "demo", "script.json");
const RECORDINGS_DIR = path.join(ROOT_DIR, "demo", "recordings");
const FRAMES_DIR = path.join(RECORDINGS_DIR, "_frames");

const BACKEND_PORT = 5129;
const FRONTEND_PORT = 3429;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const DEFAULT_FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

const CHROME_EXEC =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

interface UiAction {
  action:
    | "introSlate"
    | "outroSlate"
    | "goto"
    | "highlight"
    | "glideHover"
    | "glideClick"
    | "typeSlow"
    | "smoothScroll"
    | "selectContract"
    | "pressKey"
    | "switchContext";
  target?: string;
  label?: string;
  y?: number;
  durationMs?: number;
  holdMs?: number;
  value?: string;
  index?: number;
  key?: string;
  role?: "ADMIN" | "CAPTAIN";
}

interface DemoScene {
  id: string;
  titleAr: string;
  titleEn: string;
  routes: string[];
  estimatedDurationSec: number;
  durationMs: number | null;
  audioFile: string;
  narrationAr: string;
  ttsAr?: string;
  narrationEn: string;
  uiActions: UiAction[];
}

interface DemoScript {
  meta: {
    project: string;
    targetDurationSec: number;
    demoUrl: string;
  };
  scenes: DemoScene[];
}

interface CapturedFrame {
  file: string;
  tMs: number;
}

interface SceneTimelineEntry {
  id: string;
  titleAr: string;
  titleEn: string;
  videoFile: string;
  audioFile: string;
  startSec: number;
  durationSec: number;
  audioDurationSec: number;
  framesCaptured: number;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function getArg(flag: string): string {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return "";
}

function loadLocalFontCss(): string {
  const fontsDir = path.join(ROOT_DIR, "app", "fonts");
  const loadB64 = (file: string): string =>
    fs.readFileSync(path.join(fontsDir, file)).toString("base64");
  const rules: Array<[string, number, string]> = [
    ["IBM Plex Sans Arabic", 400, "ibm-plex-sans-arabic-arabic-400-normal.woff2"],
    ["IBM Plex Sans Arabic", 500, "ibm-plex-sans-arabic-arabic-500-normal.woff2"],
    ["IBM Plex Sans Arabic", 600, "ibm-plex-sans-arabic-arabic-600-normal.woff2"],
    ["IBM Plex Sans Arabic", 700, "ibm-plex-sans-arabic-arabic-700-normal.woff2"],
    ["Inter", 400, "inter-latin-400-normal.woff2"],
    ["Inter", 600, "inter-latin-600-normal.woff2"],
    ["Inter", 700, "inter-latin-700-normal.woff2"],
  ];
  return rules
    .map(
      ([family, weight, file]) => `@font-face {
        font-family: '${family}';
        font-style: normal;
        font-weight: ${weight};
        font-display: block;
        src: url('data:font/woff2;base64,${loadB64(file)}') format('woff2');
      }`,
    )
    .join("\n");
}

function loadLogoDataUri(): string {
  const b64 = fs.readFileSync(path.join(ROOT_DIR, "public", "logo.svg")).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

function buildBrandSlateHtml(mode: "intro" | "outro", fontCss: string, logoUri: string): string {
  const isIntro = mode === "intro";
  const pillText = isIntro ? "العرض التعريفي السريع" : "تحكّم كامل · أرقام دقيقة بالهللة";
  const heading = isIntro
    ? "منظومة ميقات الخليج"
    : "ميقات الخليج — جاهز لقيادة أسطولك وماليتك";
  const subtext = isIntro
    ? "منصة موحدة تربط إدارة الأسطول والعقود بالفوترة الضريبية ZATCA والمحاسبة"
    : "تشغيل يومي مترابط · تجربة مالية سهلة · ومركز تصدير موحّد لجميع التقارير";
  const pillars: Array<[string, string]> = isIntro
    ? [
        ["الأسطول والفحص", "فحص 16 نقطة وتنبيهات الوثائق"],
        ["العقود والكابتن", "كشف الركاب، QR وبوابة السائق"],
        ["الفوترة والمحاسبة", "سداد حي، معالج 4 مراحل وربحية"],
        ["الزكاة والتصدير", "إقرار 1–16 ومركز تصدير 19 فلتراً"],
      ]
    : [
        ["متابعة فورية", "لوحة تحكم حية وأرقام دقيقة"],
        ["امتثال ZATCA", "فوترة إلكترونية وضريبة متطابقة"],
        ["أتمتة واتساب", "إشعارات مباشرة للعقود والفواتير"],
        ["تصدير بضغطة زر", "PDF A4 و Excel CSV و JSON"],
      ];

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
${fontCss}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1920px; height: 1080px; overflow: hidden;
  font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
  background: radial-gradient(circle at 20% 20%, rgba(197, 145, 56, 0.24), transparent 48%),
              radial-gradient(circle at 82% 84%, rgba(197, 145, 56, 0.14), transparent 45%),
              linear-gradient(135deg, #0b1523 0%, #14253b 54%, #0d1828 100%);
  color: #f8fafc;
}
.grid { position:absolute; inset:0; background-image:linear-gradient(to right, rgba(255,255,255,.03) 1px,transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.03) 1px,transparent 1px); background-size:64px 64px; }
.wrap { position:relative; width:1920px; height:1080px; padding:88px 116px; display:flex; flex-direction:column; justify-content:space-between; }
.top { display:flex; align-items:center; justify-content:space-between; }
.brand { display:flex; align-items:center; gap:24px; }
.logo { width:92px; height:92px; border-radius:22px; background:#fff; border:2px solid rgba(197,145,56,.7); padding:10px; box-shadow:0 18px 44px rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; }
.logo img { width:100%; height:100%; object-fit:contain; }
.en { font-family:'Inter',sans-serif; font-size:15px; font-weight:600; letter-spacing:.16em; color:#e2b86b; margin-bottom:4px; }
.ar { font-size:26px; font-weight:700; }
.pill { display:inline-flex; align-items:center; gap:10px; padding:12px 24px; border-radius:999px; border:1px solid rgba(197,145,56,.58); background:rgba(197,145,56,.15); color:#f3d28f; font-size:18px; font-weight:600; }
.dot { width:10px; height:10px; border-radius:50%; background:#e2b86b; animation:pulse 1.3s ease-in-out infinite; }
@keyframes pulse { 0%,100% { transform:scale(1); opacity:.85; } 50% { transform:scale(1.35); opacity:1; } }
.hero h1 { font-size:74px; font-weight:700; color:#e2b86b; line-height:1.25; margin-bottom:18px; }
.hero p { font-size:29px; color:#cbd5e1; line-height:1.6; max-width:1360px; }
.cards { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:22px; }
.card { border-radius:20px; padding:26px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-top:3px solid #c59138; }
.card h3 { font-size:22px; font-weight:700; color:#fff; margin-bottom:8px; }
.card p { font-size:17px; color:#cbd5e1; line-height:1.55; }
.foot { border-top:1px solid rgba(255,255,255,.12); padding-top:20px; display:flex; justify-content:space-between; color:#94a3b8; font-size:16px; }
</style>
</head>
<body>
  <div class="grid"></div>
  <div class="wrap">
    <div class="top">
      <div class="brand">
        <div class="logo"><img src="${logoUri}" alt="Miqat Logo" /></div>
        <div><div class="en">MIQAT AL-KHALEEJ</div><div class="ar">شركة ميقات الخليج للنقل والخدمات</div></div>
      </div>
      <div class="pill"><span class="dot"></span><span>${pillText}</span></div>
    </div>
    <div class="hero">
      <h1>${heading}</h1>
      <p>${subtext}</p>
    </div>
    <div class="cards">
      ${pillars.map(([t, d]) => `<div class="card"><h3>${t}</h3><p>${d}</p></div>`).join("")}
    </div>
    <div class="foot"><span>المملكة العربية السعودية · منصة إدارة الأسطول والفوترة الإلكترونية</span><span>Enterprise Financial & Fleet Suite</span></div>
  </div>
</body>
</html>`;
}

async function waitForHttpReady(url: string, label: string, timeoutMs = 45_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) {
        console.log(`${label} ready (${res.status}) at ${url}`);
        return;
      }
    } catch {
      // retry until ready
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${label} at ${url}`);
}

const OVERLAY_INIT_SCRIPT = (): void => {
  if (typeof window === "undefined") return;
  const win = window as unknown as {
    __demoState?: { x: number; y: number; badge: string; title: string; visible: boolean };
    __syncDemoOverlay?: () => void;
  };
  win.__demoState = win.__demoState || { x: 960, y: 540, badge: "", title: "", visible: false };
  win.__syncDemoOverlay = () => {
    if (!document.body) return;
    let style = document.getElementById("__demo_style");
    if (!style) {
      style = document.createElement("style");
      style.id = "__demo_style";
      style.textContent = `
        @keyframes __demoPulse { 0%,100% { opacity:.75; transform:scale(1); } 50% { opacity:1; transform:scale(1.26); } }
        @keyframes __demoRipple { 0% { opacity:.95; transform:translate(-50%,-50%) scale(.35); } 100% { opacity:0; transform:translate(-50%,-50%) scale(2.25); } }
        @keyframes __demoFocus { 0%,100% { box-shadow:0 0 0 3px rgba(197,145,56,.88), 0 0 24px rgba(197,145,56,.28); } 50% { box-shadow:0 0 0 5px rgba(226,184,107,1), 0 0 32px rgba(197,145,56,.46); } }
        #__demo_badge {
          position:fixed; bottom:18px; left:18px; z-index:2147483640; pointer-events:none; direction:rtl;
          display:flex; align-items:center; gap:10px; padding:9px 16px; border-radius:999px;
          background:rgba(15,23,42,.91); color:#f8fafc; border:1px solid rgba(197,145,56,.68);
          box-shadow:0 10px 26px rgba(0,0,0,.28); font-family:'IBM Plex Sans Arabic',sans-serif;
        }
        #__demo_badge .dot { width:9px; height:9px; border-radius:50%; background:#e2b86b; animation:__demoPulse 1.4s ease-in-out infinite; }
        #__demo_badge .tag { font-size:12px; font-weight:700; color:#e2b86b; padding-inline-end:8px; border-inline-end:1px solid rgba(255,255,255,.22); font-family:'Inter','IBM Plex Sans Arabic',sans-serif; }
        #__demo_badge .ttl { font-size:13px; font-weight:600; color:#f1f5f9; }
        #__demo_cursor { position:fixed; z-index:2147483647; pointer-events:none; width:28px; height:28px; transform:translate(-4px,-3px); filter:drop-shadow(0 3px 6px rgba(0,0,0,.45)); }
        #__demo_ripple { position:fixed; z-index:2147483646; pointer-events:none; width:36px; height:36px; border-radius:50%; border:2.5px solid #e2b86b; background:rgba(197,145,56,.25); opacity:0; }
        #__demo_ripple.pop { animation:__demoRipple .5s ease-out forwards; }
        #__demo_focus_box { position:fixed; z-index:2147483635; pointer-events:none; border-radius:14px; border:2px solid #e2b86b; display:none; animation:__demoFocus 1.0s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    let badge = document.getElementById("__demo_badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "__demo_badge";
      badge.innerHTML = `<span class="dot"></span><span class="tag"></span><span class="ttl"></span>`;
      document.body.appendChild(badge);
    }
    const st = win.__demoState;
    if (st) {
      badge.style.display = st.visible ? "flex" : "none";
      const tagEl = badge.querySelector(".tag");
      const ttlEl = badge.querySelector(".ttl");
      if (tagEl) tagEl.textContent = st.badge;
      if (ttlEl) ttlEl.textContent = st.title;
    }

    let cursor = document.getElementById("__demo_cursor");
    if (!cursor) {
      cursor = document.createElement("div");
      cursor.id = "__demo_cursor";
      cursor.innerHTML = `<svg viewBox="0 0 28 28" width="28" height="28"><path d="M4 3 L4 22 L9.5 16.8 L14 25 L17 23.4 L12.6 15.2 L20 15.2 Z" fill="#c59138" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/></svg>`;
      document.body.appendChild(cursor);
    }
    if (st) {
      cursor.style.left = `${st.x}px`;
      cursor.style.top = `${st.y}px`;
    }
    if (!document.getElementById("__demo_ripple")) {
      const rp = document.createElement("div");
      rp.id = "__demo_ripple";
      document.body.appendChild(rp);
    }
    if (!document.getElementById("__demo_focus_box")) {
      const fb = document.createElement("div");
      fb.id = "__demo_focus_box";
      document.body.appendChild(fb);
    }
  };
  window.addEventListener("DOMContentLoaded", () => win.__syncDemoOverlay?.());
  setInterval(() => {
    if (!document.getElementById("__demo_cursor")) win.__syncDemoOverlay?.();
  }, 180);
};

async function syncSceneBadge(page: Page, badge: string, title: string, visible = true): Promise<void> {
  await page
    .evaluate(
      ({ b, t, vis }) => {
        const win = window as unknown as {
          __demoState?: { x: number; y: number; badge: string; title: string; visible: boolean };
          __syncDemoOverlay?: () => void;
        };
        win.__demoState = { ...(win.__demoState || { x: 960, y: 540 }), badge: b, title: t, visible: vis };
        win.__syncDemoOverlay?.();
      },
      { b: badge, t: title, vis: visible },
    )
    .catch(() => {});
}

async function glideMouse(page: Page, tx: number, ty: number, steps = 11): Promise<void> {
  await page
    .evaluate(
      async ({ targetX, targetY, totalSteps }) => {
        const win = window as unknown as { __demoState?: { x: number; y: number } };
        const st = win.__demoState || { x: 960, y: 540 };
        const sx = Number(st.x);
        const sy = Number(st.y);
        const el = document.getElementById("__demo_cursor");
        for (let i = 1; i <= totalSteps; i++) {
          const p = i / totalSteps;
          const ease = 1 - Math.pow(1 - p, 3);
          const x = sx + (targetX - sx) * ease;
          const y = sy + (targetY - sy) * ease;
          st.x = x;
          st.y = y;
          if (el) {
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
          }
          await new Promise((r) => setTimeout(r, 16));
        }
      },
      { targetX: tx, targetY: ty, totalSteps: steps },
    )
    .catch(() => {});
}

async function resolveFirstVisible(page: Page, selectorCsv: string): Promise<Locator | null> {
  for (const part of selectorCsv.split(",").map((s) => s.trim()).filter(Boolean)) {
    const loc = page.locator(part).first();
    try {
      await loc.waitFor({ state: "visible", timeout: 1800 });
      return loc;
    } catch {
      // try next fallback selector
    }
  }
  return null;
}

async function focusBoxOnLocator(page: Page, loc: Locator | null, durationMs = 750): Promise<void> {
  if (!loc) return;
  const box = await loc.boundingBox().catch(() => null);
  if (!box) return;
  await page
    .evaluate(
      ({ x, y, w, h }) => {
        const fb = document.getElementById("__demo_focus_box");
        if (fb) {
          fb.style.left = `${Math.max(0, x - 5)}px`;
          fb.style.top = `${Math.max(0, y - 5)}px`;
          fb.style.width = `${w + 10}px`;
          fb.style.height = `${h + 10}px`;
          fb.style.display = "block";
        }
      },
      { x: box.x, y: box.y, w: box.width, h: box.height },
    )
    .catch(() => {});
  await sleep(durationMs);
  await page
    .evaluate(() => {
      const fb = document.getElementById("__demo_focus_box");
      if (fb) fb.style.display = "none";
    })
    .catch(() => {});
}

async function glideClick(page: Page, selectorCsv: string, holdMs = 380): Promise<boolean> {
  const loc = await resolveFirstVisible(page, selectorCsv);
  if (!loc) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(80);
  const box = await loc.boundingBox().catch(() => null);
  if (!box) return false;
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  await glideMouse(page, cx, cy);
  await page
    .evaluate(
      ({ px, py }) => {
        const rp = document.getElementById("__demo_ripple");
        if (rp) {
          rp.style.left = `${px}px`;
          rp.style.top = `${py}px`;
          rp.classList.remove("pop");
          void rp.offsetWidth;
          rp.classList.add("pop");
        }
      },
      { px: cx, py: cy },
    )
    .catch(() => {});
  await sleep(90);
  await loc.click({ timeout: 2200 }).catch(() => {});
  await sleep(holdMs);
  return true;
}

async function glideHover(page: Page, selectorCsv: string, pauseMs = 400): Promise<boolean> {
  const loc = await resolveFirstVisible(page, selectorCsv);
  if (!loc) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const box = await loc.boundingBox().catch(() => null);
  if (!box) return false;
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  await glideMouse(page, cx, cy);
  await loc.hover().catch(() => {});
  await focusBoxOnLocator(page, loc, pauseMs);
  return true;
}

async function smoothScroll(page: Page, targetY: number, durationMs = 650): Promise<void> {
  await page
    .evaluate(
      async ({ dest, ms }) => {
        const startY = window.scrollY || 0;
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const clamped = Math.min(Math.max(0, dest), maxY);
        const t0 = performance.now();
        await new Promise<void>((resolve) => {
          function step(now: number): void {
            const p = Math.min(1, (now - t0) / Math.max(1, ms));
            const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            window.scrollTo(0, startY + (clamped - startY) * ease);
            if (p < 1) requestAnimationFrame(step);
            else resolve();
          }
          requestAnimationFrame(step);
        });
      },
      { dest: targetY, ms: durationMs },
    )
    .catch(() => {});
}

async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page
    .waitForFunction(() => document.querySelectorAll(".animate-pulse").length === 0, { timeout: 3200 })
    .catch(() => {});
  await sleep(160);
}

async function ensureRoute(page: Page, baseUrl: string, routePath: string, requireAuth: boolean): Promise<void> {
  const currentPath = (() => {
    try {
      return new URL(page.url()).pathname;
    } catch {
      return "";
    }
  })();
  if (currentPath !== routePath) {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await waitForAppReady(page);
    await sleep(160);
  }
  if (requireAuth && page.url().includes("/login")) {
    throw new Error(`Authentication lost on ${routePath} (redirected to ${page.url()})`);
  }
}

async function authenticateContext(context: BrowserContext, baseUrl: string, token: string): Promise<void> {
  await context.addCookies([
    { name: "miqat_token", value: token, url: baseUrl, httpOnly: true, sameSite: "Lax" },
    { name: "miqat_language", value: "ar", url: baseUrl, sameSite: "Lax" },
  ]);
  await context.addInitScript(() => {
    localStorage.setItem("miqat_language", "ar");
    localStorage.setItem("miqat_theme", "light");
  });
  await context.addInitScript(OVERLAY_INIT_SCRIPT);
}

async function recordScene(args: {
  scene: DemoScene;
  sceneIdx: number;
  totalScenes: number;
  adminPage: Page;
  captainPage: Page;
  slatePage: Page;
  fontCss: string;
  logoUri: string;
  baseUrl: string;
}): Promise<{ videoPath: string; durationSec: number; framesCaptured: number }> {
  const { scene, sceneIdx, totalScenes, adminPage, captainPage, slatePage, fontCss, logoUri, baseUrl } = args;
  const counterLabel = `${String(sceneIdx + 1).padStart(2, "0")} / ${String(totalScenes).padStart(2, "0")}`;
  const targetSec = ((scene.durationMs ?? scene.estimatedDurationSec * 1000) + 400) / 1000;
  const scFramesDir = path.join(FRAMES_DIR, scene.id);
  fs.rmSync(scFramesDir, { recursive: true, force: true });
  fs.mkdirSync(scFramesDir, { recursive: true });

  const startsWithIntro = scene.uiActions[0]?.action === "introSlate";
  let initialPage: Page = adminPage;
  if (startsWithIntro) {
    await slatePage.setContent(buildBrandSlateHtml("intro", fontCss, logoUri), { waitUntil: "load" });
    await slatePage.evaluate(() => document.fonts.ready);
    await ensureRoute(adminPage, baseUrl, scene.routes[0] || "/admin", true);
    initialPage = slatePage;
  } else {
    await ensureRoute(adminPage, baseUrl, scene.routes[0] || "/admin", true);
    await syncSceneBadge(adminPage, counterLabel, scene.titleAr, true);
  }

  let activePage = initialPage;
  let cdp: CDPSession | null = null;
  let capturing = true;
  let seq = 0;
  let lastFrameAt = 0;
  let snapBusy = false;
  const frames: CapturedFrame[] = [];
  const startWall = Date.now();

  const onFrame = async (evt: { data: string; sessionId: number }): Promise<void> => {
    try {
      await cdp?.send("Page.screencastFrameAck", { sessionId: evt.sessionId });
    } catch {
      // detached
    }
    if (!capturing) return;
    const file = `f${String(seq++).padStart(6, "0")}.jpg`;
    fs.writeFileSync(path.join(scFramesDir, file), Buffer.from(evt.data, "base64"));
    frames.push({ file, tMs: Date.now() - startWall });
    lastFrameAt = Date.now();
  };

  const attach = async (pg: Page): Promise<void> => {
    activePage = pg;
    await pg.bringToFront().catch(() => {});
    const initBuf = await pg.screenshot({ type: "jpeg", quality: 92 }).catch(() => null);
    if (initBuf && capturing) {
      const file = `f${String(seq++).padStart(6, "0")}.jpg`;
      fs.writeFileSync(path.join(scFramesDir, file), initBuf);
      frames.push({ file, tMs: Date.now() - startWall });
      lastFrameAt = Date.now();
    }
    cdp = await pg.context().newCDPSession(pg);
    cdp.on("Page.screencastFrame", onFrame);
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 92,
      maxWidth: 1920,
      maxHeight: 1080,
      everyNthFrame: 1,
    });
  };

  const detach = async (): Promise<void> => {
    if (!cdp) return;
    cdp.off("Page.screencastFrame", onFrame);
    await cdp.send("Page.stopScreencast").catch(() => {});
    await cdp.detach().catch(() => {});
    cdp = null;
  };

  await attach(initialPage);

  const heartbeat = setInterval(async () => {
    if (!capturing || snapBusy) return;
    if (Date.now() - lastFrameAt > 180) {
      snapBusy = true;
      try {
        const buf = await activePage.screenshot({ type: "jpeg", quality: 92 }).catch(() => null);
        if (buf && capturing) {
          const file = `f${String(seq++).padStart(6, "0")}.jpg`;
          fs.writeFileSync(path.join(scFramesDir, file), buf);
          frames.push({ file, tMs: Date.now() - startWall });
          lastFrameAt = Date.now();
        }
      } finally {
        snapBusy = false;
      }
    }
  }, 120);

  try {
    for (const act of scene.uiActions) {
      if (act.action === "introSlate") {
        await sleep(act.durationMs ?? 3000);
        await detach();
        await syncSceneBadge(adminPage, counterLabel, scene.titleAr, true);
        await attach(adminPage);
      } else if (act.action === "outroSlate") {
        await slatePage.setContent(buildBrandSlateHtml("outro", fontCss, logoUri), { waitUntil: "load" });
        await slatePage.evaluate(() => document.fonts.ready);
        await detach();
        await attach(slatePage);
        const remOutro = Math.max(act.durationMs ?? 3500, targetSec * 1000 - (Date.now() - startWall) - 40);
        await sleep(remOutro);
      } else if (act.action === "goto" && act.target) {
        await ensureRoute(activePage, baseUrl, act.target, true);
        await syncSceneBadge(activePage, counterLabel, scene.titleAr, true);
      } else if (act.action === "switchContext") {
        const targetPg = act.role === "CAPTAIN" ? captainPage : adminPage;
        await ensureRoute(targetPg, baseUrl, act.target || "/captain", true);
        await detach();
        await syncSceneBadge(targetPg, `${counterLabel} · الكابتن`, scene.titleAr, true);
        await attach(targetPg);
      } else if (act.action === "highlight" && act.target) {
        const loc = await resolveFirstVisible(activePage, act.target);
        await focusBoxOnLocator(activePage, loc, act.holdMs ?? 750);
      } else if (act.action === "glideHover" && act.target) {
        await glideHover(activePage, act.target, act.holdMs ?? 450);
      } else if (act.action === "glideClick" && act.target) {
        await glideClick(activePage, act.target, act.holdMs ?? 380);
        await waitForAppReady(activePage);
        if (activePage !== slatePage) {
          await syncSceneBadge(
            activePage,
            activePage === captainPage ? `${counterLabel} · الكابتن` : counterLabel,
            scene.titleAr,
            true,
          );
        }
      } else if (act.action === "typeSlow" && act.target && act.value !== undefined) {
        const loc = await resolveFirstVisible(activePage, act.target);
        if (loc) {
          await glideClick(activePage, act.target, 120);
          await loc.fill("");
          await loc.pressSequentially(act.value, { delay: 40 });
        }
      } else if (act.action === "smoothScroll") {
        await smoothScroll(activePage, act.y ?? 260, act.durationMs ?? 600);
      } else if (act.action === "selectContract") {
        const sel = activePage.locator("select").filter({ hasText: /اختر عقد|CON-|MQ-/ }).first();
        if (await sel.isVisible().catch(() => false)) {
          await sel.selectOption({ index: act.index ?? 1 }).catch(() => {});
          await sleep(280);
        }
      } else if (act.action === "pressKey" && act.key) {
        await activePage.keyboard.press(act.key).catch(() => {});
        await sleep(220);
      }
    }

    const remMs = targetSec * 1000 - (Date.now() - startWall) - 35;
    if (remMs > 20) await sleep(remMs);
  } finally {
    clearInterval(heartbeat);
    const tail = await activePage.screenshot({ type: "jpeg", quality: 92 }).catch(() => null);
    if (tail) {
      const file = `f${String(seq++).padStart(6, "0")}.jpg`;
      fs.writeFileSync(path.join(scFramesDir, file), tail);
      frames.push({ file, tMs: Date.now() - startWall });
    }
    capturing = false;
    await detach();
  }

  if (frames.length < 2) {
    throw new Error(`Too few frames captured for ${scene.id}`);
  }

  const firstT = frames[0].tMs;
  const lastT = Math.max(firstT + 200, frames[frames.length - 1].tMs);
  const actualSec = (lastT - firstT) / 1000;
  const scale = targetSec / actualSec;

  const concatLines = ["ffconcat version 1.0"];
  for (let i = 0; i < frames.length; i++) {
    const dt =
      i < frames.length - 1
        ? Math.max(0.015, ((frames[i + 1].tMs - frames[i].tMs) / 1000) * scale)
        : 0.04;
    concatLines.push(`file '${frames[i].file}'`);
    concatLines.push(`duration ${dt.toFixed(4)}`);
  }
  concatLines.push(`file '${frames[frames.length - 1].file}'`);
  const framesTxt = path.join(scFramesDir, "frames.txt");
  fs.writeFileSync(framesTxt, concatLines.join("\n") + "\n");

  const outMp4 = path.join(RECORDINGS_DIR, `${scene.id}.mp4`);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      framesTxt,
      "-vf",
      "fps=30,scale=1920:1080:in_range=full:out_range=tv,setsar=1,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-color_range",
      "tv",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-t",
      targetSec.toFixed(3),
      outMp4,
    ],
    { stdio: "pipe" },
  );

  const probeDur = Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", outMp4],
      { encoding: "utf8" },
    ).trim(),
  );

  fs.rmSync(scFramesDir, { recursive: true, force: true });
  console.log(
    `Recorded ${scene.id}: frames=${frames.length}, wall=${actualSec.toFixed(2)}s -> mp4=${probeDur.toFixed(3)}s (target=${targetSec.toFixed(3)}s)`,
  );

  return { videoPath: outMp4, durationSec: probeDur, framesCaptured: frames.length };
}

async function main(): Promise<void> {
  const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, "utf8")) as DemoScript;
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const sceneArg = getArg("--scene");
  const scenesToRecord = sceneArg ? script.scenes.filter((s) => s.id === sceneArg) : script.scenes;
  if (scenesToRecord.length === 0) {
    throw new Error(`No scene matches --scene ${sceneArg}`);
  }

  const fontCss = loadLocalFontCss();
  const logoUri = loadLogoDataUri();

  const externalUrl = (process.env.DEMO_URL || "").trim().replace(/\/+$/, "");
  const baseUrl = externalUrl || DEFAULT_FRONTEND_URL;

  let backendProc: ChildProcess | null = null;
  let frontendProc: ChildProcess | null = null;
  let browser: Browser | null = null;

  const cleanup = async (): Promise<void> => {
    try {
      await browser?.close();
    } catch {
      // ignore
    }
    for (const proc of [frontendProc, backendProc]) {
      if (proc && !proc.killed) {
        try {
          proc.kill("SIGTERM");
        } catch {
          // ignore
        }
      }
    }
    await sleep(300);
    for (const proc of [frontendProc, backendProc]) {
      if (proc && proc.exitCode === null) {
        try {
          proc.kill("SIGKILL");
        } catch {
          // ignore
        }
      }
    }
  };

  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(143);
  });

  try {
    if (!externalUrl) {
      backendProc = spawn(process.execPath, [path.join(ROOT_DIR, "demo", "demo-backend.mjs")], {
        cwd: ROOT_DIR,
        env: { ...process.env, MIQAT_DEMO_PORT: String(BACKEND_PORT) },
        stdio: ["ignore", "pipe", "pipe"],
      });
      await waitForHttpReady(`${BACKEND_URL}/auth/session`, "Demo backend");

      frontendProc = spawn(
        "npm",
        ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(FRONTEND_PORT)],
        {
          cwd: ROOT_DIR,
          env: {
            ...process.env,
            BACKEND_URL,
            NEXT_PUBLIC_BACKEND_URL: BACKEND_URL,
            MIQAT_E2E: "1",
            HOSTNAME: "127.0.0.1",
            PORT: String(FRONTEND_PORT),
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      await waitForHttpReady(`${baseUrl}/login`, "Next.js demo frontend", 90_000);

      for (const route of new Set(script.scenes.flatMap((s) => s.routes))) {
        const tok = route.startsWith("/captain") ? "demo-CAPTAIN" : "demo-ADMIN";
        await fetch(`${baseUrl}${route}`, {
          headers: { cookie: `miqat_token=${tok}; miqat_language=ar` },
        }).catch(() => {});
      }
      console.log("Pre-warmed all demo routes cleanly.");
    }

    browser = await chromium.launch({
      executablePath: CHROME_EXEC,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const contextOpts = {
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      locale: "ar-SA",
    };

    const adminContext = await browser.newContext(contextOpts);
    await authenticateContext(adminContext, baseUrl, "demo-ADMIN");
    const adminPage = await adminContext.newPage();

    const captainContext = await browser.newContext(contextOpts);
    await authenticateContext(captainContext, baseUrl, "demo-CAPTAIN");
    const captainPage = await captainContext.newPage();

    const slateContext = await browser.newContext(contextOpts);
    const slatePage = await slateContext.newPage();

    if (externalUrl && process.env.DEMO_ADMIN_EMAIL && process.env.DEMO_ADMIN_PASSWORD) {
      await adminPage.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
      await adminPage.locator('input[type="email"]').fill(process.env.DEMO_ADMIN_EMAIL);
      await adminPage.locator('input[type="password"]').fill(process.env.DEMO_ADMIN_PASSWORD);
      await adminPage.locator('button[type="submit"]').click();
      await adminPage.waitForURL("**/admin**", { timeout: 15_000 });
    }

    const timelinePath = path.join(RECORDINGS_DIR, "timeline.json");
    const existingTimeline: Record<string, SceneTimelineEntry> = fs.existsSync(timelinePath)
      ? (JSON.parse(fs.readFileSync(timelinePath, "utf8")) as { scenes: SceneTimelineEntry[] }).scenes.reduce(
          (acc, row) => ({ ...acc, [row.id]: row }),
          {},
        )
      : {};

    for (const sc of scenesToRecord) {
      const idx = script.scenes.findIndex((s) => s.id === sc.id);
      const res = await recordScene({
        scene: sc,
        sceneIdx: idx >= 0 ? idx : 0,
        totalScenes: script.scenes.length,
        adminPage,
        captainPage,
        slatePage,
        fontCss,
        logoUri,
        baseUrl,
      });
      const audioSec = (sc.durationMs ?? sc.estimatedDurationSec * 1000) / 1000;
      existingTimeline[sc.id] = {
        id: sc.id,
        titleAr: sc.titleAr,
        titleEn: sc.titleEn,
        videoFile: path.relative(ROOT_DIR, res.videoPath),
        audioFile: sc.audioFile,
        startSec: 0,
        durationSec: res.durationSec,
        audioDurationSec: audioSec,
        framesCaptured: res.framesCaptured,
      };
    }

    let cursorSec = 0;
    const orderedTimeline = script.scenes
      .map((s) => existingTimeline[s.id])
      .filter((entry): entry is SceneTimelineEntry => Boolean(entry))
      .map((entry) => {
        const row = { ...entry, startSec: Number(cursorSec.toFixed(3)) };
        cursorSec += entry.durationSec;
        return row;
      });

    fs.writeFileSync(
      timelinePath,
      JSON.stringify({ totalDurationSec: Number(cursorSec.toFixed(3)), scenes: orderedTimeline }, null, 2) + "\n",
    );
    console.log(`\nDEMO RECORDING COMPLETE! Total recorded timeline: ${cursorSec.toFixed(2)}s`);
  } finally {
    await cleanup();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
