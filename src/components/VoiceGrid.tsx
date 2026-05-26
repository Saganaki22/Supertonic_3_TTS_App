import { useEffect, useRef, useState } from "react";
import { useT } from "../hooks/useI18n";

const VOICES = [
  { id: "M1", gender: "Male" },
  { id: "M2", gender: "Male" },
  { id: "M3", gender: "Male" },
  { id: "M4", gender: "Male" },
  { id: "M5", gender: "Male" },
  { id: "F1", gender: "Female" },
  { id: "F2", gender: "Female" },
  { id: "F3", gender: "Female" },
  { id: "F4", gender: "Female" },
  { id: "F5", gender: "Female" },
];

interface Props {
  selected: string;
  onSelect: (id: string) => void;
}

export default function VoiceGrid({ selected, onSelect }: Props) {
  const t = useT();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const playSample = (voiceId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === voiceId) {
      setPlayingId(null);
      return;
    }
    const a = new Audio(`/voice-samples/${voiceId}.wav`);
    audioRef.current = a;
    setPlayingId(voiceId);
    a.play().catch(() => {});
    a.addEventListener("ended", () => {
      if (audioRef.current === a) {
        audioRef.current = null;
        setPlayingId(null);
      }
    });
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const genderLabel = (id: string) => id.startsWith("M") ? t.male : t.female;

  return (
    <div id="voice-grid">
      <div className="voice-row">
        {VOICES.filter(v => v.id.startsWith("M")).map((v) => (
          <div
            key={v.id}
            className={`voice-card${v.id === selected ? " selected" : ""}${v.id === playingId ? " playing" : ""}`}
            onClick={() => onSelect(v.id)}
          >
            <span className="voice-id">{v.id}</span>
            <span className="voice-gender">{genderLabel(v.id)}</span>
            <button
              className="play-btn"
              onClick={(e) => {
                e.stopPropagation();
                playSample(v.id);
              }}
            >
              {v.id === playingId ? "⏸" : "▶"}
            </button>
          </div>
        ))}
      </div>
      <div className="voice-row">
        {VOICES.filter(v => v.id.startsWith("F")).map((v) => (
          <div
            key={v.id}
            className={`voice-card${v.id === selected ? " selected" : ""}${v.id === playingId ? " playing" : ""}`}
            onClick={() => onSelect(v.id)}
          >
            <span className="voice-id">{v.id}</span>
            <span className="voice-gender">{genderLabel(v.id)}</span>
            <button
              className="play-btn"
              onClick={(e) => {
                e.stopPropagation();
                playSample(v.id);
              }}
            >
              {v.id === playingId ? "⏸" : "▶"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
