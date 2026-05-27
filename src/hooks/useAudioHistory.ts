import { useState, useCallback } from "react";
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

export function useAudioHistory(volume = 1) {
  const [history, setHistory] = useState<AudioEntry[]>([]);
  const player = useAudioPlayer(volume);

  const addEntry = useCallback((entry: Omit<AudioEntry, "id" | "timestamp">) => {
    const full: AudioEntry = {
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
    };
    setHistory((prev) => [full, ...prev].slice(0, 6));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    player.stop();
    setHistory([]);
  }, [player]);

  return { history, addEntry, removeEntry, clearAll, player };
}
