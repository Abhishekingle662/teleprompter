interface TransportBarProps {
  isPlaying: boolean;
  scrollProgress: number;
  onTogglePlayPause: () => void;
  onReset: () => void;
  onSeek: (pct: number) => void;
  wpm: number;
  wordCount: number;
  onShowShortcuts: () => void;
  onToggleControls: () => void;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function TransportBar({
  isPlaying,
  scrollProgress,
  onTogglePlayPause,
  onReset,
  onSeek,
  wpm,
  wordCount,
  onShowShortcuts,
  onToggleControls,
}: TransportBarProps) {
  const totalSecs = wordCount > 0 ? (wordCount / wpm) * 60 : 0;
  const elapsed = (scrollProgress / 100) * totalSecs;

  return (
    <footer className="transport">
      <div className="transport-left">
        <button
          className="btn-step"
          onClick={onReset}
          title="Reset to start"
          aria-label="Reset"
        >
          ↺
        </button>
        <button
          className="btn-play"
          data-playing={isPlaying}
          onClick={onTogglePlayPause}
          title={isPlaying ? "Pause (Ctrl+Space)" : "Play (Ctrl+Space)"}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
      </div>

      <div className="transport-center">
        <span className="tc">{formatTime(elapsed)}</span>
        <input
          type="range"
          className="scrub"
          min={0}
          max={100}
          step={0.1}
          value={Math.round(scrollProgress * 10) / 10}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
        />
        <span className="tc" data-dim="true">{formatTime(totalSecs)}</span>
      </div>

      <div className="transport-right">
        <span className="badge">{wpm} WPM</span>
        <span className="badge">{wordCount.toLocaleString()} words</span>
        <button
          className="icon-btn"
          onClick={onShowShortcuts}
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
        >
          ⌨
        </button>
        <button
          className="icon-btn"
          onClick={onToggleControls}
          title="Toggle inspector"
          aria-label="Toggle inspector"
        >
          ⛶
        </button>
      </div>
    </footer>
  );
}
