import { ConfirmDialog, InputDialog, NewFileDialog, Notification } from "../types";

// ── Notification Toast ────────────────────────────────────────────────────────

interface NotificationToastProps {
  notification: Notification | null;
}

export function NotificationToast({ notification }: NotificationToastProps) {
  if (!notification?.show) return null;
  return (
    <div className={`notification notification-${notification.type}`}>
      <span className="notification-icon">
        {notification.type === "success" && "✓"}
        {notification.type === "error" && "✕"}
        {notification.type === "info" && "ℹ"}
      </span>
      <span className="notification-message">{notification.message}</span>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  dialog: ConfirmDialog | null;
  onClose: () => void;
}

export function ConfirmDialogModal({ dialog, onClose }: ConfirmDialogProps) {
  if (!dialog?.show) return null;
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">{dialog.title}</h3>
        <p className="dialog-message">{dialog.message}</p>
        <div className="dialog-buttons">
          <button className="dialog-button dialog-button-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="dialog-button dialog-button-confirm" onClick={dialog.onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Input Dialog ──────────────────────────────────────────────────────────────

interface InputDialogProps {
  dialog: InputDialog | null;
  onClose: () => void;
}

export function InputDialogModal({ dialog, onClose }: InputDialogProps) {
  if (!dialog?.show) return null;
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">{dialog.title}</h3>
        <input
          type="text"
          className="dialog-input"
          placeholder={dialog.placeholder}
          defaultValue={dialog.defaultValue}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") dialog.onConfirm(e.currentTarget.value);
            else if (e.key === "Escape") onClose();
          }}
        />
        <div className="dialog-buttons">
          <button className="dialog-button dialog-button-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="dialog-button dialog-button-confirm"
            onClick={(e) => {
              const input = e.currentTarget.parentElement
                ?.previousElementSibling as HTMLInputElement | null;
              if (input) dialog.onConfirm(input.value);
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New File Dialog ───────────────────────────────────────────────────────────

interface NewFileDialogProps {
  dialog: NewFileDialog | null;
  onChange: (dialog: NewFileDialog) => void;
  onClose: () => void;
  onSave: () => void;
}

export function NewFileDialogModal({ dialog, onChange, onClose, onSave }: NewFileDialogProps) {
  if (!dialog?.show) return null;
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px", width: "90%" }}
      >
        <h3 className="dialog-title">Create New Script</h3>
        <input
          type="text"
          className="dialog-input"
          placeholder="Enter filename (e.g., my-script.txt)..."
          value={dialog.filename}
          onChange={(e) => onChange({ ...dialog, filename: e.target.value })}
          autoFocus
          style={{ marginBottom: "10px" }}
        />
        <textarea
          className="dialog-input"
          placeholder="Write your script here..."
          value={dialog.content}
          onChange={(e) => onChange({ ...dialog, content: e.target.value })}
          rows={15}
          style={{ resize: "vertical", minHeight: "200px", fontFamily: "inherit", fontSize: "14px", lineHeight: "1.5" }}
        />
        <div className="dialog-buttons">
          <button className="dialog-button dialog-button-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="dialog-button dialog-button-confirm" onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Maximized Textarea Modal ──────────────────────────────────────────────────

interface MaximizedEditorProps {
  text: string;
  onChange: (text: string) => void;
  onClose: () => void;
}

export function MaximizedEditor({ text, onChange, onClose }: MaximizedEditorProps) {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "95vw", width: "95vw", height: "90vh", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3 className="dialog-title" style={{ margin: 0 }}>Script Editor</h3>
          <div style={{ fontSize: "12px", color: "rgba(97, 218, 251, 0.7)" }}>
            {text.length} characters · {text.split(/\n/).length} lines
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your script here..."
          autoFocus
          style={{
            flex: 1, width: "100%", padding: "16px", fontSize: "16px", lineHeight: "1.8",
            backgroundColor: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(97, 218, 251, 0.3)",
            borderRadius: "6px", color: "#e0e0e0", resize: "none",
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace", marginBottom: "15px",
          }}
        />
        <div className="dialog-buttons">
          <button className="dialog-button dialog-button-confirm" onClick={onClose} style={{ width: "100%" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Keyboard Shortcuts Panel ──────────────────────────────────────────────────

interface ShortcutsPanelProps {
  onClose: () => void;
}

export function ShortcutsPanel({ onClose }: ShortcutsPanelProps) {
  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={onClose}>✕</button>
        </div>
        <div className="shortcuts-content">
          <div className="shortcuts-section">
            <h3>Playback Controls</h3>
            <div className="shortcut-item"><kbd>Ctrl</kbd> + <kbd>Space</kbd><span>Play / Pause</span></div>
            <div className="shortcut-item"><kbd>Esc</kbd><span>Stop playback or toggle controls</span></div>
          </div>
          <div className="shortcuts-section">
            <h3>Speed Adjustment</h3>
            <div className="shortcut-item"><kbd>Ctrl</kbd> + <kbd>↑</kbd><span>Increase speed (+10 WPM)</span></div>
            <div className="shortcut-item"><kbd>Ctrl</kbd> + <kbd>↓</kbd><span>Decrease speed (-10 WPM)</span></div>
          </div>
          <div className="shortcuts-section">
            <h3>Text Color</h3>
            <div className="shortcut-item"><kbd>Ctrl</kbd> + <kbd>[</kbd><span>Darken text color</span></div>
            <div className="shortcut-item"><kbd>Ctrl</kbd> + <kbd>]</kbd><span>Lighten text color</span></div>
          </div>
          <div className="shortcuts-section">
            <h3>Click-Through Mode</h3>
            <div className="shortcut-item"><kbd>Ctrl</kbd> + <kbd>I</kbd><span>Toggle click-through (when enabled)</span></div>
          </div>
          <div className="shortcuts-section">
            <h3>File Manager</h3>
            <div className="shortcut-item"><kbd>Ctrl</kbd> + <kbd>F</kbd><span>Toggle file manager panel</span></div>
          </div>
          <div className="shortcuts-note">
            <strong>Note:</strong> On macOS, use <kbd>Cmd</kbd> instead of <kbd>Ctrl</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
