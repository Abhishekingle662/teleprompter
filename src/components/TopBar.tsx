import React from "react";

export type UIMode = "edit" | "live" | "stealth";
export type UITheme = "dark" | "light";
export type UIBackground = "opaque" | "transparent";

interface TopBarProps {
  mode: UIMode;
  onModeChange: (mode: UIMode) => void;
  theme: UITheme;
  onThemeToggle: () => void;
  background: UIBackground;
  onBackgroundToggle: () => void;
  isPlaying: boolean;
  isCountingDown: boolean;
  currentFileName: string | null;
  onDragStart: (e: React.MouseEvent) => void;
  onMinimize: (e: React.MouseEvent) => void;
  onMaximize: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
}

const MODE_LABELS: Record<UIMode, string> = {
  edit: "Edit",
  live: "Live",
  stealth: "Stealth",
};

export function TopBar({
  mode,
  onModeChange,
  theme,
  onThemeToggle,
  background,
  onBackgroundToggle,
  isPlaying,
  isCountingDown,
  currentFileName,
  onDragStart,
  onMinimize,
  onMaximize,
  onClose,
}: TopBarProps) {
  const live = isPlaying || isCountingDown;

  return (
    <header className="topbar" data-tauri-drag-region onMouseDown={onDragStart}>
      <div className="topbar-left">
        <span className="brand"><span className="brand-dot" />Teleprompter</span>
        {currentFileName && (
          <span className="file-pill" title={currentFileName}>
            {currentFileName}
          </span>
        )}
        <span className="live-indicator" data-on={live}>
          <span className="dot" />
          {isCountingDown ? "Standby" : live ? "On Air" : "Idle"}
        </span>
      </div>

      <div className="topbar-center">
        <div className="mode-switch" role="tablist" onMouseDown={(e) => e.stopPropagation()}>
          {(["edit", "live", "stealth"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              data-active={mode === m}
              onClick={() => onModeChange(m)}
              title={`Switch to ${MODE_LABELS[m]} mode`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="topbar-right" onMouseDown={(e) => e.stopPropagation()}>
        <button
          className="icon-btn"
          onClick={onThemeToggle}
          title={`Theme: ${theme} (click to toggle)`}
        >
          {theme === "dark" ? "◑" : "◐"}
        </button>
        <button
          className="icon-btn"
          data-active={background === "transparent"}
          onClick={onBackgroundToggle}
          title={`Background: ${background} (click to toggle)`}
        >
          {background === "transparent" ? "▢" : "■"}
        </button>
        <div className="window-chrome">
          <button
            className="chrome-btn chrome-min"
            onClick={onMinimize}
            title="Minimize"
            aria-label="Minimize"
          />
          <button
            className="chrome-btn chrome-max"
            onClick={onMaximize}
            title="Maximize"
            aria-label="Maximize"
          />
          <button
            className="chrome-btn chrome-close"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          />
        </div>
      </div>
    </header>
  );
}
