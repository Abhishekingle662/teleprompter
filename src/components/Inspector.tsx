import { useState } from "react";
import { Settings } from "../types";

type MonitorInfo = { index: number; name: string; x: number; y: number; width: number; height: number };

type Tab = "type" | "speed" | "stage" | "output";

interface InspectorProps {
  // Settings
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  // Fonts
  importedFonts: Array<{ name: string; dataUrl: string }>;
  onImportFont: () => void;
  // Playback (speed-related, not transport)
  countdown: number;
  onCountdownChange: (v: number) => void;
  scrollMode: "continuous" | "karaoke";
  onScrollModeChange: (m: "continuous" | "karaoke") => void;
  scrollProgress: number;
  // Cues
  cues: Array<{ label: string; lineIndex: number }>;
  onJumpToCue: (lineIndex: number) => void;
  // Output / window
  clickThrough: boolean;
  skipTaskbar: boolean;
  monitors: MonitorInfo[];
  onToggleClickThrough: () => void;
  onToggleSkipTaskbar: () => void;
  onMoveToMonitor: (index: number) => void;
  onSaveSession: () => void;
  onConfigureHotkeys: () => void;
  wsInfo: { ip: string; port: number } | null;
  // Word stats
  wordCount: number;
}

export function Inspector(props: InspectorProps) {
  const [tab, setTab] = useState<Tab>("type");

  return (
    <>
      <div className="inspector-tabs">
        {(["type", "speed", "stage", "output"] as Tab[]).map((t) => (
          <button
            key={t}
            className="inspector-tab"
            data-active={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="inspector-body">
        {tab === "type" && <TypeTab {...props} />}
        {tab === "speed" && <SpeedTab {...props} />}
        {tab === "stage" && <StageTab {...props} />}
        {tab === "output" && <OutputTab {...props} />}
      </div>
    </>
  );
}

/* ── Type tab ─────────────────────────────────────────────────── */
function TypeTab({ settings, onSettingsChange, importedFonts, onImportFont }: InspectorProps) {
  const set = (patch: Partial<Settings>) => onSettingsChange({ ...settings, ...patch });

  return (
    <>
      <div className="field">
        <div className="field-label">
          Font family
        </div>
        <select
          value={settings.font_family}
          onChange={(e) => set({ font_family: e.target.value })}
        >
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          {importedFonts.length > 0 && (
            <optgroup label="Imported">
              {importedFonts.map((f) => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </optgroup>
          )}
        </select>
        <button className="btn btn-ghost btn-full" onClick={onImportFont} style={{ marginTop: 6 }}>
          + Import font
        </button>
      </div>

      <div className="field">
        <div className="field-label">
          <span>Size</span>
          <span className="field-value">{settings.font_size}px</span>
        </div>
        <input
          type="range" min={12} max={200} value={settings.font_size}
          onChange={(e) => set({ font_size: parseInt(e.target.value) })}
        />
      </div>

      <div className="field">
        <div className="field-label">Text color</div>
        <input
          type="color" value={settings.text_color}
          onChange={(e) => set({ text_color: e.target.value })}
        />
      </div>

      <div className="field">
        <div className="field-label">
          <span>Opacity</span>
          <span className="field-value">{settings.opacity.toFixed(2)}</span>
        </div>
        <input
          type="range" min={0.1} max={1.0} step={0.05} value={settings.opacity}
          onChange={(e) => set({ opacity: parseFloat(e.target.value) })}
        />
      </div>

      <div className="field">
        <div className="field-label">
          <span>Blur</span>
          <span className="field-value">{settings.blur}px</span>
        </div>
        <input
          type="range" min={0} max={10} value={settings.blur}
          onChange={(e) => set({ blur: parseInt(e.target.value) })}
        />
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox" checked={settings.mirror}
          onChange={(e) => set({ mirror: e.target.checked })}
        />
        Mirror text (for beam splitter)
      </label>
    </>
  );
}

/* ── Speed tab ────────────────────────────────────────────────── */
function SpeedTab({
  settings, onSettingsChange,
  countdown, onCountdownChange,
  scrollMode, onScrollModeChange,
  wordCount,
}: InspectorProps) {
  const set = (patch: Partial<Settings>) => onSettingsChange({ ...settings, ...patch });
  const totalSecs = wordCount > 0 ? Math.round((wordCount / settings.wpm) * 60) : 0;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;

  return (
    <>
      <div className="field">
        <div className="field-label">
          <span>Words per minute</span>
          <span className="field-value">{settings.wpm}</span>
        </div>
        <input
          type="range" min={10} max={500} value={settings.wpm}
          onChange={(e) => set({ wpm: parseInt(e.target.value) })}
        />
        {wordCount > 0 && (
          <div className="field-hint">
            {wordCount.toLocaleString()} words · {mins}:{String(secs).padStart(2, "0")} at {settings.wpm} WPM
          </div>
        )}
      </div>

      <div className="field">
        <div className="field-label">
          <span>Countdown</span>
          <span className="field-value">{countdown}s</span>
        </div>
        <input
          type="range" min={0} max={10} value={countdown}
          onChange={(e) => onCountdownChange(parseInt(e.target.value))}
        />
        <div className="field-hint">Seconds shown before playback begins.</div>
      </div>

      <div className="field">
        <div className="field-label">Scroll mode</div>
        <select
          value={scrollMode}
          onChange={(e) => onScrollModeChange(e.target.value as "continuous" | "karaoke")}
        >
          <option value="continuous">Continuous</option>
          <option value="karaoke">Karaoke (word highlight)</option>
        </select>
      </div>
    </>
  );
}

/* ── Stage tab ────────────────────────────────────────────────── */
function StageTab({ settings, onSettingsChange, cues, onJumpToCue }: InspectorProps) {
  const set = (patch: Partial<Settings>) => onSettingsChange({ ...settings, ...patch });

  return (
    <>
      <div className="field-group">
        <div className="field-group-title">Margins</div>
        {(["margin_top", "margin_bottom", "margin_left", "margin_right"] as const).map((key) => {
          const label = key.replace("margin_", "");
          return (
            <div className="field" key={key}>
              <div className="field-label">
                <span>{label}</span>
                <span className="field-value">{settings[key]}px</span>
              </div>
              <input
                type="range" min={0} max={300} value={settings[key]}
                onChange={(e) => set({ [key]: parseInt(e.target.value) } as Partial<Settings>)}
              />
            </div>
          );
        })}
      </div>

      <div className="field-group">
        <div className="field-group-title">Focus band</div>
        <label className="checkbox-row">
          <input
            type="checkbox" checked={settings.focus_band_enabled}
            onChange={(e) => set({ focus_band_enabled: e.target.checked })}
          />
          Enable focus band
        </label>
        <div className="field">
          <div className="field-label">
            <span>Position</span>
            <span className="field-value">{settings.focus_band_position}%</span>
          </div>
          <input
            type="range" min={0} max={100} value={settings.focus_band_position}
            onChange={(e) => set({ focus_band_position: parseInt(e.target.value) })}
          />
        </div>
        <div className="field">
          <div className="field-label">
            <span>Height</span>
            <span className="field-value">{settings.focus_band_height}%</span>
          </div>
          <input
            type="range" min={5} max={50} value={settings.focus_band_height}
            onChange={(e) => set({ focus_band_height: parseInt(e.target.value) })}
          />
        </div>
      </div>

      {cues.length > 0 && (
        <div className="field-group">
          <div className="field-group-title">Cue markers</div>
          <div className="cue-list">
            {cues.map((cue) => (
              <button
                key={`${cue.lineIndex}-${cue.label}`}
                className="cue-jump"
                onClick={() => onJumpToCue(cue.lineIndex)}
                title={`Jump to "${cue.label}"`}
              >
                ▶ {cue.label}
              </button>
            ))}
          </div>
          <div className="field-hint">
            Click to jump. Add <code>[CUE: Label]</code> lines in your script.
          </div>
        </div>
      )}
    </>
  );
}

/* ── Output tab ───────────────────────────────────────────────── */
function OutputTab({
  clickThrough, skipTaskbar, monitors,
  onToggleClickThrough, onToggleSkipTaskbar, onMoveToMonitor,
  onSaveSession, onConfigureHotkeys, wsInfo,
}: InspectorProps) {
  return (
    <>
      <div className="field-group">
        <div className="field-group-title">Window</div>
        <button
          className="btn btn-ghost btn-full"
          onClick={onToggleClickThrough}
          style={{ marginBottom: 6 }}
        >
          {clickThrough ? "Disable" : "Enable"} click-through
        </button>
        <div className="field-hint" style={{ marginBottom: 10 }}>
          Lets clicks pass through to apps behind the window.
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={skipTaskbar}
            onChange={onToggleSkipTaskbar}
          />
          Hide from taskbar
        </label>
      </div>

      {monitors.length > 1 && (
        <div className="field-group">
          <div className="field-group-title">Monitor</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {monitors.map((m) => (
              <button
                key={m.index}
                className="btn btn-ghost"
                onClick={() => onMoveToMonitor(m.index)}
                title={`${m.name} (${m.width}×${m.height})`}
              >
                {m.index + 1}
              </button>
            ))}
          </div>
          <div className="field-hint" style={{ marginTop: 6 }}>
            Move the window to a different display.
          </div>
        </div>
      )}

      {wsInfo && wsInfo.port !== 0 && (
        <div className="field-group">
          <div className="field-group-title">Phone remote</div>
          <div className="ws-info">ws://{wsInfo.ip}:{wsInfo.port}</div>
          <div className="field-hint" style={{ marginTop: 6 }}>
            Connect a WebSocket client and send <code>{`{"action":"play"}`}</code>.
          </div>
        </div>
      )}

      <div className="field-group">
        <div className="field-group-title">Session</div>
        <button className="btn btn-ghost btn-full" onClick={onSaveSession} style={{ marginBottom: 6 }}>
          Save session
        </button>
        <button className="btn btn-ghost btn-full" onClick={onConfigureHotkeys}>
          Configure hotkeys
        </button>
      </div>
    </>
  );
}
