import { useT } from "../hooks/useI18n";

interface Props {
  lang: string;
  onLangChange: (lang: string) => void;
  steps: number;
  onStepsChange: (n: number) => void;
  speed: number;
  onSpeedChange: (n: number) => void;
}

const LANGS = [
  { code: "en", label: "English (en)" },
  { code: "ko", label: "한국어 (ko)" },
  { code: "ja", label: "日本語 (ja)" },
  { code: "ar", label: "العربية (ar)" },
  { code: "de", label: "Deutsch (de)" },
  { code: "es", label: "Español (es)" },
  { code: "fr", label: "Français (fr)" },
  { code: "it", label: "Italiano (it)" },
  { code: "pt", label: "Português (pt)" },
  { code: "ru", label: "Русский (ru)" },
  { code: "zh", label: "中文 (zh)" },
  { code: "hi", label: "हिन्दी (hi)" },
  { code: "nl", label: "Dutch (nl)" },
  { code: "pl", label: "Polski (pl)" },
  { code: "tr", label: "Türkçe (tr)" },
  { code: "sv", label: "Svenska (sv)" },
  { code: "da", label: "Dansk (da)" },
  { code: "fi", label: "Suomi (fi)" },
  { code: "el", label: "Ελληνικά (el)" },
  { code: "cs", label: "Čeština (cs)" },
  { code: "bg", label: "Български (bg)" },
  { code: "hr", label: "Hrvatski (hr)" },
  { code: "hu", label: "Magyar (hu)" },
  { code: "ro", label: "Română (ro)" },
  { code: "sk", label: "Slovenčina (sk)" },
  { code: "sl", label: "Slovenščina (sl)" },
  { code: "et", label: "Eesti (et)" },
  { code: "lv", label: "Latviešu (lv)" },
  { code: "lt", label: "Lietuvių (lt)" },
  { code: "id", label: "Bahasa Indonesia (id)" },
  { code: "uk", label: "Українська (uk)" },
  { code: "vi", label: "Tiếng Việt (vi)" },
];

export default function VoiceControls({
  lang,
  onLangChange,
  steps,
  onStepsChange,
  speed,
  onSpeedChange,
}: Props) {
  const t = useT();
  return (
    <>
      <div className="panel-section">
        <label className="section-label">{t.language}</label>
        <div className="select-wrap">
          <select
            id="lang-select"
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <svg className="select-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div className="param-row">
        <div className="param-field">
          <div className="param-header">
            <span className="param-label">{t.steps}</span>
            <span className="param-value">{steps}</span>
          </div>
          <input
            type="range"
            min={5}
            max={16}
            step={1}
            value={steps}
            onChange={(e) => onStepsChange(Number(e.target.value))}
          />
          <div className="param-extremes">
            <span>{t.stepsSpeed}</span>
            <span>{t.stepsQuality}</span>
          </div>
        </div>
        <div className="param-field">
          <div className="param-header">
            <span className="param-label">{t.speed}</span>
            <span className="param-value">{speed.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min={0.7}
            max={2.0}
            step={0.05}
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
          />
          {speed > 1.6 && (
            <div className="param-warning">
              {t.speedWarning}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
