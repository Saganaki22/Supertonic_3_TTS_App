import { useState, useRef, useEffect } from "react";
import { openExternal } from "../lib/tauri";
import type { LoadProvider } from "../hooks/useTTS";
import { useI18n } from "../hooks/useI18n";

const VERSION = "0.1.2";
const REPO_RELEASES = "https://github.com/Saganaki22/Supertonic_3_TTS_App/releases";
const AUTHOR_GH = "https://github.com/Saganaki22";

const ACCENTS = [
  { id: "purple", color: "#7c5cfc" },
  { id: "blue", color: "#3b82f6" },
  { id: "green", color: "#22c55e" },
  { id: "red", color: "#ef4444" },
  { id: "yellow", color: "#eab308" },
];

export default function SettingsPanel({
  uiScale,
  onScaleChange,
  theme,
  onThemeChange,
  accent,
  onAccentChange,
  provider,
  onLoadProvider,
}: {
  uiScale: number;
  onScaleChange: (s: number) => void;
  theme: "dark" | "light";
  onThemeChange: (t: "dark" | "light") => void;
  accent: string;
  onAccentChange: (a: string) => void;
  provider: "GPU" | "CPU" | null;
  onLoadProvider: (p: LoadProvider) => void;
}) {
  const { t, lang, setLang, options } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="settings-wrap" ref={wrapRef}>
      <button
        className={`settings-cog${open ? " active" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="settings-popover">
          <div className="settings-group">
            <button className="settings-link" onClick={() => openExternal(REPO_RELEASES)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t.checkUpdates}
            </button>
          </div>

          <div className="settings-divider" />

          <div className="settings-group">
            <div className="settings-row">
              <span className="settings-label">{t.appLanguage}</span>
              <select
                className="settings-lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
              >
                {options.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-group">
            <div className="settings-row">
              <span className="settings-label">{t.provider}</span>
              <div className="settings-provider-btns">
                <button
                  className={`settings-provider-btn${provider === "GPU" ? " active" : ""}`}
                  onClick={() => onLoadProvider("webgpu")}
                >{t.gpu}</button>
                <button
                  className={`settings-provider-btn${provider === "CPU" ? " active" : ""}`}
                  onClick={() => onLoadProvider("wasm")}
                >{t.cpu}</button>
              </div>
            </div>
            {provider === "CPU" && (
              <div className="settings-warning">
                {t.cpuWarning}
              </div>
            )}
          </div>

          <div className="settings-divider" />

          <div className="settings-group">
            <div className="settings-row">
              <span className="settings-label">{t.theme}</span>
              <div className="settings-theme-btns">
                <button
                  className={`settings-theme-btn${theme === "dark" ? " active" : ""}`}
                  onClick={() => onThemeChange("dark")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
                  {t.dark}
                </button>
                <button
                  className={`settings-theme-btn${theme === "light" ? " active" : ""}`}
                  onClick={() => onThemeChange("light")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                  {t.light}
                </button>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t.accent}</span>
              <div className="settings-accent-picker">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    className={`settings-accent-dot${accent === a.id ? " active" : ""}`}
                    style={{ background: a.color }}
                    onClick={() => onAccentChange(a.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-group">
            <div className="settings-row">
              <span className="settings-label">{t.author}</span>
              <button className="settings-value-link" onClick={() => openExternal(AUTHOR_GH)}>Saganaki22</button>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t.version}</span>
              <span className="settings-value">v{VERSION}</span>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t.license}</span>
              <div className="settings-licenses">
                <span>MIT (code)</span>
                <span className="settings-license-sep">·</span>
                <button className="settings-value-link" onClick={() => openExternal("https://huggingface.co/blog/open_rail")}>OpenRAIL</button>
                <span>(model)</span>
              </div>
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-disclaimer">
            This model must not be used to cause harm, deceive, or generate
            malicious content. See the OpenRAIL license for full terms.
          </div>

          <div className="settings-divider" />

          <div className="settings-group">
            <div className="settings-row">
              <span className="settings-label">{t.uiScale}</span>
              <span className="settings-value">{Math.round(uiScale * 100)}%</span>
            </div>
            <input
              type="range"
              className="settings-scale-slider"
              min={0.8}
              max={1.5}
              step={0.05}
              value={uiScale}
              onChange={(e) => onScaleChange(parseFloat(e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
