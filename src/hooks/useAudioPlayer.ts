import { useState, useRef, useCallback, useEffect } from "react";

export function useAudioPlayer(volume = 1) {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const durationRef = useRef(0);
  const volumeRef = useRef(volume);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const endedRef = useRef(false);
  const cancelTick = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const startTick = useCallback(() => {
    const tick = () => {
      const ctx = ctxRef.current;
      if (!ctx || ctx.state === "closed") return;
      const pos = offsetRef.current + (ctx.currentTime - startTimeRef.current);
      setCurrentTime(pos);
      if (pos >= durationRef.current) {
        setPlaying(false);
        setLoaded(true);
        cancelTick();
        setCurrentTime(durationRef.current);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [cancelTick]);

  const stop = useCallback(() => {
    endedRef.current = true;
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    setPlaying(false);
    cancelTick();
  }, [cancelTick]);

  const reset = useCallback(() => {
    endedRef.current = true;
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    gainRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    bufferRef.current = null;
    offsetRef.current = 0;
    startTimeRef.current = 0;
    durationRef.current = 0;
    setPlaying(false);
    setCurrentTime(0);
    setTotalDuration(0);
    setLoaded(false);
    cancelTick();
  }, [cancelTick]);

  const createSource = useCallback(
    (ctx: AudioContext, startTime: number, shouldPlay: boolean) => {
      if (sourceRef.current) {
        sourceRef.current.onended = null;
        try { sourceRef.current.stop(); } catch {}
      }
      cancelTick();
      const buf = bufferRef.current;
      if (!buf) return;
      const src = ctx.createBufferSource();
      const gain = gainRef.current ?? ctx.createGain();
      const isNewGain = !gainRef.current;
      gain.gain.value = volumeRef.current;
      src.buffer = buf;
      src.connect(gain);
      if (isNewGain) gain.connect(ctx.destination);
      sourceRef.current = src;
      gainRef.current = gain;
      offsetRef.current = startTime;
      startTimeRef.current = ctx.currentTime;
      endedRef.current = false;
      if (shouldPlay) {
        src.start(0, startTime);
        src.onended = () => {
          if (endedRef.current) return;
          setPlaying(false);
          setLoaded(true);
          cancelTick();
          setCurrentTime(durationRef.current);
        };
        startTick();
      } else {
        setCurrentTime(startTime);
      }
    },
    [cancelTick, startTick]
  );

  const play = useCallback(
    (float32: Float32Array, sampleRate: number) => {
      stop();
      try { ctxRef.current?.close(); } catch {}
      const ctx = new AudioContext({ sampleRate });
      ctxRef.current = ctx;
      gainRef.current = ctx.createGain();
      gainRef.current.gain.value = volumeRef.current;
      gainRef.current.connect(ctx.destination);
      const buf = ctx.createBuffer(1, float32.length, sampleRate);
      buf.getChannelData(0).set(float32);
      bufferRef.current = buf;
      const dur = float32.length / sampleRate;
      durationRef.current = dur;
      setTotalDuration(dur);
      setCurrentTime(0);
      setLoaded(true);
      createSource(ctx, 0, true);
      setPlaying(true);
    },
    [stop, createSource]
  );

  const toggle = useCallback(() => {
    const ctx = ctxRef.current;
    const buf = bufferRef.current;
    if (!ctx || !buf) return;
    if (playing) {
      endedRef.current = true;
      try { sourceRef.current?.stop(); } catch {}
      sourceRef.current = null;
      offsetRef.current += ctx.currentTime - startTimeRef.current;
      setPlaying(false);
      cancelTick();
    } else {
      createSource(ctx, offsetRef.current, true);
      setPlaying(true);
    }
  }, [playing, cancelTick, createSource]);

  const seek = useCallback((time: number) => {
    const ctx = ctxRef.current;
    const buf = bufferRef.current;
    if (!ctx || !buf) return;
    const wasPlaying = playing;
    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        createSource(ctx, time, wasPlaying);
        setPlaying(wasPlaying);
      });
    } else {
      createSource(ctx, time, wasPlaying);
      setPlaying(wasPlaying);
    }
  }, [playing, createSource]);

  const replay = useCallback(() => {
    const ctx = ctxRef.current;
    const buf = bufferRef.current;
    if (!ctx || !buf) return;
    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        createSource(ctx, 0, true);
        setPlaying(true);
      });
    } else {
      createSource(ctx, 0, true);
      setPlaying(true);
    }
  }, [createSource]);

  useEffect(() => {
    volumeRef.current = volume;
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      cancelTick();
      ctxRef.current?.close();
    };
  }, [cancelTick]);

  return { play, toggle, seek, replay, playing, currentTime, totalDuration, loaded, stop, reset };
}
