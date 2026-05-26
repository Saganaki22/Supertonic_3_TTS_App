interface Props {
  pct: number;
  label: string;
}

export default function ProgressBar({ pct, label }: Props) {
  return (
    <div id="progress-wrap">
      <div id="progress-bar">
        <div
          id="progress-fill"
          style={{ width: `${pct}%` }}
        />
        <span id="progress-label">{label}</span>
      </div>
      <span id="progress-pct">{pct}%</span>
    </div>
  );
}
