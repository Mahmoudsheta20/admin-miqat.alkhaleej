import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");
const SCRIPT_PATH = path.join(ROOT_DIR, "demo", "v3", "script.json");
const AUDIO_DIR = path.join(ROOT_DIR, "demo", "v3", "audio");

const CANDIDATE_VOICES = [
  { id: "cFUFIbKkO2iZFwS8cRnY", label: "Nasser AlJubaily - Authentic Saudi Pro" },
  { id: "MI88rOZjXbH22N8KHXUo", label: "Ali - Calm & Deep Arabic Saudi Narrator" },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George - Warm Storyteller (Premade)" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel - Steady Broadcaster (Premade)" },
];

function loadProjectEnv() {
  try {
    process.loadEnvFile(path.join(ROOT_DIR, ".env.local"));
  } catch {
    // .env.local optional when ELEVENLABS_API_KEY is already set in environment
  }
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return "";
}

function ffprobeDurationMs(filePath) {
  const raw = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8" },
  ).trim();
  const sec = Number(raw);
  if (!Number.isFinite(sec) || sec <= 0) {
    throw new Error(`Invalid duration from ffprobe for ${filePath}: ${raw}`);
  }
  return Math.round(sec * 1000);
}

async function streamToFile(webStream, outPath) {
  const nodeStream = Readable.fromWeb(webStream);
  await pipeline(nodeStream, fs.createWriteStream(outPath));
  if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 1000) {
    throw new Error(`Generated audio file is unexpectedly small: ${outPath}`);
  }
}

function isPaidVoiceRejection(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("402") || msg.includes("paid_plan_required") || msg.includes("library voices");
}

function isModelRejection(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("422") || msg.includes("model_not_found");
}

async function convertSceneWithElevenLabs({ client, voiceId, modelId, scene, prevScene, nextScene, outPath, settings }) {
  const voiceSettings = {
    stability: settings.stability ?? 0.64,
    similarityBoost: settings.similarityBoost ?? 0.78,
    useSpeakerBoost: settings.useSpeakerBoost ?? true,
  };
  if (settings.speed !== undefined && settings.speed !== 1) {
    voiceSettings.speed = settings.speed;
  }
  const payload = {
    text: scene.ttsAr || scene.narrationAr,
    modelId,
    outputFormat: settings.outputFormat || "mp3_44100_128",
    voiceSettings,
  };
  if (modelId !== "eleven_multilingual_v2") {
    payload.languageCode = settings.languageCode || "ar";
  }
  if (prevScene) payload.previousText = prevScene.ttsAr || prevScene.narrationAr;
  if (nextScene) payload.nextText = nextScene.ttsAr || nextScene.narrationAr;

  const audioStream = await client.textToSpeech.convert(voiceId, payload);
  await streamToFile(audioStream, outPath);
}

async function main() {
  loadProjectEnv();
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const force = process.argv.includes("--force");
  const sceneArg = getArg("--scene");
  const voiceArg = getArg("--voice") || (process.env.ELEVENLABS_VOICE_ID || "").trim();

  if (!(process.env.ELEVENLABS_API_KEY || "").trim()) {
    throw new Error(
      "ELEVENLABS_API_KEY missing. Run `npx -y @elevenlabs/cli@latest onboard connect --env-path .env.local`.",
    );
  }

  const client = new ElevenLabsClient();
  const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, "utf8"));
  const scenes = script.scenes;
  const targets = sceneArg ? scenes.filter((s) => s.id === sceneArg) : scenes;
  if (targets.length === 0) {
    throw new Error(`No matching scenes found for filter: ${sceneArg}`);
  }

  let activeVoiceId = voiceArg;
  let activeModelId = process.env.ELEVENLABS_MODEL_ID || script.meta.elevenlabs?.modelId || "eleven_v4";

  for (let i = 0; i < targets.length; i++) {
    const scene = targets[i];
    const sceneIndex = scenes.findIndex((s) => s.id === scene.id);
    const prevScene = sceneIndex > 0 ? scenes[sceneIndex - 1] : null;
    const nextScene = sceneIndex >= 0 && sceneIndex < scenes.length - 1 ? scenes[sceneIndex + 1] : null;
    const outPath = path.join(ROOT_DIR, scene.audioFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    if (force || !fs.existsSync(outPath) || fs.statSync(outPath).size < 1000) {
      const candidates = voiceArg
        ? [{ id: voiceArg, label: "Requested Voice" }]
        : activeVoiceId
          ? [{ id: activeVoiceId, label: "Resolved Voice" }]
          : CANDIDATE_VOICES;

      let synthesized = false;
      let lastErr = null;
      for (const cand of candidates) {
        try {
          await convertSceneWithElevenLabs({
            client,
            voiceId: cand.id,
            modelId: activeModelId,
            scene,
            prevScene,
            nextScene,
            outPath,
            settings: script.meta.elevenlabs || {},
          });
          activeVoiceId = cand.id;
          synthesized = true;
          if (i === 0) {
            console.log(`TTS Engine: ElevenLabs (${activeModelId}, voice=${cand.id} [${cand.label}])`);
          }
          break;
        } catch (err) {
          lastErr = err;
          if (isPaidVoiceRejection(err) && candidates.length > 1) {
            console.log(`Skipped ${cand.label} (${cand.id}) — requires Paid tier for Voice Library access.`);
            continue;
          }
          if (isModelRejection(err) && activeModelId === "eleven_v4") {
            console.log(`Retrying ${cand.id} with eleven_multilingual_v2 fallback...`);
            activeModelId = "eleven_multilingual_v2";
            await convertSceneWithElevenLabs({
              client,
              voiceId: cand.id,
              modelId: activeModelId,
              scene,
              prevScene,
              nextScene,
              outPath,
              settings: script.meta.elevenlabs || {},
            });
            activeVoiceId = cand.id;
            synthesized = true;
            break;
          }
          throw err;
        }
      }
      if (!synthesized) throw lastErr || new Error("Failed to synthesize audio with candidate voices.");
    }

    const durMs = ffprobeDurationMs(outPath);
    scene.durationMs = durMs;
    console.log(`Audio ready ${scene.id}: ${(durMs / 1000).toFixed(2)}s -> ${scene.audioFile}`);
  }

  script.meta.ttsEngine = "elevenlabs";
  script.meta.modelId = activeModelId;
  if (activeVoiceId) script.meta.voiceId = activeVoiceId;
  script.meta.measuredTotalDurationSec = Number(
    (script.scenes.reduce((acc, s) => acc + (s.durationMs || s.estimatedDurationSec * 1000), 0) / 1000).toFixed(2),
  );

  fs.writeFileSync(SCRIPT_PATH, JSON.stringify(script, null, 2) + "\n");
  console.log(`\nUpdated ${SCRIPT_PATH} (total spoken audio: ${script.meta.measuredTotalDurationSec}s).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
