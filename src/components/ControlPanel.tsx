import { Settings } from "../types";

interface MonitorInfo {
  index: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ControlPanelProps {
  // Text
  text: string;
  onTextChange: (text: string) => void;
  onNewFile: () => void;
  onImportFile: () => void;
  onSaveScript: () => void;
  onMaximizeEditor: () => void;
  // Playback
  isPlaying: boolean;
  isCountingDown: boolean;
  countdown: number;
  scrollMode: "continuous" | "karaoke";
  onTogglePlayPause: () => void;
  onReset: () => void;
  onCountdownChange: (value: number) => void;
  onScrollModeChange: (mode: "continuous" | "karaoke") => void;
  // Settings
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  // Window
  clickThrough: boolean;
  skipTaskbar: boolean;
  monitors: MonitorInfo[];
  onToggleClickThrough: () => void;
  onToggleSkipTaskbar: () => void;
  onMoveToMonitor: (index: number) => void;
  onHideControls: () => void;
  onSaveSession: () => void;
  onShowShortcuts: () => void;
  // Window chrome
  onDragStart: (e: React.MouseEvent) => void;
  onMinimize: (e: React.MouseEvent) => void;
  onMaximize: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
}

export function ControlPanel({
  text, onTextChange, onNewFile, onImportFile, onSaveScript, onMaximizeEditor,
  isPlaying, countdown, scrollMode,
  onTogglePlayPause, onReset, onCountdownChange, onScrollModeChange,
  settings, onSettingsChange,
  clickThrough, skipTaskbar, monitors,
  onToggleClickThrough, onToggleSkipTaskbar, onMoveToMonitor,
  onHideControls, onSaveSession, onShowShortcuts,
  onDragStart, onMinimize, onMaximize, onClose,
}: ControlPanelProps) {
  return (
    <div className="controls-panel">
      {/* Drag header with window controls */}
      <div className="drag-header" data-tauri-drag-region onMouseDown={onDragStart}>
        <h2>Teleprompter Controls</h2>
        <div className="window-controls">
          <button
            className="window-button minimize"
            onClick={onMinimize}
            onMouseDown={(e) => e.stopPropagation()}
            title="Minimize"
          >─</button>
          <button
            className="window-button maximize"
            onClick={onMaximize}
            onMouseDown={(e) => e.stopPropagation()}
            title="Maximize"
          >☐</button>
          <button
            className="window-button close"
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            title="Close"
          >✕</button>
        </div>
      </div>

      {/* Text section */}
      <div className="control-section">
        <h3>Text</h3>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <button onClick={onNewFile}>New File</button>
          <button onClick={onImportFile}>Import File</button>
          <button onClick={onSaveScript}>Save Script</button>
        </div>
        <div style={{ position: "relative" }}>
          <button
            onClick={onMaximizeEditor}
            title="Maximize editor"
            style={{
              position: "absolute", top: "8px", right: "8px", zIndex: 10,
              background: "rgba(0, 0, 0, 0.6)", border: "1px solid rgba(97, 218, 251, 0.4)",
              color: "#61dafb", width: "28px", height: "28px", borderRadius: "4px",
              cursor: "pointer", fontSize: "16px", display: "flex",
              alignItems: "center", justifyContent: "center", padding: 0, transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(97, 218, 251, 0.2)";
              e.currentTarget.style.borderColor = "#61dafb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)";
              e.currentTarget.style.borderColor = "rgba(97, 218, 251, 0.4)";
            }}
          >⛶</button>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste your script here, import a file, or create a new one..."
            rows={5}
            style={{
              width: "100%", padding: "12px", fontSize: "14px", lineHeight: "1.6",
              backgroundColor: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(97, 218, 251, 0.3)",
              borderRadius: "6px", color: "#e0e0e0", resize: "vertical",
              fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            }}
          />
          <div style={{ fontSize: "11px", color: "rgba(97, 218, 251, 0.6)", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
            <span>{text.length} characters</span>
            <span>{text.split(/\n/).length} lines</span>
          </div>
        </div>
      </div>

      {/* Playback section */}
      <div className="control-section">
        <h3>Playback</h3>
        <button onClick={onTogglePlayPause}>
          {isPlaying ? "Pause" : "Play"} (Ctrl+Space)
        </button>
        <button onClick={onReset}>Reset</button>
        <label>
          Countdown (s):
          <input
            type="number"
            value={countdown === 0 ? "" : countdown}
            onChange={(e) => onCountdownChange(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
            placeholder="0"
            min={0}
            max={10}
          />
        </label>
        <label>
          Mode:
          <select
            value={scrollMode}
            onChange={(e) => onScrollModeChange(e.target.value as "continuous" | "karaoke")}
          >
            <option value="continuous">Continuous</option>
            <option value="karaoke">Karaoke</option>
          </select>
        </label>
        <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>
          • Set a countdown for controlled playback.
        </div>
      </div>

      {/* Speed section */}
      <div className="control-section">
        <h3>Speed</h3>
        <label>
          WPM: {settings.wpm}
          <input
            type="range" min={10} max={500} value={settings.wpm}
            onChange={(e) => onSettingsChange({ ...settings, wpm: parseInt(e.target.value) })}
          />
        </label>
        <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>
          • Control the playback speed.
        </div>
      </div>

      {/* Font section */}
      <div className="control-section">
        <h3>Font</h3>
        <label>
          Family:
          <select
            value={settings.font_family}
            onChange={(e) => onSettingsChange({ ...settings, font_family: e.target.value })}
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>
        </label>
        <label>
          Size: {settings.font_size}px
          <input
            type="range" min={12} max={200} value={settings.font_size}
            onChange={(e) => onSettingsChange({ ...settings, font_size: parseInt(e.target.value) })}
          />
        </label>
      </div>

      {/* Appearance section */}
      <div className="control-section">
        <h3>Appearance</h3>
        <label>
          Text Color:
          <input
            type="color" value={settings.text_color}
            onChange={(e) => onSettingsChange({ ...settings, text_color: e.target.value })}
            style={{ width: "100%", height: "40px", cursor: "pointer" }}
          />
        </label>
        <label>
          Opacity: {settings.opacity.toFixed(2)}
          <input
            type="range" min={0.1} max={1.0} step={0.1} value={settings.opacity}
            onChange={(e) => onSettingsChange({ ...settings, opacity: parseFloat(e.target.value) })}
          />
        </label>
        <label>
          Blur: {settings.blur}px
          <input
            type="range" min={0} max={10} value={settings.blur}
            onChange={(e) => onSettingsChange({ ...settings, blur: parseInt(e.target.value) })}
          />
        </label>
        <label>
          <input
            type="checkbox" checked={settings.mirror}
            onChange={(e) => onSettingsChange({ ...settings, mirror: e.target.checked })}
          />
          {" "}Mirror Text
        </label>
      </div>

      {/* Margins section */}
      <div className="control-section">
        <h3>Margins</h3>
        {(["margin_top", "margin_bottom", "margin_left", "margin_right"] as const).map((key) => {
          const label = key.replace("margin_", "").replace(/^\w/, (c) => c.toUpperCase());
          return (
            <label key={key}>
              {label}: {settings[key]}px
              <input
                type="range" min={0} max={300} value={settings[key]}
                onChange={(e) => onSettingsChange({ ...settings, [key]: parseInt(e.target.value) })}
              />
            </label>
          );
        })}
        <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>
          • Adjust the borders of the script.
        </div>
      </div>

      {/* Focus Band section */}
      <div className="control-section">
        <h3>Focus Band</h3>
        <label>
          <input
            type="checkbox" checked={settings.focus_band_enabled}
            onChange={(e) => onSettingsChange({ ...settings, focus_band_enabled: e.target.checked })}
          />
          {" "}Enable Focus Band
        </label>
        <label>
          Position: {settings.focus_band_position}%
          <input
            type="range" min={0} max={100} value={settings.focus_band_position}
            onChange={(e) => onSettingsChange({ ...settings, focus_band_position: parseInt(e.target.value) })}
          />
        </label>
        <label>
          Height: {settings.focus_band_height}%
          <input
            type="range" min={5} max={50} value={settings.focus_band_height}
            onChange={(e) => onSettingsChange({ ...settings, focus_band_height: parseInt(e.target.value) })}
          />
        </label>
        <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>
          • Enables focus mode.
        </div>
      </div>

      {/* Window section */}
      <div className="control-section">
        <h3>Window</h3>
        <button onClick={onToggleClickThrough}>
          {clickThrough ? "Disable" : "Enable"} Click-Through
        </button>
        <div style={{ fontSize: "11px", color: "#888", marginTop: "5px", marginBottom: "8px" }}>
          • Interact with background apps while on top.
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={skipTaskbar}
            onChange={onToggleSkipTaskbar}
          />
          Hide from taskbar
        </label>
        {monitors.length > 1 && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "6px" }}>
              Move to monitor:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {monitors.map((m) => (
                <button
                  key={m.index}
                  onClick={() => onMoveToMonitor(m.index)}
                  title={`${m.name} (${m.width}×${m.height})`}
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                >
                  Monitor {m.index + 1}
                  {m.name ? ` (${m.name})` : ""}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <button onClick={onHideControls}>Hide Controls</button>
          <button onClick={onSaveSession}>Save Session</button>
          <button onClick={onShowShortcuts}>⌨️ Keyboard Shortcuts</button>
        </div>
      </div>
    </div>
  );
}
