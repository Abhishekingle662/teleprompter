import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Store } from "@tauri-apps/plugin-store";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import "./App.css";

interface Settings {
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
}

interface Profile {
  name: string;
  settings: Settings;
}

function App() {
  const [text, setText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [settings, setSettings] = useState<Settings>({
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
  });
  const [showControls, setShowControls] = useState(true);
  const [clickThrough, setClickThrough] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [scrollMode, setScrollMode] = useState<"continuous" | "karaoke">("continuous");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<string>("");
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  
  const textContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const store = useRef<Store | null>(null);
  const holdInteractRef = useRef<boolean>(false);

  // Initialize store and load settings
  useEffect(() => {
    const initStore = async () => {
      store.current = await Store.load("settings.json");
      await loadSettings();
      await loadProfiles();
      await loadSession();
    };
    initStore();
  }, []);

  // Register global shortcuts
  useEffect(() => {
    const registerShortcuts = async () => {
      try {
        await register("CommandOrControl+Space", () => {
          togglePlayPause();
        });
        await register("CommandOrControl+Up", () => {
          updateSettings({ ...settings, wpm: Math.min(settings.wpm + 10, 500) });
        });
        await register("CommandOrControl+Down", () => {
          updateSettings({ ...settings, wpm: Math.max(settings.wpm - 10, 10) });
        });
        await register("CommandOrControl+Shift+O", () => {
          updateSettings({ ...settings, opacity: Math.max(settings.opacity - 0.1, 0.1) });
        });
        await register("CommandOrControl+Shift+P", () => {
          updateSettings({ ...settings, opacity: Math.min(settings.opacity + 0.1, 1.0) });
        });
      } catch (error) {
        console.error("Failed to register shortcuts:", error);
      }
    };

    registerShortcuts();

    return () => {
      unregister("CommandOrControl+Space").catch(console.error);
      unregister("CommandOrControl+Up").catch(console.error);
      unregister("CommandOrControl+Down").catch(console.error);
      unregister("CommandOrControl+Shift+O").catch(console.error);
      unregister("CommandOrControl+Shift+P").catch(console.error);
    };
  }, [settings]);

  // Scroll animation
  useEffect(() => {
    if (isPlaying && !isCountingDown) {
      const wordsPerSecond = settings.wpm / 60;
      const pixelsPerWord = settings.font_size * 0.7;
      const pixelsPerSecond = wordsPerSecond * pixelsPerWord;
      const intervalMs = 16; // ~60fps
      const pixelsPerInterval = (pixelsPerSecond * intervalMs) / 1000;

      scrollIntervalRef.current = setInterval(() => {
        setScrollPosition((prev) => prev + pixelsPerInterval);
      }, intervalMs);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isPlaying, isCountingDown, settings.wpm, settings.font_size]);

  // Apply scroll position
  useEffect(() => {
    if (textContainerRef.current) {
      textContainerRef.current.scrollTop = scrollPosition;
      
      // Calculate scroll progress
      const element = textContainerRef.current;
      const maxScroll = element.scrollHeight - element.clientHeight;
      if (maxScroll > 0) {
        setScrollProgress((scrollPosition / maxScroll) * 100);
      }
    }
  }, [scrollPosition]);

  // Countdown timer
  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isCountingDown && countdown === 0) {
      setIsCountingDown(false);
      setIsPlaying(true);
    }
  }, [countdown, isCountingDown]);

  // Handle mouse events for hold-to-interact
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        holdInteractRef.current = true;
        if (clickThrough) {
          invoke("set_click_through", { enabled: false });
        }
      }
    };

    const handleMouseUp = () => {
      if (holdInteractRef.current) {
        holdInteractRef.current = false;
        if (clickThrough) {
          invoke("set_click_through", { enabled: true });
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPlaying || isCountingDown) {
          setIsPlaying(false);
          setIsCountingDown(false);
        } else {
          setShowControls(!showControls);
        }
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [clickThrough, isPlaying, isCountingDown, showControls]);

  const loadSettings = async () => {
    try {
      const savedSettings = await store.current?.get<Settings>("settings");
      if (savedSettings) {
        setSettings(savedSettings);
        updateSettings(savedSettings);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await store.current?.set("settings", newSettings);
      await store.current?.save();
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const loadProfiles = async () => {
    try {
      const savedProfiles = await store.current?.get<Profile[]>("profiles");
      if (savedProfiles) {
        setProfiles(savedProfiles);
      }
    } catch (error) {
      console.error("Failed to load profiles:", error);
    }
  };

  const saveProfiles = async (newProfiles: Profile[]) => {
    try {
      await store.current?.set("profiles", newProfiles);
      await store.current?.save();
    } catch (error) {
      console.error("Failed to save profiles:", error);
    }
  };

  const loadSession = async () => {
    try {
      const session = await store.current?.get<{ text: string; position: number }>("session");
      if (session) {
        setText(session.text);
        setScrollPosition(session.position);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const saveSession = async () => {
    try {
      await store.current?.set("session", { text, position: scrollPosition });
      await store.current?.save();
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  };

  const updateSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
    await invoke("update_settings", { settings: newSettings });
    await invoke("set_opacity", { opacity: newSettings.opacity });
  };

  const togglePlayPause = () => {
    if (!isPlaying && !isCountingDown) {
      // Start countdown if configured
      if (countdown > 0) {
        setIsCountingDown(true);
      } else {
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(false);
      setIsCountingDown(false);
    }
  };

  const handleImportFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Text Files",
            extensions: ["txt", "md"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        const content = await readTextFile(selected);
        setText(content);
        setScrollPosition(0);
      }
    } catch (error) {
      console.error("Failed to import file:", error);
    }
  };

  const toggleClickThrough = async () => {
    try {
      const newState = await invoke<boolean>("toggle_click_through");
      setClickThrough(newState);
    } catch (error) {
      console.error("Failed to toggle click-through:", error);
    }
  };

  const saveProfile = async () => {
    const name = prompt("Profile name:");
    if (name) {
      const newProfile: Profile = { name, settings };
      const updatedProfiles = [...profiles, newProfile];
      setProfiles(updatedProfiles);
      await saveProfiles(updatedProfiles);
      setCurrentProfile(name);
    }
  };

  const loadProfile = async (profileName: string) => {
    const profile = profiles.find((p) => p.name === profileName);
    if (profile) {
      await updateSettings(profile.settings);
      setCurrentProfile(profileName);
    }
  };

  const textStyle: React.CSSProperties = {
    fontFamily: settings.font_family,
    fontSize: `${settings.font_size}px`,
    filter: settings.blur > 0 ? `blur(${settings.blur}px)` : "none",
    transform: settings.mirror ? "scaleX(-1)" : "none",
    paddingTop: `${settings.margin_top}px`,
    paddingBottom: `${settings.margin_bottom}px`,
    paddingLeft: `${settings.margin_left}px`,
    paddingRight: `${settings.margin_right}px`,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    color: "white",
  };

  return (
    <div className="app">
      {/* Playback status indicator */}
      {!showControls && (isPlaying || isCountingDown) && (
        <div className="status-indicator">
          {isCountingDown ? `Starting in ${countdown}...` : "● Playing"}
          {isPlaying && ` - ${Math.round(scrollProgress)}%`}
        </div>
      )}

      {isCountingDown && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdown}</div>
        </div>
      )}

      {showControls && (
        <div className="controls-panel">
          <div className="control-section">
            <h3>Text</h3>
            <button onClick={handleImportFile}>Import File</button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your text here or import a file..."
              rows={5}
            />
          </div>

          <div className="control-section">
            <h3>Playback</h3>
            <button onClick={togglePlayPause}>
              {isPlaying ? "Pause" : "Play"} (Ctrl+Space)
            </button>
            <button onClick={() => setScrollPosition(0)}>Reset</button>
            <label>
              Countdown (s):
              <input
                type="number"
                value={countdown === 0 ? "" : countdown}
                onChange={(e) => setCountdown(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                placeholder="0"
                min={0}
                max={10}
              />
            </label>
            <label>
              Mode:
              <select value={scrollMode} onChange={(e) => setScrollMode(e.target.value as any)}>
                <option value="continuous">Continuous</option>
                <option value="karaoke">Karaoke</option>
              </select>
            </label>
          </div>

          <div className="control-section">
            <h3>Speed</h3>
            <label>
              WPM: {settings.wpm}
              <input
                type="range"
                min={10}
                max={500}
                value={settings.wpm}
                onChange={(e) => updateSettings({ ...settings, wpm: parseInt(e.target.value) })}
              />
            </label>
          </div>

          <div className="control-section">
            <h3>Font</h3>
            <label>
              Family:
              <select
                value={settings.font_family}
                onChange={(e) => updateSettings({ ...settings, font_family: e.target.value })}
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
                type="range"
                min={12}
                max={200}
                value={settings.font_size}
                onChange={(e) => updateSettings({ ...settings, font_size: parseInt(e.target.value) })}
              />
            </label>
          </div>

          <div className="control-section">
            <h3>Appearance</h3>
            <label>
              Opacity: {settings.opacity.toFixed(2)}
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.1}
                value={settings.opacity}
                onChange={(e) => updateSettings({ ...settings, opacity: parseFloat(e.target.value) })}
              />
            </label>
            <label>
              Blur: {settings.blur}px
              <input
                type="range"
                min={0}
                max={10}
                value={settings.blur}
                onChange={(e) => updateSettings({ ...settings, blur: parseInt(e.target.value) })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.mirror}
                onChange={(e) => updateSettings({ ...settings, mirror: e.target.checked })}
              />
              Mirror Text
            </label>
          </div>

          <div className="control-section">
            <h3>Margins</h3>
            <label>
              Top: {settings.margin_top}px
              <input
                type="range"
                min={0}
                max={300}
                value={settings.margin_top}
                onChange={(e) => updateSettings({ ...settings, margin_top: parseInt(e.target.value) })}
              />
            </label>
            <label>
              Bottom: {settings.margin_bottom}px
              <input
                type="range"
                min={0}
                max={300}
                value={settings.margin_bottom}
                onChange={(e) => updateSettings({ ...settings, margin_bottom: parseInt(e.target.value) })}
              />
            </label>
            <label>
              Left: {settings.margin_left}px
              <input
                type="range"
                min={0}
                max={300}
                value={settings.margin_left}
                onChange={(e) => updateSettings({ ...settings, margin_left: parseInt(e.target.value) })}
              />
            </label>
            <label>
              Right: {settings.margin_right}px
              <input
                type="range"
                min={0}
                max={300}
                value={settings.margin_right}
                onChange={(e) => updateSettings({ ...settings, margin_right: parseInt(e.target.value) })}
              />
            </label>
          </div>

          <div className="control-section">
            <h3>Focus Band</h3>
            <label>
              <input
                type="checkbox"
                checked={settings.focus_band_enabled}
                onChange={(e) => updateSettings({ ...settings, focus_band_enabled: e.target.checked })}
              />
              Enable Focus Band
            </label>
            <label>
              Position: {settings.focus_band_position}%
              <input
                type="range"
                min={0}
                max={100}
                value={settings.focus_band_position}
                onChange={(e) => updateSettings({ ...settings, focus_band_position: parseInt(e.target.value) })}
              />
            </label>
            <label>
              Height: {settings.focus_band_height}%
              <input
                type="range"
                min={5}
                max={50}
                value={settings.focus_band_height}
                onChange={(e) => updateSettings({ ...settings, focus_band_height: parseInt(e.target.value) })}
              />
            </label>
          </div>

          <div className="control-section">
            <h3>Window</h3>
            <button onClick={toggleClickThrough}>
              {clickThrough ? "Disable" : "Enable"} Click-Through
            </button>
            <button onClick={() => setShowControls(false)}>Hide Controls</button>
            <button onClick={saveSession}>Save Session</button>
          </div>

          <div className="control-section">
            <h3>Profiles</h3>
            <button onClick={saveProfile}>Save Profile</button>
            <select
              value={currentProfile}
              onChange={(e) => loadProfile(e.target.value)}
            >
              <option value="">Select Profile</option>
              {profiles.map((profile) => (
                <option key={profile.name} value={profile.name}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!showControls && (
        <button
          className="show-controls-btn"
          onClick={() => setShowControls(true)}
        >
          Show Controls
        </button>
      )}

      <div
        className="text-container"
        ref={textContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          pointerEvents: clickThrough ? "none" : "auto",
        }}
      >
        {settings.focus_band_enabled && (
          <div
            className="focus-band"
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              top: `${settings.focus_band_position}%`,
              height: `${settings.focus_band_height}%`,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              pointerEvents: "none",
              zIndex: 100,
            }}
          />
        )}
        <div style={textStyle}>{text}</div>
      </div>
    </div>
  );
}

export default App;
