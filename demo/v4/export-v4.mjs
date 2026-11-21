import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");
const SCRIPT_PATH = path.join(ROOT_DIR, "demo", "v4", "script.json");
const RECORDINGS_DIR = path.join(ROOT_DIR, "demo", "v4", "recordings");
const TIMELINE_PATH = path.join(RECORDINGS_DIR, "timeline.json");
const ASSETS_DIR = path.join(RECORDINGS_DIR, "_assets");
const OUT_DIR = path.join(ROOT_DIR, "output");

const FINAL_VIDEO = path.join(OUT_DIR, "miqat-finance-detailed-v4.mp4");
const FINAL_SRT_AR = path.join(OUT_DIR, "miqat-finance-detailed-v4-ar.srt");
const FINAL_SRT_EN = path.join(OUT_DIR, "miqat-finance-detailed-v4-en.srt");

const XFADE_SEC = 0.35;
const SPEECH_INSET_SEC = 0.25;

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

function buildWarmPadWav(durationSec, outPath, fadeInSec, fadeOutSec, peakVol = 0.024) {
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
      `lowpass=f=720,volume=${peakVol},afade=t=in:st=0:d=${fadeInSec.toFixed(2)},afade=t=out:st=${fadeOutStart}:d=${fadeOutSec.toFixed(2)}`,
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

function buildZoompanFilter({ zoom, targetDur, ptsScale }) {
  const dz = Math.max(0, Number(zoom.scale || 1.13) - 1).toFixed(3);
  const t0 = Number(zoom.startSec ?? 1.0).toFixed(2);
  const t1 = Math.max(Number(t0) + 1.8, Number(zoom.endSec ?? targetDur - 0.6)).toFixed(2);
  const fx = Number(zoom.fx ?? 0.43).toFixed(3);
  const fy = Number(zoom.fy ?? 0.42).toFixed(3);
  const ramp = "0.65";

  const uIn = `clip((on/30-${t0})/${ramp}\\,0\\,1)`;
  const uOut = `clip((${t1}-on/30)/${ramp}\\,0\\,1)`;
  const eIn = `pow(${uIn}\\,2)*(3-2*${uIn})`;
  const eOut = `pow(${uOut}\\,2)*(3-2*${uOut})`;
  const zExpr = `1+${dz}*min(${eIn}\\,${eOut})`;

  return [
    `[0:v]setpts=PTS-STARTPTS,setpts=(${ptsScale.toFixed(6)})*PTS,fps=30,scale=3840:2160:flags=lanczos`,
    `zoompan=z='${zExpr}':x='(iw-iw/zoom)*${fx}':y='(ih-ih/zoom)*${fy}':d=1:s=1728x972:fps=30`,
    `trim=0:${targetDur.toFixed(3)},setpts=PTS-STARTPTS,format=rgba[fg_rgb]`,
  ].join(",");
}

function renderStagedScene({ sceneEntry, rawVideo, studioFrame, windowMask, chapterPng, stagedOut, targetDur }) {
  const vDur = Number(ffprobeInfo(rawVideo).format?.duration || targetDur);
  const ptsScale = vDur > 0 ? targetDur / vDur : 1.0;

  const filterGraph = [
    buildZoompanFilter({ zoom: sceneEntry.zoom, targetDur, ptsScale }),
    `[2:v]format=gray,trim=0:${targetDur.toFixed(3)},setpts=PTS-STARTPTS[mask]`,
    `[fg_rgb][mask]alphamerge[fg]`,
    `[1:v]format=rgba,trim=0:${targetDur.toFixed(3)},setpts=PTS-STARTPTS[bg]`,
    `[bg][fg]overlay=96:66:shortest=1[staged]`,
    `[3:v]format=rgba,trim=0:${targetDur.toFixed(3)},setpts=PTS-STARTPTS,fade=t=in:st=0.25:d=0.35:alpha=1,fade=t=out:st=2.45:d=0.40:alpha=1[chap]`,
    `[staged][chap]overlay=0:0:shortest=1,scale=1920:1080:in_range=full:out_range=tv,setsar=1,format=yuv420p[vout]`,
  ].join(";");

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      rawVideo,
      "-loop",
      "1",
      "-framerate",
      "30",
      "-t",
      targetDur.toFixed(3),
      "-i",
      studioFrame,
      "-loop",
      "1",
      "-framerate",
      "30",
      "-t",
      targetDur.toFixed(3),
      "-i",
      windowMask,
      "-loop",
      "1",
      "-framerate",
      "30",
      "-t",
      targetDur.toFixed(3),
      "-i",
      chapterPng,
      "-filter_complex",
      filterGraph,
      "-map",
      "[vout]",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "16",
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
      "-t",
      targetDur.toFixed(3),
      stagedOut,
    ],
    { stdio: "pipe" },
  );
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, "utf8"));
  const timeline = JSON.parse(fs.readFileSync(TIMELINE_PATH, "utf8"));

  const studioFrame = path.join(ASSETS_DIR, "studio_frame.png");
  const windowMask = path.join(ASSETS_DIR, "window_mask.png");
  const introMp4 = path.join(ASSETS_DIR, "intro.mp4");
  const outroMp4 = path.join(ASSETS_DIR, "outro.mp4");

  for (const reqFile of [studioFrame, windowMask, introMp4, outroMp4]) {
    if (!fs.existsSync(reqFile)) {
      throw new Error(`Missing required editorial asset: ${reqFile}`);
    }
  }

  const workDir = path.join(RECORDINGS_DIR, "_build");
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });

  const overlap = Number(timeline.overlapSec || 0.65);
  const stagedClips = [introMp4];
  const sceneDurations = [];
  const sceneAudioWavs = [];
  const sceneAudioDurs = [];

  for (const sc of script.scenes) {
    const entry = timeline.scenes.find((row) => row.id === sc.id);
    if (!entry) throw new Error(`Missing timeline entry for ${sc.id}`);

    const rawVideo = path.join(ROOT_DIR, entry.videoFile);
    const audioIn = path.join(ROOT_DIR, sc.audioFile);
    const chapterPng = path.join(ASSETS_DIR, `chapter_${sc.id}.png`);

    for (const reqFile of [rawVideo, audioIn, chapterPng]) {
      if (!fs.existsSync(reqFile)) throw new Error(`Missing scene file: ${reqFile}`);
    }

    const aDur = Number(ffprobeInfo(audioIn).format?.duration || 0);
    const targetDur = aDur + overlap;
    const stagedOut = path.join(workDir, `staged_${sc.id}.mp4`);

    console.log(`Staging ${sc.id} (${targetDur.toFixed(2)}s, zoom @ ${entry.zoom.fx},${entry.zoom.fy})...`);
    renderStagedScene({
      sceneEntry: entry,
      rawVideo,
      studioFrame,
      windowMask,
      chapterPng,
      stagedOut,
      targetDur,
    });

    const cleanVoiceWav = path.join(workDir, `voice_${sc.id}.wav`);
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        audioIn,
        "-af",
        "highpass=f=75,acompressor=threshold=-20dB:ratio=2.4:attack=10:release=120,loudnorm=I=-16:TP=-1.5:LRA=9,aformat=sample_rates=48000:channel_layouts=stereo",
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

    stagedClips.push(stagedOut);
    sceneDurations.push(targetDur);
    sceneAudioWavs.push(cleanVoiceWav);
    sceneAudioDurs.push(aDur);
  }

  stagedClips.push(outroMp4);

  const clipDurs = stagedClips.map((clip) => Number(ffprobeInfo(clip).format?.duration || 0));
  const clipStarts = [0];
  const xfadeFilters = [];

  for (let k = 0; k < stagedClips.length; k++) {
    xfadeFilters.push(`[${k}:v]settb=AVTB,fps=30,format=yuv420p[n${k}]`);
  }

  let prevLabel = "n0";
  for (let k = 1; k < stagedClips.length; k++) {
    const offset = Number((clipStarts[k - 1] + clipDurs[k - 1] - XFADE_SEC).toFixed(3));
    clipStarts.push(offset);
    const outLabel = k === stagedClips.length - 1 ? "vout" : `x${k}`;
    xfadeFilters.push(
      `[${prevLabel}][n${k}]xfade=transition=fade:duration=${XFADE_SEC.toFixed(2)}:offset=${offset.toFixed(3)}[${outLabel}]`,
    );
    prevLabel = outLabel;
  }

  const totalDur = Number((clipStarts[stagedClips.length - 1] + clipDurs[stagedClips.length - 1]).toFixed(3));

  const arSrt = [];
  const enSrt = [];
  const breakdown = [];
  const audioInputs = [];
  const audioFilterParts = [];
  const audioMixLabels = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const sc = script.scenes[i];
    const sceneStart = clipStarts[i + 1];
    const audioStart = sceneStart + SPEECH_INSET_SEC;
    const delayMs = Math.max(0, Math.round(audioStart * 1000));
    const aDur = sceneAudioDurs[i];

    audioInputs.push("-i", sceneAudioWavs[i]);
    audioFilterParts.push(
      `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${delayMs}|${delayMs},apad=whole_dur=${totalDur.toFixed(3)},atrim=0:${totalDur.toFixed(3)}[va${i}]`,
    );
    audioMixLabels.push(`[va${i}]`);

    arSrt.push(`${i + 1}\n${formatSrtTime(audioStart)} --> ${formatSrtTime(audioStart + aDur)}\n${sc.narrationAr}\n`);
    enSrt.push(`${i + 1}\n${formatSrtTime(audioStart)} --> ${formatSrtTime(audioStart + aDur)}\n${sc.narrationEn}\n`);

    breakdown.push({
      id: sc.id,
      chapterNum: sc.chapterNum,
      titleAr: sc.titleAr,
      start: formatMmSs(sceneStart),
      end: formatMmSs(sceneStart + sceneDurations[i]),
      durationSec: Number(sceneDurations[i].toFixed(2)),
    });
  }

  const introPadWav = path.join(workDir, "intro_pad.wav");
  const outroPadWav = path.join(workDir, "outro_pad.wav");
  const outroIdx = stagedClips.length - 1;
  const introPadDur = Math.max(1.8, clipStarts[1] + SPEECH_INSET_SEC + 0.15);
  const outroPadStartSec = Math.max(0, clipStarts[outroIdx] - 0.25);
  const outroPadDur = Math.max(2.0, totalDur - outroPadStartSec - 0.1);
  const outroPadDelayMs = Math.round(outroPadStartSec * 1000);

  buildWarmPadWav(introPadDur, introPadWav, 0.25, 0.9, 0.024);
  buildWarmPadWav(outroPadDur, outroPadWav, 0.9, 1.0, 0.024);

  const pIntroIdx = script.scenes.length;
  const pOutroIdx = script.scenes.length + 1;
  audioInputs.push("-i", introPadWav, "-i", outroPadWav);
  audioFilterParts.push(
    `[${pIntroIdx}:a]aformat=sample_rates=48000:channel_layouts=stereo,apad=whole_dur=${totalDur.toFixed(3)},atrim=0:${totalDur.toFixed(3)}[pin]`,
    `[${pOutroIdx}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${outroPadDelayMs}|${outroPadDelayMs},apad=whole_dur=${totalDur.toFixed(3)},atrim=0:${totalDur.toFixed(3)}[pout]`,
    `${audioMixLabels.join("")}[pin][pout]amix=inputs=${script.scenes.length + 2}:duration=first:normalize=0,alimiter=limit=0.95[aout]`,
  );

  const masterAudioWav = path.join(workDir, "master_audio.wav");
  execFileSync(
    "ffmpeg",
    [
      "-y",
      ...audioInputs,
      "-filter_complex",
      audioFilterParts.join(";"),
      "-map",
      "[aout]",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-c:a",
      "pcm_s16le",
      masterAudioWav,
    ],
    { stdio: "pipe" },
  );

  const masterVideoMp4 = path.join(workDir, "master_video.mp4");
  const videoInputs = stagedClips.flatMap((clip) => ["-i", clip]);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      ...videoInputs,
      "-filter_complex",
      xfadeFilters.join(";"),
      "-map",
      "[vout]",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
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
      "-t",
      totalDur.toFixed(3),
      masterVideoMp4,
    ],
    { stdio: "inherit" },
  );

  fs.writeFileSync(FINAL_SRT_AR, arSrt.join("\n"));
  fs.writeFileSync(FINAL_SRT_EN, enSrt.join("\n"));

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      masterVideoMp4,
      "-i",
      masterAudioWav,
      "-i",
      FINAL_SRT_AR,
      "-i",
      FINAL_SRT_EN,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-map",
      "2:s:0",
      "-map",
      "3:s:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-c:s",
      "mov_text",
      "-metadata:s:a:0",
      "language=ara",
      "-metadata:s:a:0",
      "title=العربية",
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

  fs.rmSync(workDir, { recursive: true, force: true });

  const info = ffprobeInfo(FINAL_VIDEO);
  const stat = fs.statSync(FINAL_VIDEO);
  console.log(`\nEXPORTED DETAILED FINANCIAL SUITE VIDEO: ${FINAL_VIDEO}`);
  console.log(`Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB | Duration: ${Number(info.format?.duration || 0).toFixed(2)}s`);
  console.log("Streams:", JSON.stringify(info.streams));
  console.log("\n=== Chapter Breakdown ===");
  for (const row of breakdown) {
    console.log(`  [${row.chapterNum}] ${row.id} (${row.start} – ${row.end}, ${row.durationSec}s): ${row.titleAr}`);
  }
}

main();
