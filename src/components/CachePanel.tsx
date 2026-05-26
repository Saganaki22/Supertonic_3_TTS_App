import { useState, useCallback, useEffect } from "react";
import { useT } from "../hooks/useI18n";

const CACHE_NAME = "supersonic-tts-v1";

interface CacheEntry {
  url: string;
  name: string;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function CachePanel() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<CacheEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      const items: CacheEntry[] = [];
      for (const req of keys) {
        const res = await cache.match(req);
        const blob = await res!.blob();
        const name = decodeURIComponent(
          new URL(req.url).pathname.split("/").pop() || req.url
        );
        items.push({ url: req.url, name, size: blob.size });
      }
      setEntries(items);
    } catch {
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const clearAll = useCallback(async () => {
    await caches.delete(CACHE_NAME);
    setEntries([]);
  }, []);

  const total = entries.reduce((s, e) => s + e.size, 0);

  return (
    <div id="cache-panel">
      <button id="cache-toggle" className="cache-header" onClick={() => setOpen(!open)}>
        <span className="toggle-icon">{open ? "▾" : "▸"}</span> {t.modelCache}
        <span id="cache-count-badge">{entries.length}</span>
      </button>
      {open && (
        <div id="cache-body">
          <div id="cache-list">
            {entries.length === 0 ? (
              <div className="cache-empty">No cached files</div>
            ) : (
              entries.map((e) => (
                <div key={e.url} className="cache-item">
                  <span className="cache-name">{e.name}</span>
                  <span className="cache-size">{formatBytes(e.size)}</span>
                </div>
              ))
            )}
          </div>
          <div className="cache-meta">
            Total: {formatBytes(total)}
            <button id="clear-cache-btn" onClick={clearAll}>
              Clear cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
