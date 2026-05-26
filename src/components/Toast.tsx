import { useEffect, useState } from "react";

interface Props {
  message: string | null;
  type?: "error" | "success";
  onDismiss: () => void;
}

export default function Toast({ message, type = "error", onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, type === "success" ? 4000 : 8000);
      return () => clearTimeout(timer);
    }
  }, [message, type, onDismiss]);

  if (!message) return null;

  return (
    <div id="toast" className={`${visible ? "visible" : "hidden"} toast-${type}`}>
      <span id="toast-icon">
        {type === "success" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )}
      </span>
      <span id="toast-msg">{message}</span>
      <button id="toast-close" onClick={onDismiss}>×</button>
    </div>
  );
}
