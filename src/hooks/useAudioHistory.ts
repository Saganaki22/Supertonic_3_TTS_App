import { useState, useCallback, useRef } from "react";
import { useAudioPlayer } from "./useAudioPlayer";

export interface AudioEntry {
  id: string;
  wavData: Float32Array;
  sampleRate: number;
  duration: number;
  genTime: number;
  text: string;
  voice: string;
  lang: string;
  steps: number;
  speed: number;
  timestamp: number;
}

export function useAudioHistory() {
  const [history, setHistory] = useState<AudioEntry[]>([]);
  const currentRef = useRef<AudioEntry | null>(null);
  const player = useAudioPlayer();

  const pushCurrent = useCallback((entry: Omit<AudioEntry, "id" | "timestamp">) => {
    const full: AudioEntry = {
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
    };
    if (currentRef.current) {
      setHistory((prev) => [currentRef.current!, ...prev].slice(0, 10));
    }
    currentRef.current = full;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    player.stop();
    currentRef.current = null;
    setHistory([]);
  }, [player]);

  return { history, pushCurrent, removeEntry, clearAll, player };
}
