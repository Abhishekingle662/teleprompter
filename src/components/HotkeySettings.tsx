import { useState } from "react";
import { HotkeyMap, HOTKEY_LABELS, DEFAULT_HOTKEYS } from "../types";

interface HotkeySettingsProps {
  hotkeys: HotkeyMap;
  onChange: (hotkeys: HotkeyMap) => void;
  onClose: () => void;
}

export function HotkeySettings({ hotkeys, onChange, onClose }: HotkeySettingsProps) {
  const [capturing, setCapturing] = useState<keyof HotkeyMap | null>(null);
  const [capturedKeys, setCapturedKeys] = useState<string>("");

  const handleKeyDown = (e: React.KeyboardEvent, action: keyof HotkeyMap) => {
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");

    const key = e.key;
    // Skip modifier-only keypresses
    if (["Control", "Meta", "Shift", "Alt"].includes(key)) return;

    // Map special keys to Tauri accelerator names
    const keyMap: Record<string, string> = {
      " ": "Space", ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
      "=": "Equal", "-": "Minus", "[": "BracketLeft", "]": "BracketRight",
      Enter: "Return", Escape: "Escape", Backspace: "Backspace", Tab: "Tab",
    };
    const mappedKey = keyMap[key] ?? key.toUpperCase();
    parts.push(mappedKey);

    const combo = parts.join("+");
    setCapturedKeys(combo);
    onChange({ ...hotkeys, [action]: combo });
    setCapturing(null);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px", width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 className="dialog-title" style={{ margin: 0 }}>⌨️ Configure Hotkeys</h3>
          <button
            onClick={() => { onChange(DEFAULT_HOTKEYS); }}
            style={{ fontSize: "11px", padding: "4px 8px", background: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.3)", borderRadius: "4px", color: "#ff8888", cursor: "pointer" }}
          >
            Reset to defaults
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {(Object.keys(hotkeys) as Array<keyof HotkeyMap>).map((action) => (
            <div key={action} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "13px", color: "#ccc", flex: 1 }}>{HOTKEY_LABELS[action]}</span>
              <button
                onKeyDown={capturing === action ? (e) => handleKeyDown(e, action) : undefined}
                onClick={() => { setCapturing(action); setCapturedKeys(""); }}
                onBlur={() => setCapturing(null)}
                style={{
                  minWidth: "180px", padding: "6px 10px", fontSize: "12px", textAlign: "center",
                  background: capturing === action ? "rgba(97,218,251,0.15)" : "rgba(0,0,0,0.3)",
                  border: `1px solid ${capturing === action ? "#61dafb" : "rgba(97,218,251,0.3)"}`,
                  borderRadius: "4px", color: capturing === action ? "#61dafb" : "#e0e0e0",
                  cursor: "pointer", fontFamily: "monospace",
                  outline: capturing === action ? "2px solid rgba(97,218,251,0.4)" : "none",
                }}
              >
                {capturing === action
                  ? (capturedKeys || "Press keys…")
                  : hotkeys[action].replace("CommandOrControl", "Ctrl/Cmd")}
              </button>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "#666", marginBottom: "16px" }}>
          Click a button then press your desired key combination. Changes apply immediately after re-launch.
        </p>
        <button className="dialog-button dialog-button-confirm" onClick={onClose} style={{ width: "100%" }}>
          Done
        </button>
      </div>
    </div>
  );
}
