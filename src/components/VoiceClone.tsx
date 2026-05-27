import { useCallback, useState, useRef } from "react";
import { openExternal } from "../lib/tauri";
import { useT } from "../hooks/useI18n";

interface Props {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  styleJson: object | null;
  onLoadStyle: (json: object) => void | Promise<void>;
  onClearStyle: () => void;
  onError: (msg: string) => void;
}

export default function VoiceClone({
  enabled,
  onToggle,
  styleJson,
  onLoadStyle,
  onClearStyle,
  onError,
}: Props) {
  const t = useT();
  const [dragOver, setDragOver] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        let json: any;
        try {
          json = JSON.parse(text);
        } catch {
          onError(t.errInvalidJson);
          return;
        }
        if (!json.style_ttl || !json.style_dp) {
          onError(t.errMissingFields);
          return;
        }
        for (const key of ["style_ttl", "style_dp"]) {
          const block = json[key];
          if (!block.dims || !Array.isArray(block.dims) || block.dims.length !== 3) {
            onError(t.errDims(key));
            return;
          }
          if (!block.data || !Array.isArray(block.data)) {
            onError(t.errDataArray(key));
            return;
          }
          const expectedLen = block.dims[0] * block.dims[1] * block.dims[2];
          const flatLen = (block.data as any[]).flat(Infinity).length;
          if (flatLen < expectedLen) {
            onError(t.errDataLen(key, flatLen, expectedLen));
            return;
          }
        }
        json.name = file.name;
        await onLoadStyle(json);
      } catch (e: any) {
        onError(t.errReadStyle(e.message || String(e)));
      }
    },
    [onLoadStyle, onError, t]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
      e.target.value = "";
    },
    [parseFile]
  );

  const fileName = styleJson
    ? (styleJson as any).name || t.customVoiceLoaded
    : null;

  return (
    <div className="panel-section voice-clone-section">
      <div className="voice-clone-header">
        <label className="voice-clone-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span className="toggle-label">{t.customVoice}</span>
        </label>
        <button
          type="button"
          className="voice-clone-help"
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {showTooltip && (
            <span className="voice-clone-tooltip" onClick={(e) => e.stopPropagation()}>
              {t.trainVoiceUsing}{t.thisRepo && (<>&nbsp;<a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://github.com/Saganaki22/supertonic_embeddings_trainer"); }}>{t.thisRepo}</a></>)}
              <button className="tooltip-close" onClick={() => setShowTooltip(false)}>×</button>
            </span>
          )}
        </button>
      </div>
      <div className={`voice-clone-body${enabled ? " open" : ""}`}>
        <div
          className={`voice-clone-drop${dragOver ? " drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={onFileSelect}
            hidden
          />
          {fileName ? (
            <div className="voice-clone-loaded">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>{fileName}</span>
              <button
                className="voice-clone-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearStyle();
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div className="voice-clone-placeholder">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span>{t.dropVoiceStyle}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
