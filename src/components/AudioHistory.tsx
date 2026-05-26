import type { AudioEntry } from "../hooks/useAudioHistory";
import { useT } from "../hooks/useI18n";

interface Props {
  history: AudioEntry[];
  playingId: string | null;
  onPlay: (entry: AudioEntry) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export default function AudioHistory({ history, playingId, onPlay, onRemove, onClearAll }: Props) {
  const t = useT();
  if (history.length === 0) return null;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return t.timeAgoM(Math.floor(diff / 60));
    if (diff < 86400) return t.timeAgoH(Math.floor(diff / 3600));
    return t.timeAgoD(Math.floor(diff / 86400));
  };

  return (
    <div className="history-section">
      <div className="history-header">
        <span className="section-label">{t.history}</span>
        <button className="history-clear" onClick={onClearAll}>Clear all</button>
      </div>
      <div className="history-list">
        {history.map((entry) => (
          <div
            key={entry.id}
            className={`history-item${playingId === entry.id ? " playing" : ""}`}
            onClick={() => onPlay(entry)}
          >
            <button className="history-play-btn">
              {playingId === entry.id ? "⏸" : "▶"}
            </button>
            <div className="history-info">
              <span className="history-text">
                {entry.text.length > 60 ? entry.text.slice(0, 60) + "…" : entry.text}
              </span>
              <div className="history-meta">
                <span>{entry.voice}</span>
                <span className="sep">·</span>
                <span>{entry.lang}</span>
                <span className="sep">·</span>
                <span>{fmt(entry.duration)}</span>
                <span className="sep">·</span>
                <span>{entry.steps}s / {entry.speed.toFixed(2)}×</span>
                <span className="sep">·</span>
                <span>{timeAgo(entry.timestamp)}</span>
              </div>
            </div>
            <button
              className="history-remove"
              onClick={(e) => { e.stopPropagation(); onRemove(entry.id); }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
