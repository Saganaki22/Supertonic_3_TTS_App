import { useState, useRef, useCallback } from "react";
import {
  loadTextToSpeech,
  loadVoiceStyle,
  loadCustomVoiceStyle,
  writeWavFile,
  HF_BASE,
  type ChunkProgressCallback,
} from "../lib/tts";

export type TTSStatus =
  | "idle"
  | "loading"
  | "ready"
  | "generating"
  | "error";

export type LoadProvider = "webgpu" | "wasm";

export interface TTSState {
  status: TTSStatus;
  statusLabel: string;
  provider: "GPU" | "CPU" | null;
  progress: { step: number; total: number; pct: number; label: string } | null;
  wavData: Float32Array | null;
  sampleRate: number;
  duration: number;
  genTime: number;
}

export function useTTS() {
  const ttsRef = useRef<any>(null);
  const styleRef = useRef<any>(null);
  const cancelledRef = useRef(false);
  const [state, setState] = useState<TTSState>({
    status: "idle",
    statusLabel: "Load model",
    provider: null,
    progress: null,
    wavData: null,
    sampleRate: 44100,
    duration: 0,
    genTime: 0,
  });

  const load = useCallback(async (
    preferred: LoadProvider = "webgpu",
    cpuUsagePercent = 75,
    cpuThreadCount?: number
  ) => {
    setState((s) => ({
      ...s,
      status: "loading",
      statusLabel: "Loading…",
      progress: null,
    }));
    const onnxDir = `${HF_BASE}/onnx`;
    const onLoad = (name: string, cur: number, total: number) =>
      setState((s) => ({ ...s, statusLabel: `${name} (${cur}/${total})` }));

    const tryLoad = async (ep: string): Promise<{ tts: any; label: "GPU" | "CPU" }> => {
      const result = await loadTextToSpeech(
        onnxDir,
        { executionProviders: [ep], graphOptimizationLevel: "all" },
        onLoad,
        cpuUsagePercent,
        cpuThreadCount
      );
      const label: "GPU" | "CPU" = ep === "webgpu" ? "GPU" : "CPU";
      return { tts: result.tts, label };
    };

    try {
      let tts: any;
      let providerLabel: "GPU" | "CPU";

      if (preferred === "webgpu") {
        try {
          const r = await tryLoad("webgpu");
          tts = r.tts;
          providerLabel = "GPU";
        } catch {
          const r = await tryLoad("wasm");
          tts = r.tts;
          providerLabel = "CPU";
        }
      } else {
        const r = await tryLoad("wasm");
        tts = r.tts;
        providerLabel = "CPU";
      }

      ttsRef.current = tts;
      setState((s) => ({
        ...s,
        status: "ready",
        statusLabel: `Ready · ${providerLabel}`,
        provider: providerLabel,
        sampleRate: tts.sampleRate,
      }));
    } catch (e: any) {
      setState((s) => ({
        ...s,
        status: "error",
        statusLabel: "Error — click to retry",
        progress: null,
      }));
      throw e;
    }
  }, []);

  const unload = useCallback(() => {
    ttsRef.current = null;
    styleRef.current = null;
    setState({
      status: "idle",
      statusLabel: "Load model",
      provider: null,
      progress: null,
      wavData: null,
      sampleRate: 44100,
      duration: 0,
      genTime: 0,
    });
  }, []);

  const loadVoice = useCallback(async (voiceId: string) => {
    const style = await loadVoiceStyle([
      `${HF_BASE}/voice_styles/${voiceId}.json`,
    ]);
    styleRef.current = style;
  }, []);

  const setCustomStyle = useCallback(async (json: any) => {
    styleRef.current = await loadCustomVoiceStyle(json);
  }, []);

  const synthesise = useCallback(
    async (
      text: string,
      lang: string,
      steps: number,
      speed: number
    ): Promise<{ wavData: Float32Array; sampleRate: number; duration: number; genTime: number } | null> => {
      if (!ttsRef.current || !styleRef.current)
        throw new Error("Model not loaded");
      cancelledRef.current = false;
      const t0 = Date.now();
      setState((s) => ({
        ...s,
        status: "generating",
        progress: { step: 0, total: steps, pct: 0, label: "Preparing…" },
      }));
      try {
        const onProgress: ChunkProgressCallback = (chunk, totalChunks, step, totalSteps) => {
          if (cancelledRef.current) throw new Error("cancelled");
          const chunkPct = ((chunk - 1) / totalChunks) * 100;
          const stepPct = (step / totalSteps) * (100 / totalChunks);
          const pct = Math.min(100, Math.round(chunkPct + stepPct));
          const label = totalChunks > 1
            ? `Chunk ${chunk}/${totalChunks} · step ${step}/${totalSteps}`
            : `Denoising step ${step}/${totalSteps}`;
          setState((s) => ({
            ...s,
            progress: { step, total: totalSteps, pct, label },
          }));
        };
        const { wav, duration } = await ttsRef.current.call(
          text,
          lang,
          styleRef.current,
          steps,
          speed,
          0.3,
          onProgress
        );
        if (cancelledRef.current) throw new Error("cancelled");
        const wavLen = Math.floor(ttsRef.current.sampleRate * duration[0]);
        const float32 = new Float32Array(wav.slice(0, wavLen));
        const genTime = (Date.now() - t0) / 1000;
        const result = { wavData: float32, sampleRate: ttsRef.current.sampleRate, duration: duration[0], genTime };
        setState((s) => ({
          ...s,
          status: "ready",
          progress: null,
          wavData: float32,
          duration: duration[0],
          genTime,
        }));
        return result;
      } catch (e: any) {
        if (e.message === "cancelled") {
          setState((s) => ({
            ...s,
            status: "ready",
            progress: null,
          }));
          return null;
        }
        setState((s) => ({
          ...s,
          status: "ready",
          progress: null,
        }));
        throw e;
      }
    },
    []
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const getWavBuffer = useCallback((): ArrayBuffer | null => {
    if (!state.wavData) return null;
    return writeWavFile(state.wavData, state.sampleRate);
  }, [state.wavData, state.sampleRate]);

  return { state, load, unload, loadVoice, setCustomStyle, synthesise, cancel, getWavBuffer };
}
