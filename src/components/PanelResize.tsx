import { useCallback, useRef } from "react";

interface Props {
  onResize: (width: number) => void;
  uiScale: number;
}

export default function PanelResize({ onResize, uiScale }: Props) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = (e.currentTarget.parentElement as HTMLElement).offsetWidth;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = (ev.clientX - startX.current) / uiScale;
        const newW = Math.max(320, Math.min(800, startW.current + delta));
        onResize(newW);
      };
      const onUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onResize]
  );

  return (
    <div className="panel-resize-handle" onMouseDown={onMouseDown}>
      <span className="panel-resize-grip">⋮</span>
    </div>
  );
}
