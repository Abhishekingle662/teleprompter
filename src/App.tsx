import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
  text_color: string;
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
    text_color: "#ffffff",
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
  const settingsRef = useRef<Settings>(settings);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isCountingDownRef = useRef<boolean>(isCountingDown);
  const countdownRef = useRef<number>(countdown);
  const lastShortcutTime = useRef<number>(0); // For debouncing
  const clickThroughRef = useRef<boolean>(clickThrough);

  // Keep refs in sync
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isCountingDownRef.current = isCountingDown;
  }, [isCountingDown]);

  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);

  useEffect(() => {
    clickThroughRef.current = clickThrough;
  }, [clickThrough]);

  // Helper function to adjust color brightness
  const adjustColorBrightness = (hexColor: string, amount: number): string => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    
    // Convert back to hex
    const newHex = '#' + 
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0');
    
    return newHex;
  };

  // Check if running in Tauri - use a more reliable method
  const isTauri = () => {
    // Check if we're in a browser or Tauri
    // In Tauri, window.__TAURI_INTERNALS__ exists or we can check if getCurrentWindow works
    try {
      // Try to get window instance - this will work in Tauri
      getCurrentWindow();
      return true;
    } catch {
      return false;
    }
  };

  // Handle window dragging
  const handleDragStart = async (e: React.MouseEvent) => {
    if (!isTauri()) return;
    e.preventDefault();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.startDragging();
    } catch (error) {
      console.error("Failed to start dragging:", error);
    }
  };

  // Window control handlers
  const handleMinimize = async (e: React.MouseEvent) => {
    if (!isTauri()) return;
    e.stopPropagation(); // Prevent drag from triggering
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  };

  const handleMaximize = async (e: React.MouseEvent) => {
    if (!isTauri()) return;
    e.stopPropagation(); // Prevent drag from triggering
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch (error) {
      console.error("Failed to maximize:", error);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    if (!isTauri()) return;
    e.stopPropagation(); // Prevent drag from triggering
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error("Failed to close:", error);
    }
  };

  // Initialize store and load settings
  useEffect(() => {
    const initStore = async () => {
      // Wait a bit for Tauri to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isTauri()) {
        console.warn("Not running in Tauri environment. Run with 'npm run tauri dev'");
        return;
      }
      
      store.current = await Store.load("settings.json");
      await loadSettings();
      await loadProfiles();
      await loadSession();
    };
    initStore();
  }, []);

  // Track shortcut registration across hot reloads
  const shortcutsRegisteredRef = useRef(false);

  // Register global shortcuts
  useEffect(() => {
    let registered = false;
    let isRegistering = false;
    
    const registerShortcuts = async () => {
      if (isRegistering || shortcutsRegisteredRef.current) return; // Prevent concurrent/duplicate registration
      isRegistering = true;
      shortcutsRegisteredRef.current = true;
      
      // Wait longer for Tauri to be ready and avoid race conditions
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (!isTauri()) {
        console.warn("Not in Tauri, skipping shortcut registration");
        isRegistering = false;
        return;
      }
      
      try {
        // Unregister all shortcuts first to avoid conflicts
        const shortcuts = [
          "CommandOrControl+Space",
          "CommandOrControl+Up",
          "CommandOrControl+Down",
          "CommandOrControl+BracketLeft",
          "CommandOrControl+BracketRight"
        ];
        
        for (const shortcut of shortcuts) {
          await unregister(shortcut).catch(() => {
            // Silently ignore if not registered
          });
        }
        
        // Small delay after unregistering
        await new Promise(resolve => setTimeout(resolve, 50));
        
        await register("CommandOrControl+Space", () => {
          // Debounce to prevent key auto-repeat (500ms)
          const now = Date.now();
          if (now - lastShortcutTime.current < 500) {
            return;
          }
          lastShortcutTime.current = now;
          
          const currentIsPlaying = isPlayingRef.current;
          const currentIsCountingDown = isCountingDownRef.current;
          const currentCountdown = countdownRef.current;
          
          if (!currentIsPlaying && !currentIsCountingDown) {
            // Start countdown if configured, otherwise play
            if (currentCountdown > 0) {
              setIsCountingDown(true);
            } else {
              setIsPlaying(true);
            }
          } else {
            // Stop both playing and countdown
            setIsPlaying(false);
            setIsCountingDown(false);
          }
        });
        await register("CommandOrControl+Up", () => {
          const current = settingsRef.current;
          updateSettings({ ...current, wpm: Math.min(current.wpm + 10, 500) });
        });
        await register("CommandOrControl+Down", () => {
          const current = settingsRef.current;
          updateSettings({ ...current, wpm: Math.max(current.wpm - 10, 10) });
        });
        await register("CommandOrControl+BracketLeft", () => {
          // Darken text color
          const current = settingsRef.current;
          const color = current.text_color;
          const darkerColor = adjustColorBrightness(color, -20);
          updateSettings({ ...current, text_color: darkerColor });
        });
        await register("CommandOrControl+BracketRight", () => {
          // Lighten text color
          const current = settingsRef.current;
          const color = current.text_color;
          const lighterColor = adjustColorBrightness(color, 20);
          updateSettings({ ...current, text_color: lighterColor });
        });
        
        // Toggle click-through temporarily for interaction
        await register("CommandOrControl+I", () => {
          const currentClickThrough = clickThroughRef.current;
          if (currentClickThrough && isTauri()) {
            console.log("Toggling click-through with Ctrl+I");
            // Toggle the actual click-through state
            invoke("toggle_click_through", {}).then((newState) => {
              setClickThrough(newState as boolean);
            }).catch(err => {
              console.error("Failed to toggle click-through:", err);
            });
          }
        });
        
        registered = true;
      } catch (error) {
        console.error("Failed to register shortcuts:", error);
      }
    };

    registerShortcuts();

    return () => {
      if (!isTauri() || !registered) {
        return;
      }
      unregister("CommandOrControl+Space").catch(console.error);
      unregister("CommandOrControl+Up").catch(console.error);
      unregister("CommandOrControl+Down").catch(console.error);
      unregister("CommandOrControl+BracketLeft").catch(console.error);
      unregister("CommandOrControl+BracketRight").catch(console.error);
      unregister("CommandOrControl+I").catch(console.error);
      shortcutsRegisteredRef.current = false;
    };
  }, []); // Remove settings dependency

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

  // Handle keyboard events for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key toggles controls or stops playback
      if (e.key === "Escape") {
        const currentIsPlaying = isPlayingRef.current;
        const currentIsCountingDown = isCountingDownRef.current;
        
        if (currentIsPlaying || currentIsCountingDown) {
          setIsPlaying(false);
          setIsCountingDown(false);
        } else {
          setShowControls(prev => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []); // No dependencies needed since we use refs

  const loadSettings = async () => {
    try {
      const savedSettings = await store.current?.get<Settings>("settings");
      if (savedSettings) {
        // Ensure text_color field exists for old saved settings
        const migratedSettings = {
          ...savedSettings,
          text_color: savedSettings.text_color || "#ffffff"
        };
        setSettings(migratedSettings);
        // Save settings without calling updateSettings to avoid recursion
        await saveSettings(migratedSettings);
        if (isTauri()) {
          await invoke("update_settings", { settings: migratedSettings });
        }
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
    if (isTauri()) {
      await invoke("update_settings", { settings: newSettings });
    }
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
    if (!isTauri()) {
      alert("File import is only available in the Tauri app. Run with 'npm run tauri dev'");
      return;
    }
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
    if (!isTauri()) {
      alert("Click-through is only available in the Tauri app. Run with 'npm run tauri dev'");
      return;
    }
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
    color: settings.text_color,
  };

  return (
    <div className="app">
      {/* Drag region when controls are hidden */}
      {!showControls && (
        <div className="drag-handle" data-tauri-drag-region onMouseDown={handleDragStart}>
          Teleprompter - Press Esc to toggle controls
        </div>
      )}

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
          <div className="drag-header" data-tauri-drag-region onMouseDown={handleDragStart}>
            <h2>Teleprompter Controls</h2>
            <div className="window-controls">
              <button 
                className="window-button minimize" 
                onClick={handleMinimize}
                onMouseDown={(e) => e.stopPropagation()}
                title="Minimize"
              >
                ─
              </button>
              <button 
                className="window-button maximize" 
                onClick={handleMaximize}
                onMouseDown={(e) => e.stopPropagation()}
                title="Maximize"
              >
                ☐
              </button>
              <button 
                className="window-button close" 
                onClick={handleClose}
                onMouseDown={(e) => e.stopPropagation()}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
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
              Text Color:
              <input
                type="color"
                value={settings.text_color}
                onChange={(e) => updateSettings({ ...settings, text_color: e.target.value })}
                style={{ width: '100%', height: '40px', cursor: 'pointer' }}
              />
            </label>
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
