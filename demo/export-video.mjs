import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const SCRIPT_PATH = path.join(ROOT_DIR, "demo", "script.json");
const RECORDINGS_DIR = path.join(ROOT_DIR, "demo", "recordings");
const OUT_DIR = path.join(ROOT_DIR, "output");
const FINAL_VIDEO = path.join(OUT_DIR, "system-demo-sa.mp4");
const FINAL_SRT_AR = path.join(OUT_DIR, "subtitles.srt");
const FINAL_SRT_EN = path.join(OUT_DIR, "subtitles-en.srt");

function ffprobeInfo(filePath) {
  const raw = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,pix_fmt,color_range,r_frame_rate,sample_rate,channels",
      "-of",
      "json",
      filePath,
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(raw);
}

function buildWarmPadWav(durationSec, outPath, fadeInSec, fadeOutSec, peakVol = 0.04) {
  const d = Math.max(1.2, durationSec).toFixed(3);
  const fadeOutStart = Math.max(0.2, durationSec - fadeOutSec).toFixed(3);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-t",
      d,
      "-i",
      "aevalsrc=0.35*sin(2*PI*130.81*t)+0.28*sin(2*PI*196.00*t)+0.20*sin(2*PI*293.66*t)+0.17*sin(2*PI*329.63*t):s=48000:c=stereo",
      "-af",
      `lowpass=f=900,volume=${peakVol},afade=t=in:st=0:d=${fadeInSec.toFixed(2)},afade=t=out:st=${fadeOutStart}:d=${fadeOutSec.toFixed(2)}`,
      "-ar",
      "48000",
      "-ac",
      "2",
      "-c:a",
      "pcm_s16le",
      outPath,
    ],
    { stdio: "pipe" },
  );
}

function formatSrtTime(sec) {
  const msTotal = Math.max(0, Math.round(sec * 1000));
  const ms = msTotal % 1000;
  const totalSec = Math.floor(msTotal / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function formatMmSs(sec) {
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, "utf8"));
  const scenes = script.scenes;

  const prepDir = path.join(RECORDINGS_DIR, "_mastered_audio");
  fs.mkdirSync(prepDir, { recursive: true });

  const ffInputs = [];
  const filterParts = [];
  const concatPairs = [];
  const arSrt = [];
  const enSrt = [];
  const breakdown = [];

  let cursor = 0;

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const videoIn = path.join(RECORDINGS_DIR, `${sc.id}.mp4`);
    const audioIn = path.join(ROOT_DIR, sc.audioFile);

    if (!fs.existsSync(videoIn)) {
      throw new Error(`Missing recorded scene video: ${videoIn}`);
    }
    if (!fs.existsSync(audioIn)) {
      throw new Error(`Missing synthesized scene audio: ${audioIn}`);
    }

    const vDur = Number(ffprobeInfo(videoIn).format?.duration || 0);
    const aDur = Number(ffprobeInfo(audioIn).format?.duration || 0);
    const targetDur = aDur + 0.4;

    const cleanVoiceWav = path.join(prepDir, `${sc.id}_voice.wav`);
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        audioIn,
        "-af",
        `highpass=f=75,acompressor=threshold=-20dB:ratio=2.4:attack=10:release=120,loudnorm=I=-16:TP=-1.5:LRA=9,aformat=sample_rates=48000:channel_layouts=stereo,apad=whole_dur=${targetDur.toFixed(3)},atrim=0:${targetDur.toFixed(3)}`,
        "-ar",
        "48000",
        "-ac",
        "2",
        "-c:a",
        "pcm_s16le",
        cleanVoiceWav,
      ],
      { stdio: "pipe" },
    );

    let finalSceneWav = cleanVoiceWav;
    if (i === 0) {
      const introPad = path.join(prepDir, "_intro_pad.wav");
      const mixed = path.join(prepDir, `${sc.id}.wav`);
      buildWarmPadWav(3.2, introPad, 0.3, 1.4, 0.042);
      execFileSync(
        "ffmpeg",
        [
          "-y",
          "-i",
          cleanVoiceWav,
          "-i",
          introPad,
          "-filter_complex",
          `[0:a]aformat=sample_rates=48000:channel_layouts=stereo[v];[1:a]aformat=sample_rates=48000:channel_layouts=stereo,apad=whole_dur=${targetDur.toFixed(3)},atrim=0:${targetDur.toFixed(3)}[p];[v][p]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[out]`,
          "-map",
          "[out]",
          "-ar",
          "48000",
          "-ac",
          "2",
          "-c:a",
          "pcm_s16le",
          mixed,
        ],
        { stdio: "pipe" },
      );
      finalSceneWav = mixed;
    } else if (i === scenes.length - 1) {
      const tailPadDur = Math.min(4.2, Math.max(2.0, targetDur * 0.45));
      const outroPad = path.join(prepDir, "_outro_pad.wav");
      const mixed = path.join(prepDir, `${sc.id}.wav`);
      const delayMs = Math.max(0, Math.round((targetDur - tailPadDur) * 1000));
      buildWarmPadWav(tailPadDur, outroPad, 1.0, 1.2, 0.04);
      execFileSync(
        "ffmpeg",
        [
          "-y",
          "-i",
          cleanVoiceWav,
          "-i",
          outroPad,
          "-filter_complex",
          `[0:a]aformat=sample_rates=48000:channel_layouts=stereo[v];[1:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${delayMs}|${delayMs},apad=whole_dur=${targetDur.toFixed(3)},atrim=0:${targetDur.toFixed(3)}[p];[v][p]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[out]`,
          "-map",
          "[out]",
          "-ar",
          "48000",
          "-ac",
          "2",
          "-c:a",
          "pcm_s16le",
          mixed,
        ],
        { stdio: "pipe" },
      );
      finalSceneWav = mixed;
    }

    const vIdx = i * 2;
    const aIdx = i * 2 + 1;
    ffInputs.push("-i", videoIn, "-i", finalSceneWav);

    const ptsScale = vDur > 0 ? targetDur / vDur : 1.0;
    filterParts.push(
      `[${vIdx}:v]setpts=PTS-STARTPTS,setpts=(${ptsScale.toFixed(6)})*PTS,fps=30,scale=1920:1080:in_range=full:out_range=tv,setsar=1,tpad=stop_mode=clone:stop_duration=0.5,trim=0:${targetDur.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`,
    );
    filterParts.push(
      `[${aIdx}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${targetDur.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`,
    );
    concatPairs.push(`[v${i}][a${i}]`);

    const cueStart = cursor + 0.08;
    const cueEnd = cursor + Math.max(0.5, aDur);
    arSrt.push(`${i + 1}\n${formatSrtTime(cueStart)} --> ${formatSrtTime(cueEnd)}\n${sc.narrationAr}\n`);
    enSrt.push(`${i + 1}\n${formatSrtTime(cueStart)} --> ${formatSrtTime(cueEnd)}\n${sc.narrationEn}\n`);

    breakdown.push({
      id: sc.id,
      titleAr: sc.titleAr,
      start: formatMmSs(cursor),
      end: formatMmSs(cursor + targetDur),
      durationSec: Number(targetDur.toFixed(2)),
    });

    cursor += targetDur;
  }

  fs.writeFileSync(FINAL_SRT_AR, arSrt.join("\n"));
  fs.writeFileSync(FINAL_SRT_EN, enSrt.join("\n"));

  const fadeOutStart = Math.max(0.5, cursor - 0.28).toFixed(3);
  filterParts.push(
    `${concatPairs.join("")}concat=n=${scenes.length}:v=1:a=1[vcatraw][acat]`,
    `[vcatraw]fade=t=in:st=0:d=0.25,fade=t=out:st=${fadeOutStart}:d=0.25,format=yuv420p[vcat]`,
  );

  const combinedRaw = path.join(prepDir, "_combined.mp4");

  execFileSync(
    "ffmpeg",
    [
      "-y",
      ...ffInputs,
      "-filter_complex",
      filterParts.join(";"),
      "-map",
      "[vcat]",
      "-map",
      "[acat]",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-color_range",
      "tv",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-r",
      "30",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ar",
      "48000",
      "-ac",
      "2",
      combinedRaw,
    ],
    { stdio: "inherit" },
  );

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      combinedRaw,
      "-i",
      FINAL_SRT_AR,
      "-i",
      FINAL_SRT_EN,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0",
      "-map",
      "1:s:0",
      "-map",
      "2:s:0",
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "-c:s",
      "mov_text",
      "-metadata:s:a:0",
      "language=ara",
      "-metadata:s:a:0",
      "title=العربية (السعودية)",
      "-metadata:s:s:0",
      "language=ara",
      "-metadata:s:s:0",
      "title=العربية",
      "-metadata:s:s:1",
      "language=eng",
      "-metadata:s:s:1",
      "title=English",
      "-disposition:s:0",
      "default",
      "-movflags",
      "+faststart",
      FINAL_VIDEO,
    ],
    { stdio: "pipe" },
  );

  fs.rmSync(prepDir, { recursive: true, force: true });

  const info = ffprobeInfo(FINAL_VIDEO);
  const stat = fs.statSync(FINAL_VIDEO);
  console.log(`\nEXPORTED FINAL DEMO VIDEO: ${FINAL_VIDEO}`);
  console.log(`Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB | Duration: ${Number(info.format?.duration || 0).toFixed(2)}s`);
  console.log("Streams:", JSON.stringify(info.streams));
  console.log("\n=== Scene Breakdown ===");
  for (const row of breakdown) {
    console.log(`  ${row.id} [${row.start} – ${row.end}] (${row.durationSec}s): ${row.titleAr}`);
  }
}

main();
