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
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const SCRIPT_PATH = path.join(ROOT_DIR, "demo", "v3", "script.json");
const RECORDINGS_DIR = path.join(ROOT_DIR, "demo", "v3", "recordings");
const ASSETS_DIR = path.join(RECORDINGS_DIR, "_assets");
const FRAMES_DIR = path.join(RECORDINGS_DIR, "_frames");

const BACKEND_PORT = 5129;
const FRONTEND_PORT = 3429;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const BASE_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

const APP_VIEWPORT_W = 1728;
const APP_VIEWPORT_H = 972;
const SCENE_OVERLAP_SEC = 0.65;

const CHROME_EXEC =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

interface UiAction {
  action:
    | "goto"
    | "pause"
    | "zoomFocus"
    | "glideHover"
    | "glideClick"
    | "typeSlow"
    | "smoothScroll"
    | "pressKey"
    | "switchContext";
  target?: string;
  role?: "ADMIN" | "CAPTAIN";
  y?: number;
  durationMs?: number;
  holdMs?: number;
  scale?: number;
  value?: string;
  key?: string;
}

interface DemoScene {
  id: string;
  chapterNum: string;
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

export interface ZoomWindow {
  fx: number;
  fy: number;
  scale: number;
  startSec: number;
  endSec: number;
}

export interface SceneTimelineEntry {
  id: string;
  chapterNum: string;
  titleAr: string;
  titleEn: string;
  videoFile: string;
  audioFile: string;
  durationSec: number;
  audioDurationSec: number;
  framesCaptured: number;
  zoom: ZoomWindow;
}

interface CapturedFrame {
  file: string;
  tMs: number;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const clamp = (val: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, val));

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
    ["Inter", 500, "inter-latin-500-normal.woff2"],
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

function buildStudioFrameHtml(fontCss: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
${fontCss}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: #ECEAE4;
  font-family: 'Inter', 'IBM Plex Sans Arabic', sans-serif;
}
.window {
  position: absolute;
  left: 95px;
  top: 31px;
  width: 1730px;
  height: 1008px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: #FFFFFF;
  box-shadow:
    0 24px 60px -16px rgba(15, 23, 42, 0.16),
    0 4px 16px -4px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}
.titlebar {
  position: relative;
  height: 34px;
  width: 100%;
  background: #F8F7F4;
  border-bottom: 1px solid rgba(15, 23, 42, 0.07);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dots {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 7px;
  direction: ltr;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #D6D3CB;
}
.url {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #64748B;
  letter-spacing: 0.01em;
  direction: ltr;
}
</style>
</head>
<body>
  <div class="window">
    <div class="titlebar">
      <div class="dots" aria-hidden="true">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      <div class="url">admin.miqat.alkhaleej</div>
    </div>
  </div>
</body>
</html>`;
}

function buildWindowMaskHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1728px;
  height: 972px;
  overflow: hidden;
  background: #000000;
}
.mask {
  width: 1728px;
  height: 972px;
  background: #FFFFFF;
  border-radius: 0 0 12px 12px;
}
</style>
</head>
<body><div class="mask"></div></body>
</html>`;
}

function buildChapterLabelHtml(fontCss: string, chapterNum: string, titleAr: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
${fontCss}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: transparent;
  font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
}
.card {
  position: fixed;
  right: 112px;
  bottom: 56px;
  background: #FFFFFF;
  border: 1px solid #E2E0D9;
  border-radius: 10px;
  padding: 12px 18px;
  box-shadow: 0 10px 28px -8px rgba(15, 23, 42, 0.14);
  display: inline-flex;
  align-items: center;
  gap: 14px;
}
.bar {
  width: 2.5px;
  height: 24px;
  border-radius: 2px;
  background: #9A620B;
}
.num {
  font-family: 'Inter', sans-serif;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 600;
  color: #9A620B;
  letter-spacing: 0.04em;
}
.sep {
  width: 1px;
  height: 18px;
  background: #E2E0D9;
}
.title {
  font-size: 16px;
  font-weight: 600;
  color: #0F172A;
  line-height: 1.3;
}
</style>
</head>
<body>
  <div class="card">
    <span class="bar"></span>
    <span class="num">${chapterNum}</span>
    <span class="sep"></span>
    <span class="title">${titleAr}</span>
  </div>
</body>
</html>`;
}

function buildEditorialSlateHtml(mode: "intro" | "outro", fontCss: string, logoUri: string): string {
  const isIntro = mode === "intro";
  const eyebrow = isIntro ? "MIQAT AL-KHALEEJ · ENTERPRISE SUITE" : "شركة ميقات الخليج للنقل والخدمات";
  const heading = isIntro
    ? "منظومة ميقات الخليج — الإدارة الشاملة"
    : "ميقات الخليج — تحكّم كامل بأسطولك وماليتك";
  const sub = isIntro
    ? "الأسطول والعقود · بوابة الكابتن · الفوترة والمحاسبة · ومركز التصدير الموحد"
    : "المملكة العربية السعودية · منصة إدارة الأسطول والفوترة الإلكترونية";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
${fontCss}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: #F6F4EF;
  color: #0F172A;
  font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stage {
  width: 1180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.logo {
  width: 126px;
  height: auto;
  object-fit: contain;
  margin-bottom: 22px;
  will-change: opacity, transform;
}
.eyebrow {
  font-family: '${isIntro ? "Inter" : "IBM Plex Sans Arabic"}', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: ${isIntro ? "0.18em" : "0"};
  color: #64748B;
  margin-bottom: 18px;
  will-change: opacity, transform;
}
h1 {
  font-size: ${isIntro ? "56px" : "48px"};
  font-weight: 700;
  color: #0F172A;
  line-height: 1.3;
  margin-bottom: 24px;
  will-change: opacity, transform;
}
.rule-wrap {
  width: 64px;
  height: 2px;
  overflow: hidden;
  margin-bottom: 22px;
}
.rule {
  width: 64px;
  height: 2px;
  background: #9A620B;
  transform-origin: right center;
  transform: scaleX(0);
}
.sub {
  font-size: 22px;
  font-weight: 400;
  color: #475569;
  line-height: 1.6;
  will-change: opacity, transform;
}
</style>
</head>
<body>
  <div class="stage">
    <img id="el-logo" class="logo" src="${logoUri}" alt="Miqat Logo" />
    <div id="el-eyebrow" class="eyebrow">${eyebrow}</div>
    <h1 id="el-h1">${heading}</h1>
    <div class="rule-wrap"><div id="el-rule" class="rule"></div></div>
    <div id="el-sub" class="sub">${sub}</div>
  </div>
  <script>
    window.__setSlateTime = function(sec) {
      var ease = function(p) {
        var c = Math.min(1, Math.max(0, p));
        return 1 - Math.pow(1 - c, 3);
      };
      var anim = function(el, t0, dur, yPx) {
        if (!el) return;
        var e = ease((sec - t0) / dur);
        el.style.opacity = String(e);
        el.style.transform = "translateY(" + ((1 - e) * yPx).toFixed(2) + "px)";
      };
      anim(document.getElementById("el-logo"), 0.05, 0.45, 8);
      anim(document.getElementById("el-eyebrow"), 0.14, 0.45, 8);
      anim(document.getElementById("el-h1"), 0.24, 0.50, 10);
      var r = document.getElementById("el-rule");
      if (r) {
        var re = ease((sec - 0.36) / 0.55);
        r.style.transform = "scaleX(" + re.toFixed(4) + ")";
      }
      anim(document.getElementById("el-sub"), 0.46, 0.50, 8);
    };
  </script>
</body>
</html>`;
}

async function renderEditorialAssets(args: {
  browser: Browser;
  scenes: DemoScene[];
  fontCss: string;
  logoUri: string;
}): Promise<void> {
  const { browser, scenes, fontCss, logoUri } = args;
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const ctxFrame = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const pgFrame = await ctxFrame.newPage();

  await pgFrame.setContent(buildStudioFrameHtml(fontCss), { waitUntil: "load" });
  await pgFrame.evaluate(() => document.fonts.ready);
  await pgFrame.screenshot({ path: path.join(ASSETS_DIR, "studio_frame.png"), type: "png" });

  for (const sc of scenes) {
    await pgFrame.setContent(buildChapterLabelHtml(fontCss, sc.chapterNum, sc.titleAr), { waitUntil: "load" });
    await pgFrame.evaluate(() => document.fonts.ready);
    await pgFrame.screenshot({
      path: path.join(ASSETS_DIR, `chapter_${sc.id}.png`),
      type: "png",
      omitBackground: true,
    });
  }

  const slates: Array<{ name: "intro" | "outro"; durSec: number }> = [
    { name: "intro", durSec: 2.6 },
    { name: "outro", durSec: 3.2 },
  ];
  for (const sl of slates) {
    const tmpFramesDir = path.join(FRAMES_DIR, `_${sl.name}`);
    fs.rmSync(tmpFramesDir, { recursive: true, force: true });
    fs.mkdirSync(tmpFramesDir, { recursive: true });

    await pgFrame.setContent(buildEditorialSlateHtml(sl.name, fontCss, logoUri), { waitUntil: "load" });
    await pgFrame.evaluate(() => document.fonts.ready);

    const totalFrames = Math.round(sl.durSec * 30);
    for (let f = 0; f < totalFrames; f++) {
      const tSec = f / 30;
      await pgFrame.evaluate((sec) => {
        const win = window as unknown as { __setSlateTime?: (s: number) => void };
        win.__setSlateTime?.(sec);
      }, tSec);
      await pgFrame.screenshot({
        path: path.join(tmpFramesDir, `f${String(f).padStart(4, "0")}.png`),
        type: "png",
      });
    }

    const outMp4 = path.join(ASSETS_DIR, `${sl.name}.mp4`);
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-framerate",
        "30",
        "-i",
        path.join(tmpFramesDir, "f%04d.png"),
        "-vf",
        "scale=1920:1080:in_range=full:out_range=tv,setsar=1,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "17",
        "-color_range",
        "tv",
        "-colorspace",
        "bt709",
        "-color_primaries",
        "bt709",
        "-color_trc",
        "bt709",
        "-t",
        sl.durSec.toFixed(3),
        outMp4,
      ],
      { stdio: "pipe" },
    );
    fs.rmSync(tmpFramesDir, { recursive: true, force: true });
    console.log(`Rendered editorial ${sl.name}.mp4 (${sl.durSec}s)`);
  }

  await ctxFrame.close();

  const ctxMask = await browser.newContext({
    viewport: { width: APP_VIEWPORT_W, height: APP_VIEWPORT_H },
    deviceScaleFactor: 1,
  });
  const pgMask = await ctxMask.newPage();
  await pgMask.setContent(buildWindowMaskHtml(), { waitUntil: "load" });
  await pgMask.screenshot({ path: path.join(ASSETS_DIR, "window_mask.png"), type: "png" });
  await ctxMask.close();
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

const MACOS_POINTER_INIT_SCRIPT = (): void => {
  if (typeof window === "undefined") return;
  const win = window as unknown as {
    __v3Cursor?: { x: number; y: number };
    __syncV3Cursor?: () => void;
  };
  win.__v3Cursor = win.__v3Cursor || { x: 864, y: 486 };
  win.__syncV3Cursor = () => {
    if (!document.body) return;
    let style = document.getElementById("__v3_cursor_style");
    if (!style) {
      style = document.createElement("style");
      style.id = "__v3_cursor_style";
      style.textContent = `
        @keyframes __v3Ripple {
          0% { opacity: 0.9; transform: translate(-50%, -50%) scale(0.45); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
        }
        #__v3_cursor {
          position: fixed;
          z-index: 2147483647;
          pointer-events: none;
          width: 22px;
          height: 22px;
          transform: translate(-3px, -2px);
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.28));
        }
        #__v3_ripple {
          position: fixed;
          z-index: 2147483646;
          pointer-events: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1.5px solid rgba(15, 23, 42, 0.28);
          background: rgba(15, 23, 42, 0.08);
          opacity: 0;
        }
        #__v3_ripple.pop {
          animation: __v3Ripple 0.24s ease-out forwards;
        }
      `;
      document.head.appendChild(style);
    }

    let cursor = document.getElementById("__v3_cursor");
    if (!cursor) {
      cursor = document.createElement("div");
      cursor.id = "__v3_cursor";
      cursor.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 3 L5 19 L9.4 14.8 L12.6 21 L15 19.8 L11.8 13.6 L17.6 13.6 Z" fill="#0F172A" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
      document.body.appendChild(cursor);
    }
    if (win.__v3Cursor) {
      cursor.style.left = `${win.__v3Cursor.x}px`;
      cursor.style.top = `${win.__v3Cursor.y}px`;
    }

    if (!document.getElementById("__v3_ripple")) {
      const rp = document.createElement("div");
      rp.id = "__v3_ripple";
      document.body.appendChild(rp);
    }
  };
  window.addEventListener("DOMContentLoaded", () => win.__syncV3Cursor?.());
  setInterval(() => {
    if (!document.getElementById("__v3_cursor")) win.__syncV3Cursor?.();
  }, 150);
};

async function glideMouse(page: Page, tx: number, ty: number, steps = 14): Promise<void> {
  await page
    .evaluate(
      async ({ targetX, targetY, totalSteps }) => {
        const win = window as unknown as { __v3Cursor?: { x: number; y: number } };
        const st = win.__v3Cursor || { x: 864, y: 486 };
        const sx = Number(st.x);
        const sy = Number(st.y);
        const el = document.getElementById("__v3_cursor");
        for (let i = 1; i <= totalSteps; i++) {
          const p = i / totalSteps;
          const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
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
      await loc.waitFor({ state: "visible", timeout: 1400 });
      return loc;
    } catch {
      // try next fallback selector
    }
  }
  return null;
}

async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page
    .waitForFunction(() => document.querySelectorAll(".loading-spinner").length === 0, { timeout: 2200 })
    .catch(() => {});
  await sleep(140);
}

async function ensureRoute(page: Page, routePath: string): Promise<void> {
  const currentPath = (() => {
    try {
      const u = new URL(page.url());
      return `${u.pathname}${u.search}`;
    } catch {
      return "";
    }
  })();
  if (currentPath !== routePath) {
    await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await waitForAppReady(page);
    await sleep(140);
  }
  if (page.url().includes("/login")) {
    throw new Error(`Authentication lost on ${routePath} (redirected to ${page.url()})`);
  }
}

async function glideClick(page: Page, selectorCsv: string, holdMs = 450): Promise<boolean> {
  const loc = await resolveFirstVisible(page, selectorCsv);
  if (!loc) {
    console.warn(`  [warn] selector not visible: ${selectorCsv}`);
    return false;
  }
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
        const rp = document.getElementById("__v3_ripple");
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
  await loc.click({ timeout: 2000 }).catch(() => {});
  await waitForAppReady(page);
  await sleep(holdMs);
  return true;
}

async function glideHover(page: Page, selectorCsv: string, holdMs = 550): Promise<boolean> {
  const loc = await resolveFirstVisible(page, selectorCsv);
  if (!loc) {
    console.warn(`  [warn] hover selector not visible: ${selectorCsv}`);
    return false;
  }
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(80);
  const box = await loc.boundingBox().catch(() => null);
  if (!box) return false;
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  await glideMouse(page, cx, cy);
  await loc.hover().catch(() => {});
  await sleep(holdMs);
  return true;
}

async function smoothScroll(page: Page, targetY: number, durationMs = 700): Promise<void> {
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

async function authenticateContext(context: BrowserContext, token: string): Promise<void> {
  await context.addCookies([
    { name: "miqat_token", value: token, url: BASE_URL, httpOnly: true, sameSite: "Lax" },
    { name: "miqat_language", value: "ar", url: BASE_URL, sameSite: "Lax" },
  ]);
  await context.addInitScript(() => {
    localStorage.setItem("miqat_language", "ar");
    localStorage.setItem("miqat_theme", "light");
  });
  await context.addInitScript(MACOS_POINTER_INIT_SCRIPT);
}

async function recordScene(args: {
  scene: DemoScene;
  adminPage: Page;
  captainPage: Page;
}): Promise<{ videoPath: string; durationSec: number; framesCaptured: number; zoom: ZoomWindow }> {
  const { scene, adminPage, captainPage } = args;
  const targetSec = (scene.durationMs ?? scene.estimatedDurationSec * 1000) / 1000 + SCENE_OVERLAP_SEC;
  const scFramesDir = path.join(FRAMES_DIR, scene.id);
  fs.rmSync(scFramesDir, { recursive: true, force: true });
  fs.mkdirSync(scFramesDir, { recursive: true });

  const initialRoute = scene.routes[0] || "/admin";
  let activePage: Page = initialRoute.startsWith("/captain") ? captainPage : adminPage;
  await ensureRoute(activePage, initialRoute);

  let cdp: CDPSession | null = null;
  let capturing = true;
  let seq = 0;
  let lastFrameAt = 0;
  let snapBusy = false;
  const frames: CapturedFrame[] = [];
  const startWall = Date.now();

  let zoomWindow: ZoomWindow = {
    fx: 0.43,
    fy: 0.42,
    scale: 1.13,
    startSec: Math.min(2.2, targetSec * 0.2),
    endSec: Math.max(3.5, targetSec - 2.0),
  };

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

  const captureSingleFrame = async (): Promise<void> => {
    const buf = await activePage.screenshot({ type: "jpeg", quality: 92 }).catch(() => null);
    if (buf && capturing) {
      const file = `f${String(seq++).padStart(6, "0")}.jpg`;
      fs.writeFileSync(path.join(scFramesDir, file), buf);
      frames.push({ file, tMs: Date.now() - startWall });
      lastFrameAt = Date.now();
    }
  };

  const attachCdp = async (pg: Page): Promise<void> => {
    activePage = pg;
    await pg.bringToFront().catch(() => {});
    await captureSingleFrame();
    cdp = await pg.context().newCDPSession(pg);
    cdp.on("Page.screencastFrame", onFrame);
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 92,
      maxWidth: APP_VIEWPORT_W,
      maxHeight: APP_VIEWPORT_H,
      everyNthFrame: 1,
    });
  };

  const detachCdp = async (): Promise<void> => {
    if (!cdp) return;
    cdp.off("Page.screencastFrame", onFrame);
    await cdp.send("Page.stopScreencast").catch(() => {});
    await cdp.detach().catch(() => {});
    cdp = null;
  };

  await attachCdp(activePage);

  const heartbeat = setInterval(async () => {
    if (!capturing || snapBusy) return;
    if (Date.now() - lastFrameAt > 180) {
      snapBusy = true;
      try {
        await captureSingleFrame();
      } finally {
        snapBusy = false;
      }
    }
  }, 120);

  try {
    for (const act of scene.uiActions) {
      if (act.action === "goto" && act.target) {
        await ensureRoute(activePage, act.target);
      } else if (act.action === "switchContext") {
        const nextPage = act.role === "CAPTAIN" ? captainPage : adminPage;
        await ensureRoute(nextPage, act.target || (act.role === "CAPTAIN" ? "/captain" : "/admin"));
        await detachCdp();
        await attachCdp(nextPage);
      } else if (act.action === "pause") {
        await sleep(act.durationMs ?? 500);
      } else if (act.action === "zoomFocus") {
        const startSec = Number(((Date.now() - startWall) / 1000).toFixed(2));
        const durSec = (act.durationMs ?? 4200) / 1000;
        let fx = 0.43;
        let fy = 0.42;
        if (act.target) {
          const loc = await resolveFirstVisible(activePage, act.target);
          if (loc) {
            await loc.scrollIntoViewIfNeeded().catch(() => {});
            await sleep(80);
            const box = await loc.boundingBox().catch(() => null);
            if (box) {
              fx = clamp(Number(((box.x + box.width / 2) / APP_VIEWPORT_W).toFixed(3)), 0.26, 0.74);
              fy = clamp(Number(((box.y + box.height / 2) / APP_VIEWPORT_H).toFixed(3)), 0.24, 0.76);
            }
          }
        }
        zoomWindow = {
          fx,
          fy,
          scale: act.scale ?? 1.13,
          startSec,
          endSec: Number(Math.min(targetSec - 0.55, startSec + durSec).toFixed(2)),
        };
        await sleep(act.holdMs ?? 450);
      } else if (act.action === "glideClick" && act.target) {
        await glideClick(activePage, act.target, act.holdMs ?? 450);
      } else if (act.action === "glideHover" && act.target) {
        await glideHover(activePage, act.target, act.holdMs ?? 550);
      } else if (act.action === "typeSlow" && act.target && act.value !== undefined) {
        const loc = await resolveFirstVisible(activePage, act.target);
        if (loc) {
          await glideClick(activePage, act.target, 140);
          await loc.fill("");
          await loc.pressSequentially(act.value, { delay: 48 });
          await sleep(450);
        } else {
          console.warn(`  [warn] typeSlow selector not visible: ${act.target}`);
        }
      } else if (act.action === "smoothScroll") {
        await smoothScroll(activePage, act.y ?? 300, act.durationMs ?? 700);
        await sleep(act.holdMs ?? 300);
      } else if (act.action === "pressKey" && act.key) {
        await activePage.keyboard.press(act.key).catch(() => {});
        await sleep(260);
      }
    }

    const remMs = targetSec * 1000 - (Date.now() - startWall) - 35;
    if (remMs > 20) await sleep(remMs);
  } finally {
    clearInterval(heartbeat);
    await captureSingleFrame();
    capturing = false;
    await detachCdp();
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
      `fps=30,scale=${APP_VIEWPORT_W}:${APP_VIEWPORT_H}:in_range=full:out_range=tv,setsar=1,format=yuv420p`,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "16",
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
    `Recorded ${scene.id}: frames=${frames.length}, wall=${actualSec.toFixed(2)}s -> mp4=${probeDur.toFixed(3)}s (target=${targetSec.toFixed(3)}s), zoom=(${zoomWindow.fx},${zoomWindow.fy} ${zoomWindow.startSec}s..${zoomWindow.endSec}s)`,
  );

  return { videoPath: outMp4, durationSec: probeDur, framesCaptured: frames.length, zoom: zoomWindow };
}

async function main(): Promise<void> {
  const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, "utf8")) as DemoScript;
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const sceneArg = getArg("--scene");
  const assetsOnly = process.argv.includes("--assets-only");
  const scenesToRecord = sceneArg ? script.scenes.filter((s) => s.id === sceneArg) : script.scenes;
  if (scenesToRecord.length === 0) {
    throw new Error(`No scene matches --scene ${sceneArg}`);
  }

  const fontCss = loadLocalFontCss();
  const logoUri = loadLogoDataUri();

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
    if (!assetsOnly) {
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
      await waitForHttpReady(`${BASE_URL}/login`, "Next.js demo frontend", 90_000);

      for (const route of new Set(script.scenes.flatMap((s) => s.routes))) {
        const tok = route.startsWith("/captain") ? "demo-CAPTAIN" : "demo-ADMIN";
        await fetch(`${BASE_URL}${route}`, {
          headers: { cookie: `miqat_token=${tok}; miqat_language=ar` },
        }).catch(() => {});
      }
      console.log("Pre-warmed all v3 system routes cleanly.");
    }

    browser = await chromium.launch({
      executablePath: CHROME_EXEC,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    await renderEditorialAssets({
      browser,
      scenes: script.scenes,
      fontCss,
      logoUri,
    });

    if (assetsOnly) {
      console.log("Editorial studio assets generated.");
      return;
    }

    const contextOpts = {
      viewport: { width: APP_VIEWPORT_W, height: APP_VIEWPORT_H },
      deviceScaleFactor: 1,
      locale: "ar-SA",
    };

    const adminContext = await browser.newContext(contextOpts);
    await authenticateContext(adminContext, "demo-ADMIN");
    const adminPage = await adminContext.newPage();

    const captainContext = await browser.newContext(contextOpts);
    await authenticateContext(captainContext, "demo-CAPTAIN");
    const captainPage = await captainContext.newPage();

    const timelinePath = path.join(RECORDINGS_DIR, "timeline.json");
    const existingTimeline: Record<string, SceneTimelineEntry> = fs.existsSync(timelinePath)
      ? (JSON.parse(fs.readFileSync(timelinePath, "utf8")) as { scenes: SceneTimelineEntry[] }).scenes.reduce(
          (acc, row) => ({ ...acc, [row.id]: row }),
          {},
        )
      : {};

    for (const sc of scenesToRecord) {
      const res = await recordScene({ scene: sc, adminPage, captainPage });
      const audioSec = (sc.durationMs ?? sc.estimatedDurationSec * 1000) / 1000;
      existingTimeline[sc.id] = {
        id: sc.id,
        chapterNum: sc.chapterNum,
        titleAr: sc.titleAr,
        titleEn: sc.titleEn,
        videoFile: path.relative(ROOT_DIR, res.videoPath),
        audioFile: sc.audioFile,
        durationSec: res.durationSec,
        audioDurationSec: audioSec,
        framesCaptured: res.framesCaptured,
        zoom: res.zoom,
      };
    }

    const orderedScenes = script.scenes
      .map((s) => existingTimeline[s.id])
      .filter((entry): entry is SceneTimelineEntry => Boolean(entry));

    fs.writeFileSync(
      timelinePath,
      JSON.stringify(
        {
          overlapSec: SCENE_OVERLAP_SEC,
          crossfadeSec: 0.35,
          introSec: 2.6,
          outroSec: 3.2,
          scenes: orderedScenes,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(`\nV3 RECORDING COMPLETE! Scenes recorded: ${orderedScenes.length}`);
  } finally {
    await cleanup();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
