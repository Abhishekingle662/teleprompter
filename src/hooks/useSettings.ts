import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { Settings, DEFAULT_SETTINGS } from "../types";

const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function useSettings(store: React.MutableRefObject<Store | null>) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const saveSettings = async (newSettings: Settings) => {
    try {
      await store.current?.set("settings", newSettings);
      await store.current?.save();
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = (newSettings: Settings) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveSettings(newSettings), 300);
  };

  const updateSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    debouncedSave(newSettings);
    if (IS_TAURI) {
      await invoke("update_settings", { settings: newSettings });
    }
  };

  const loadSettings = async () => {
    try {
      const saved = await store.current?.get<Settings>("settings");
      if (saved) {
        const migrated: Settings = { ...saved, text_color: saved.text_color ?? "#ffffff" };
        setSettings(migrated);
        await saveSettings(migrated);
        if (IS_TAURI) await invoke("update_settings", { settings: migrated });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  return { settings, settingsRef, updateSettings, loadSettings };
}
