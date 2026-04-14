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
