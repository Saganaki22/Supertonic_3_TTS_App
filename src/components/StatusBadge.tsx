import { useState, useRef, useEffect } from "react";
import type { TTSStatus, LoadProvider } from "../hooks/useTTS";
import { useT } from "../hooks/useI18n";

interface Props {
  status: TTSStatus;
  label: string;
  provider: "GPU" | "CPU" | null;
  onLoad: (provider?: LoadProvider) => void;
  onSwitchProvider: (p: LoadProvider) => void;
}

export default function StatusBadge({ status, label, provider, onLoad, onSwitchProvider }: Props) {
  const t = useT();
  const clickable = status === "idle" || status === "error";
  const showChevron = clickable || status === "ready";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const dotColor =
    status === "ready"
      ? "var(--status-gpu)"
      : status === "error"
        ? "var(--status-error)"
        : status === "loading"
          ? "var(--status-load)"
          : "var(--text-muted)";

  const displayLabel =
    status === "idle"
      ? t.loadModel
      : status === "ready" && provider
        ? `${t.ready} · ${provider}`
        : label;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleLoad = (ep: LoadProvider) => {
    setMenuOpen(false);
    if (status === "ready") {
      onSwitchProvider(ep);
    } else {
      onLoad(ep);
    }
  };

  return (
    <div style={{ position: "relative" }} ref={badgeRef}>
      <div
        id="status-badge"
        className={`${status}${clickable ? " clickable" : ""}`}
        onClick={clickable ? () => onLoad() : undefined}
      >
        <span className="dot" style={{ background: dotColor }} />
        <span id="status-text">{displayLabel}</span>
        {showChevron && (
          <button className="badge-chevron" onClick={handleChevronClick}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {menuOpen && (
        <div className="load-menu" ref={menuRef}>
          <button className="load-menu-item" onClick={() => handleLoad("webgpu")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="2" x2="9" y2="4" />
              <line x1="15" y1="2" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="22" />
              <line x1="15" y1="20" x2="15" y2="22" />
              <line x1="20" y1="9" x2="22" y2="9" />
              <line x1="20" y1="15" x2="22" y2="15" />
              <line x1="2" y1="9" x2="4" y2="9" />
              <line x1="2" y1="15" x2="4" y2="15" />
            </svg>
            <span className="load-menu-text">
              {t.gpu}
              <span className="load-menu-desc">{t.webgpuDesc}</span>
            </span>
          </button>
          <button className="load-menu-item" onClick={() => handleLoad("wasm")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="6" y1="10" x2="6" y2="14" />
              <line x1="10" y1="10" x2="10" y2="14" />
            </svg>
            <span className="load-menu-text">
              {t.cpu}
              <span className="load-menu-desc">{t.wasmDesc}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
