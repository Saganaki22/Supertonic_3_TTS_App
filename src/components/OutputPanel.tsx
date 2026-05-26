import { useRef, useEffect, useCallback, useState } from "react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { wavToMp3, normalizeAudio } from "../lib/helpers";
import { writeWavFile } from "../lib/tts";
import { saveWavFile, saveMp3File, browseSave } from "../lib/tauri";

interface Props {
  wavData: Float32Array | null;
  sampleRate: number;
  duration: number;
  genTime: number;
  normalize: boolean;
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
  const step = Math.floor(samples.length / BAR_COUNT);
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

export default function OutputPanel({
  wavData,
  sampleRate,
  duration,
  genTime,
  normalize,
  onError,
  onSaved,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dlOpen, setDlOpen] = useState(false);
  const [dlMenuUp, setDlMenuUp] = useState(true);
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
  } = useAudioPlayer();

  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

  const audioData = normalize && wavData ? normalizeAudio(wavData) : wavData;

  const prevWavRef = useRef<Float32Array | null>(null);
  useEffect(() => {
    if (wavData && prevWavRef.current && wavData !== prevWavRef.current) {
      reset();
    }
    prevWavRef.current = wavData;
  }, [wavData, reset]);

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

  const checkDlMenuDirection = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setDlMenuUp(rect.top > 160);
  }, []);

  const onDownloadWav = useCallback(async () => {
    if (!wavData) return;
    setDlOpen(false);
    setEncoding(true);
    try {
      const data = normalize ? normalizeAudio(wavData) : wavData;
      const buf = writeWavFile(data, sampleRate);
      const path = await browseSave("supertonic-output.wav", [
        { name: "WAV", extensions: ["wav"] },
      ]);
      if (path) {
        await saveWavFile(path, Array.from(new Uint8Array(buf)));
        const name = path.split(/[/\\]/).pop() || path;
        onSaved(`Saved ${name}`, "success");
      }
    } catch (e: any) {
      onError(`WAV save failed: ${e}`);
    }
    setEncoding(false);
  }, [wavData, sampleRate, normalize, onSaved, onError]);

  const onDownloadMp3 = useCallback(async () => {
    if (!wavData) return;
    setDlOpen(false);
    setEncoding(true);
    try {
      const data = normalize ? normalizeAudio(wavData) : wavData;
      const mp3 = wavToMp3(data, sampleRate, bitrate);
      const path = await browseSave("supertonic-output.mp3", [
        { name: "MP3", extensions: ["mp3"] },
      ]);
      if (path) {
        await saveMp3File(path, Array.from(mp3));
        const name = path.split(/[/\\]/).pop() || path;
        onSaved(`Saved ${name} (${bitrate}kbps)`, "success");
      }
    } catch (e: any) {
      onError(`MP3 encoding failed: ${e}`);
    }
    setEncoding(false);
  }, [wavData, sampleRate, bitrate, normalize, onError, onSaved]);

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
        <p className="output-empty-title">No audio generated yet</p>
        <p className="output-empty-sub">
          Configure voice settings and click Generate
        </p>
      </div>
    );
  }

  return (
    <div className="output-filled">
        <canvas
          ref={canvasRef}
          id="waveform-canvas"
          className="seekable"
          onClick={handleWaveformClick}
        />
        <div id="player-controls">
          <button
            id="play-pause-btn"
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
          <span id="time-display">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
          <span className="badge">{fmtSampleRate(sampleRate)}</span>
          <span id="gen-time" className="badge">
            {genTime.toFixed(1)}s
          </span>
        </div>
        <div id="download-wrap" ref={wrapRef}>
          <button
            id="download-btn"
            disabled={encoding}
            onClick={() => {
              if (encoding) return;
              if (!dlOpen) checkDlMenuDirection();
              setDlOpen(!dlOpen);
            }}
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
            {encoding ? "Encoding…" : "Download"}
            {!encoding && (
              <svg
                className={`dl-chevron ${dlOpen ? "open" : ""}`}
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
              >
                <path
                  d="M2 4L5 7L8 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          {dlOpen && (
            <div
              id="download-menu"
              className={dlMenuUp ? "menu-up" : "menu-down"}
            >
              <button className="dl-option" onClick={onDownloadWav}>
                <span className="dl-format">WAV</span>
                <span className="dl-desc">Lossless, {fmtSampleRate(sampleRate)}</span>
              </button>
              <div className="dl-bitrate-section">
                <span className="dl-bitrate-label">MP3 bitrate</span>
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
              <button className="dl-option" onClick={onDownloadMp3}>
                <span className="dl-format">MP3</span>
                <span className="dl-desc">{bitrate}kbps, smaller file</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
