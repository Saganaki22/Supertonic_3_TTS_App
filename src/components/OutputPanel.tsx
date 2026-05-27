import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { wavToMp3, normalizeAudio } from "../lib/helpers";
import { writeWavFile } from "../lib/tts";
import { saveWavFile, saveMp3File, browseSave } from "../lib/tauri";
import { useT } from "../hooks/useI18n";

interface Props {
  wavData: Float32Array | null;
  sampleRate: number;
  duration: number;
  genTime: number;
  normalize: boolean;
  volume: number;
  onError: (msg: string) => void;
  onSaved: (msg: string, type: "success") => void;
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  samples: Float32Array,
  progress: number
) {
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const BAR_GAP = 2;
  const BAR_MIN_W = 3;
  const BAR_COUNT = Math.max(60, Math.min(300, Math.floor(W / (BAR_MIN_W + BAR_GAP))));
  const barW = (W - BAR_COUNT * BAR_GAP) / BAR_COUNT;
  const step = Math.max(1, Math.floor(samples.length / BAR_COUNT));
  const mid = H / 2;
  const accent =
    getComputedStyle(canvas).getPropertyValue("--accent").trim() || "#7c5cfc";
  const muted = getComputedStyle(canvas)
    .getPropertyValue("--text-muted")
    .trim() || "#4a4a62";
  const playheadX = progress * W;

  for (let i = 0; i < BAR_COUNT; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) sum += samples[i * step + j] ** 2;
    const rms = Math.sqrt(sum / step);
    const barH = Math.max(2, rms * H * 2.5);
    const x = i * (barW + BAR_GAP);
    ctx.fillStyle = x + barW / 2 <= playheadX ? accent : muted;
    ctx.beginPath();
    ctx.roundRect(x, mid - barH / 2, barW, barH, 2);
    ctx.fill();
  }
}

const BITRATES = [128, 192, 320] as const;

function timestampedAudioName(extension: "wav" | "mp3"): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
  ].join("") + "-" + [
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join("");
  return `supertonic-output-${stamp}.${extension}`;
}

export default function OutputPanel({
  wavData,
  sampleRate,
  duration,
  genTime,
  normalize,
  volume,
  onError,
  onSaved,
}: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [encoding, setEncoding] = useState(false);
  const [bitrate, setBitrate] = useState(192);
  const {
    play,
    toggle,
    seek,
    replay,
    playing,
    currentTime,
    totalDuration,
    loaded,
    reset,
  } = useAudioPlayer(volume);

  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

  const audioData = useMemo(
    () => normalize && wavData ? normalizeAudio(wavData) : wavData,
    [normalize, wavData]
  );

  const prevPlaybackRef = useRef<{ data: Float32Array | null; sampleRate: number } | null>(null);
  useEffect(() => {
    const prev = prevPlaybackRef.current;
    if (!prev || prev.data !== audioData || prev.sampleRate !== sampleRate) {
      reset();
      prevPlaybackRef.current = { data: audioData, sampleRate };
    }
  }, [audioData, sampleRate, reset]);

  useEffect(() => {
    if (!wavData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const draw = () => drawWaveform(canvas, wavData!, progress);
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [wavData, progress]);

  const onPlay = useCallback(() => {
    if (audioData) play(audioData, sampleRate);
  }, [audioData, sampleRate, play]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const fmtSampleRate = (sr: number) => {
    if (sr >= 1000) return `${(sr / 1000).toFixed(1)}kHz`;
    return `${sr}Hz`;
  };

  const handleWaveformClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!loaded) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pct * totalDuration;
      seek(time);
    },
    [loaded, totalDuration, seek]
  );

  const handleReplay = useCallback(() => {
    replay();
  }, [replay]);

  const onDownloadWav = useCallback(async () => {
    if (!wavData) return;
    setEncoding(true);
    try {
      const data = normalize ? normalizeAudio(wavData) : wavData;
      const buf = writeWavFile(data, sampleRate);
      const path = await browseSave(timestampedAudioName("wav"), [
        { name: "WAV", extensions: ["wav"] },
      ]);
      if (path) {
        await saveWavFile(path, Array.from(new Uint8Array(buf)));
        const name = path.split(/[/\\]/).pop() || path;
        onSaved(t.saved(name), "success");
      }
    } catch (e: any) {
      onError(t.errWavSave(String(e)));
    }
    setEncoding(false);
  }, [wavData, sampleRate, normalize, onSaved, onError, t]);

  const onDownloadMp3 = useCallback(async () => {
    if (!wavData) return;
    setEncoding(true);
    try {
      const data = normalize ? normalizeAudio(wavData) : wavData;
      const mp3 = wavToMp3(data, sampleRate, bitrate);
      const path = await browseSave(timestampedAudioName("mp3"), [
        { name: "MP3", extensions: ["mp3"] },
      ]);
      if (path) {
        await saveMp3File(path, Array.from(mp3));
        const name = path.split(/[/\\]/).pop() || path;
        onSaved(t.savedBitrate(name, bitrate), "success");
      }
    } catch (e: any) {
      onError(t.errMp3Encode(String(e)));
    }
    setEncoding(false);
  }, [wavData, sampleRate, bitrate, normalize, onError, onSaved, t]);

  if (!wavData) {
    return (
      <div className="output-empty">
        <svg
          className="output-empty-icon"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="1" y="4" width="3" height="16" rx="1" />
          <rect x="6" y="2" width="3" height="20" rx="1" />
          <rect x="11" y="6" width="3" height="12" rx="1" />
          <rect x="16" y="4" width="3" height="16" rx="1" />
          <rect x="21" y="8" width="3" height="8" rx="1" />
        </svg>
        <p className="output-empty-title">{t.noAudioYet}</p>
        <p className="output-empty-sub">
          {t.configureVoice}
        </p>
      </div>
    );
  }

  return (
    <div className="output-filled">
      <div className="output-header">
        <div>
          <span className="section-label">Generated audio</span>
          <p className="output-subtitle">Current render</p>
        </div>
        <div className="output-stats">
          <span className="badge">{fmt(duration)}</span>
          <span className="badge">{fmtSampleRate(sampleRate)}</span>
          <span className="badge">{genTime.toFixed(1)}s</span>
        </div>
      </div>

      <div className="waveform-panel">
        <canvas
          ref={canvasRef}
          id="waveform-canvas"
          className="seekable"
          onClick={handleWaveformClick}
        />
        <div id="player-controls">
          <button
            id="play-pause-btn"
            aria-label={playing ? "Pause" : "Play"}
            onClick={
              loaded
                ? playing
                  ? toggle
                  : currentTime >= totalDuration - 0.1
                    ? handleReplay
                    : toggle
                : onPlay
            }
          >
            {playing ? "⏸" : "▶"}
          </button>
          <div className="time-stack">
            <span id="time-display">{fmt(currentTime)} / {fmt(duration)}</span>
            <span className="transport-label">{playing ? "Playing" : loaded ? "Ready" : "Preview"}</span>
          </div>
        </div>
      </div>

      <div id="download-wrap">
        <div className="download-header">
          <span className="section-label">{t.download}</span>
          <span className="download-note">Timestamped filenames</span>
        </div>
        <div className="download-actions">
          <button
            className="download-format-btn primary"
            disabled={encoding}
            onClick={onDownloadWav}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{encoding ? t.encoding : "Save WAV"}</span>
            <small>Lossless</small>
          </button>
          <div className="mp3-save-panel">
            <div className="dl-bitrate-section">
              <span className="dl-bitrate-label">{t.mp3Bitrate}</span>
              <div className="dl-bitrate-btns">
                {BITRATES.map((br) => (
                  <button
                    key={br}
                    className={`dl-bitrate-btn${bitrate === br ? " active" : ""}`}
                    onClick={() => setBitrate(br)}
                  >{br}</button>
                ))}
              </div>
            </div>
            <button
              className="download-format-btn"
              disabled={encoding}
              onClick={onDownloadMp3}
            >
              <span>Save MP3</span>
              <small>{bitrate}kbps</small>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
