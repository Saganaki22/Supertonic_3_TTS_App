import StatusBadge from "./StatusBadge";
import SettingsPanel from "./SettingsPanel";
import type { TTSStatus, LoadProvider } from "../hooks/useTTS";

interface Props {
  modelState: TTSStatus;
  statusLabel: string;
  provider: "GPU" | "CPU" | null;
  onLoad: (provider?: LoadProvider) => void;
  onUnload: () => void;
  onSwitchProvider: (p: LoadProvider) => void;
  uiScale: number;
  onScaleChange: (s: number) => void;
  theme: "dark" | "light";
  onThemeChange: (t: "dark" | "light") => void;
  accent: string;
  onAccentChange: (a: string) => void;
}

export default function Header({
  modelState,
  statusLabel,
  provider,
  onLoad,
  onUnload,
  onSwitchProvider,
  uiScale,
  onScaleChange,
  theme,
  onThemeChange,
  accent,
  onAccentChange,
}: Props) {
  return (
    <header id="header">
      <div className="header-left">
        <img
          src="/assets/logo.png"
          alt=""
          className="app-logo"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="brand">
          <span className="brand-name">Supertonic 3</span>
          <span className="brand-sub">
            On-device text-to-speech · 31 languages
          </span>
        </div>
      </div>
      <div className="header-right">
        <SettingsPanel
          uiScale={uiScale}
          onScaleChange={onScaleChange}
          theme={theme}
          onThemeChange={onThemeChange}
          accent={accent}
          onAccentChange={onAccentChange}
          provider={provider}
          onLoadProvider={onSwitchProvider}
        />
        {modelState === "ready" && (
          <button className="unload-btn" onClick={onUnload}>
            Unload
          </button>
        )}
        <StatusBadge
          status={modelState}
          label={statusLabel}
          provider={provider}
          onLoad={onLoad}
          onSwitchProvider={onSwitchProvider}
        />
      </div>
    </header>
  );
}
