import { useState, useCallback, useEffect } from "react";
import { useT } from "./hooks/useI18n";
import { useTTS } from "./hooks/useTTS";
import type { LoadProvider } from "./hooks/useTTS";
import { chunkText, normalizeAudio } from "./lib/helpers";
import Header from "./components/Header";
import VoiceGrid from "./components/VoiceGrid";
import VoiceControls from "./components/VoiceControls";
import TextInput from "./components/TextInput";
import VoiceClone from "./components/VoiceClone";
import ProgressBar from "./components/ProgressBar";
import OutputPanel from "./components/OutputPanel";
import AudioHistory from "./components/AudioHistory";
import Toast from "./components/Toast";
import Footer from "./components/Footer";
import PanelResize from "./components/PanelResize";
import { useAudioHistory } from "./hooks/useAudioHistory";
import type { AudioEntry } from "./hooks/useAudioHistory";
import "./App.css";

const savedTheme = () => (localStorage.getItem("theme") as "dark" | "light") || "dark";
const savedAccent = () => localStorage.getItem("accent") || "purple";

export default function App() {
  const { state, load, unload, loadVoice, setCustomStyle, synthesise, cancel } = useTTS();
  const t = useT();
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("M1");
  const [lang, setLang] = useState("en");
  const [steps, setSteps] = useState(8);
  const [speed, setSpeed] = useState(1.05);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"error" | "success">("error");
  const showToast = useCallback((msg: string, type: "error" | "success" = "error") => {
    setToast(msg);
    setToastType(type);
  }, []);
  const [customVoiceEnabled, setCustomVoiceEnabled] = useState(false);
  const [customStyleJson, setCustomStyleJson] = useState<object | null>(null);
  const [normalize, setNormalize] = useState(false);
  const [uiScale, setUiScale] = useState(1);
  const [panelWidth, setPanelWidth] = useState(400);
  const [theme, setTheme] = useState<"dark" | "light">(savedTheme);
  const [accent, setAccent] = useState(savedAccent);
  const audioHistory = useAudioHistory();
  const [historyPlayingId, setHistoryPlayingId] = useState<string | null>(null);

  const onThemeChange = useCallback((t: "dark" | "light") => {
    setTheme(t);
    localStorage.setItem("theme", t);
  }, []);

  const onAccentChange = useCallback((a: string) => {
    setAccent(a);
    localStorage.setItem("accent", a);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);

  const onSwitchProvider = useCallback(async (provider: LoadProvider) => {
    if (state.status === "loading" || state.status === "generating") return;
    const currentEp: LoadProvider = state.provider === "CPU" ? "wasm" : "webgpu";
    if (provider === currentEp) return;
    unload();
    try {
      await load(provider);
    } catch (e: any) {
      showToast(t.errLoadProvider(provider === "webgpu" ? t.gpu : t.cpu, e.message));
    }
  }, [state.status, state.provider, unload, load, showToast, t]);

  const onLoadAndGenerate = useCallback(async (provider?: LoadProvider) => {
    try {
      await load(provider);
      const trimmed = text.trim();
      if (trimmed) {
        if (customVoiceEnabled && customStyleJson) {
          setCustomStyle(customStyleJson);
        } else {
          await loadVoice(voice);
        }
        const result = await synthesise(trimmed, lang, steps, speed);
        if (result) {
          audioHistory.pushCurrent({
            ...result,
            text: trimmed,
            voice,
            lang,
            steps,
            speed,
          });
        }
      }
    } catch (e: any) {
      if (e.message !== "cancelled")
        showToast(t.error + ": " + e.message);
    }
  }, [load, text, lang, steps, speed, voice, customVoiceEnabled, customStyleJson, loadVoice, setCustomStyle, synthesise, showToast, audioHistory, t]);

  const onVoiceChange = useCallback(
    async (id: string) => {
      setVoice(id);
      if (customVoiceEnabled && customStyleJson) return;
      try {
        await loadVoice(id);
      } catch (e: any) {
        showToast(t.errLoadVoice(id, e.message));
      }
    },
    [loadVoice, customVoiceEnabled, customStyleJson, showToast, t]
  );

  const onLoadCustomStyle = useCallback(
    (json: object) => {
      setCustomStyleJson(json);
      setCustomStyle(json);
    },
    [setCustomStyle]
  );

  const onClearCustomStyle = useCallback(() => {
    setCustomStyleJson(null);
    loadVoice(voice);
  }, [voice, loadVoice]);

  const onToggleCustomVoice = useCallback(
    (enabled: boolean) => {
      setCustomVoiceEnabled(enabled);
      if (enabled && customStyleJson) {
        setCustomStyle(customStyleJson);
      } else if (!enabled) {
        loadVoice(voice);
      }
    },
    [customVoiceEnabled, customStyleJson, voice, loadVoice, setCustomStyle]
  );

  const onGenerate = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      showToast(t.errNoText);
      return;
    }
    try {
      if (customVoiceEnabled && customStyleJson) {
        setCustomStyle(customStyleJson);
      } else {
      await loadVoice(voice);
      }
      const result = await synthesise(trimmed, lang, steps, speed);
      if (result) {
        audioHistory.pushCurrent({
          ...result,
          text: trimmed,
          voice,
          lang,
          steps,
          speed,
        });
      }
    } catch (e: any) {
      if (e.message !== "cancelled")
        showToast(t.errGenFailed(e.message));
    }
  }, [text, lang, steps, speed, synthesise, customVoiceEnabled, customStyleJson, voice, loadVoice, setCustomStyle, showToast, audioHistory, t]);

  const chunks = text.trim() ? chunkText(text.trim()).length : 0;

  const onPlayHistory = useCallback((entry: AudioEntry) => {
    const data = normalize ? normalizeAudio(entry.wavData) : entry.wavData;
    if (historyPlayingId === entry.id) {
      audioHistory.player.toggle();
      setHistoryPlayingId(null);
    } else {
      audioHistory.player.play(data, entry.sampleRate);
      setHistoryPlayingId(entry.id);
    }
  }, [historyPlayingId, audioHistory, normalize]);

  const onRemoveHistory = useCallback((id: string) => {
    if (historyPlayingId === id) {
      audioHistory.player.stop();
      setHistoryPlayingId(null);
    }
    audioHistory.removeEntry(id);
  }, [historyPlayingId, audioHistory]);

  return (
    <div className="app" style={{ "--ui-scale": uiScale } as React.CSSProperties}>
      <Header
        modelState={state.status}
        statusLabel={state.statusLabel}
        provider={state.provider}
        onLoad={onLoadAndGenerate}
        onUnload={unload}
        onSwitchProvider={onSwitchProvider}
        uiScale={uiScale}
        onScaleChange={setUiScale}
        theme={theme}
        onThemeChange={onThemeChange}
        accent={accent}
        onAccentChange={onAccentChange}
      />
      <main id="main">
        <section id="left-panel" style={{ width: panelWidth }}>
          <div className="left-panel-scroll">
            <div className="panel-section">
              <label className="section-label">{t.voice}</label>
              <VoiceGrid selected={voice} onSelect={onVoiceChange} />
            </div>
            <VoiceControls
              lang={lang}
              onLangChange={setLang}
              steps={steps}
              onStepsChange={setSteps}
              speed={speed}
              onSpeedChange={setSpeed}
            />
            <TextInput
              value={text}
              chunks={chunks}
              onChange={setText}
              onError={showToast}
            />
            <VoiceClone
              enabled={customVoiceEnabled}
              onToggle={onToggleCustomVoice}
              styleJson={customStyleJson}
              onLoadStyle={onLoadCustomStyle}
              onClearStyle={onClearCustomStyle}
              onError={showToast}
            />
            <label className="normalize-toggle">
              <input
                type="checkbox"
                checked={normalize}
                onChange={(e) => setNormalize(e.target.checked)}
              />
              <span>{t.normalizeAudio}</span>
            </label>
            <div className="panel-section">
              {state.status === "generating" ? (
                state.progress ? (
                  <ProgressBar
                    pct={state.progress.pct}
                    label={state.progress.label}
                  />
                ) : (
                  <button id="generate-btn" disabled>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Generating…
                  </button>
                )
              ) : (
                <button
                  id="generate-btn"
                  disabled={state.status === "loading"}
                  onClick={state.status === "ready" ? onGenerate : () => onLoadAndGenerate()}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  {state.status === "ready" ? t.generateSpeech : t.loadAndGenerate}
                </button>
              )}
              {state.status === "generating" && (
                <button id="cancel-btn" onClick={cancel}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  {t.cancelGeneration}
                </button>
              )}
            </div>
          </div>
          <PanelResize onResize={setPanelWidth} uiScale={uiScale} />
        </section>
        <section id="right-panel">
          <div id="output-card">
          <OutputPanel
            wavData={state.wavData}
            sampleRate={state.sampleRate}
            duration={state.duration}
            genTime={state.genTime}
            normalize={normalize}
            onError={showToast}
            onSaved={showToast}
          />
            <AudioHistory
              history={audioHistory.history}
              playingId={historyPlayingId}
              onPlay={onPlayHistory}
              onRemove={onRemoveHistory}
              onClearAll={audioHistory.clearAll}
            />
          </div>
        </section>
      </main>
      <Footer />
      <Toast message={toast} type={toastType} onDismiss={() => setToast(null)} />
    </div>
  );
}
