export interface Settings {
  font_family: string;
  font_size: number;
  wpm: number;
  opacity: number;
  blur: number;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  mirror: boolean;
  focus_band_enabled: boolean;
  focus_band_position: number;
  focus_band_height: number;
  text_color: string;
}

export interface LoadedFile {
  id: string;
  name: string;
  path: string;
  content: string;
  loadedAt: Date;
}

export interface Notification {
  show: boolean;
  message: string;
  type: "success" | "error" | "info";
}

export interface ConfirmDialog {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface InputDialog {
  show: boolean;
  title: string;
  placeholder: string;
  defaultValue: string;
  onConfirm: (value: string) => void;
}

export interface NewFileDialog {
  show: boolean;
  filename: string;
  content: string;
}

export interface HotkeyMap {
  playPause: string;
  speedUp: string;
  speedDown: string;
  fontSizeUp: string;
  fontSizeDown: string;
  toggleClickThrough: string;
  toggleFileManager: string;
}

export const DEFAULT_HOTKEYS: HotkeyMap = {
  playPause: "CommandOrControl+Space",
  speedUp: "CommandOrControl+Up",
  speedDown: "CommandOrControl+Down",
  fontSizeUp: "CommandOrControl+Equal",
  fontSizeDown: "CommandOrControl+Minus",
  toggleClickThrough: "CommandOrControl+I",
  toggleFileManager: "CommandOrControl+F",
};

export const HOTKEY_LABELS: Record<keyof HotkeyMap, string> = {
  playPause: "Play / Pause",
  speedUp: "Speed Up (+10 WPM)",
  speedDown: "Speed Down (-10 WPM)",
  fontSizeUp: "Font Size Up (+2px)",
  fontSizeDown: "Font Size Down (-2px)",
  toggleClickThrough: "Toggle Click-Through",
  toggleFileManager: "Toggle File Manager",
};

/** A cue marker parsed from `[CUE: Label]` syntax in the script text. */
export interface Cue {
  label: string;
  /** Line index (0-based) in the split-by-newline array. */
  lineIndex: number;
}

/**
 * Parse all `[CUE: Label]` markers from script text.
 * Returns one entry per matching line, in document order.
 */
export function parseCues(text: string): Cue[] {
  const cues: Cue[] = [];
  const lines = text.split("\n");
  const re = /\[CUE:\s*(.+?)\]/i;
  lines.forEach((line, i) => {
    const m = re.exec(line);
    if (m) cues.push({ label: m[1].trim(), lineIndex: i });
  });
  return cues;
}

export const DEFAULT_SETTINGS: Settings = {
  font_family: "Arial",
  font_size: 48,
  wpm: 150,
  opacity: 1.0,
  blur: 0,
  margin_top: 50,
  margin_bottom: 50,
  margin_left: 50,
  margin_right: 50,
  mirror: false,
  focus_band_enabled: false,
  focus_band_position: 50,
  focus_band_height: 20,
  text_color: "#ffffff",
};
