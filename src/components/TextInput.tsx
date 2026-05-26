import { useCallback, useState } from "react";
import {
  readTextFile,
  extractPdfText,
  extractDocxText,
  openTextFile,
  pasteFromClipboard,
} from "../lib/tauri";
import { cleanPdfText } from "../lib/helpers";
import { useT } from "../hooks/useI18n";

interface Props {
  value: string;
  chunks: number;
  onChange: (v: string) => void;
  onError: (msg: string) => void;
}

export default function TextInput({ value, chunks, onChange, onError }: Props) {
  const t = useT();
  const [dragOver, setDragOver] = useState(false);
  const [loadedFile, setLoadedFile] = useState<string | null>(null);

  const handleFile = useCallback(
    async (path: string) => {
      const name = path.split(/[/\\]/).pop() || path;
      try {
        if (path.endsWith(".pdf")) {
          const raw = await extractPdfText(path);
          const cleaned = cleanPdfText(raw);
          if (cleaned.length < 20) {
            onError(t.errScannedPdf);
            return;
          }
          onChange(cleaned);
          setLoadedFile(name);
        } else if (path.endsWith(".docx")) {
          const text = await extractDocxText(path);
          onChange(text);
          setLoadedFile(name);
        } else if (path.endsWith(".txt") || path.endsWith(".md")) {
          const text = await readTextFile(path);
          onChange(text);
          setLoadedFile(name);
        } else if (path.endsWith(".doc")) {
          onError(t.errLegacyDoc);
        } else {
          onError(t.errFileTypes);
        }
      } catch (e: any) {
        onError(t.errReadFile(String(e)));
      }
    },
    [onChange, onError, t]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file as any).path) {
        handleFile((file as any).path);
      } else {
        onError(t.errFilePath);
      }
    },
    [handleFile, onError, t]
  );

  const onBrowse = useCallback(async () => {
    const path = await openTextFile();
    if (path) handleFile(path);
  }, [handleFile]);

  const onPaste = useCallback(async () => {
    try {
      const text = await pasteFromClipboard();
      if (text) {
        onChange(text);
        setLoadedFile(null);
      }
    } catch {
      onError(t.errClipboard);
    }
  }, [onChange, onError, t]);

  const onRemoveFile = useCallback(() => {
    setLoadedFile(null);
    onChange("");
  }, [onChange]);

  return (
    <div className="panel-section">
      <label className="section-label">{t.text}</label>
      <div
        id="drop-zone"
        className={dragOver ? "drag-over" : ""}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {loadedFile && (
          <div className="file-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>{loadedFile}</span>
            <button className="remove-file" onClick={onRemoveFile}>
              ×
            </button>
          </div>
        )}
        <textarea
          id="text-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setLoadedFile(null);
          }}
          placeholder={t.textPlaceholder}
          spellCheck={false}
        />
      </div>
      <div className="text-meta">
        <span>{value.trim().length.toLocaleString()} {t.chars}</span>
        <span className="sep">·</span>
        <span>{chunks} {chunks === 1 ? t.chunk : t.chunks}</span>
      </div>
      <div className="input-actions">
        <button onClick={onPaste} title={t.pasteFromClipboard}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {t.paste}
        </button>
        <button onClick={onBrowse} title={t.openFile}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          {t.browse}
        </button>
      </div>
    </div>
  );
}
