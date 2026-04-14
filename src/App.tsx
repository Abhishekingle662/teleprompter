import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Store } from "@tauri-apps/plugin-store";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import type { UnlistenFn } from "@tauri-apps/api/event";
import "./App.css";

import { ControlPanel } from "./components/ControlPanel";
import { TextDisplay } from "./components/TextDisplay";
import { FileManager, FileManagerToggle } from "./components/FileManager";
import {
  NotificationToast,
  ConfirmDialogModal,
  InputDialogModal,
  NewFileDialogModal,
  MaximizedEditor,
  ShortcutsPanel,
  FirstRunOverlay,
} from "./components/Dialogs";
import { useScrollEngine } from "./hooks/useScrollEngine";
import { useSettings } from "./hooks/useSettings";
import { HotkeySettings } from "./components/HotkeySettings";
import type { LoadedFile, Notification, ConfirmDialog, InputDialog, NewFileDialog, HotkeyMap, Cue } from "./types";
import { DEFAULT_HOTKEYS, parseCues } from "./types";

// Computed once at module load — avoids calling getCurrentWindow() on every render.
const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const SCRIPT_FILE_PATH = "scripts/current.txt";

function App() {
  const [text, setText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const [showControls, setShowControls] = useState(true);
  const [clickThrough, setClickThrough] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [scrollMode, setScrollMode] = useState<"continuous" | "karaoke">("continuous");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [inputDialog, setInputDialog] = useState<InputDialog | null>(null);
  const [newFileDialog, setNewFileDialog] = useState<NewFileDialog | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [showFileManager, setShowFileManager] = useState(true);
  const [textareaMaximized, setTextareaMaximized] = useState(false);

  const [skipTaskbar, setSkipTaskbar] = useState(false);
  const [monitors, setMonitors] = useState<Array<{ index: number; name: string; x: number; y: number; width: number; height: number }>>([]);
  const [recentFiles, setRecentFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [showHotkeySettings, setShowHotkeySettings] = useState(false);
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(DEFAULT_HOTKEYS);
  const hotkeysRef = useRef<HotkeyMap>(DEFAULT_HOTKEYS);
  const [wsInfo, setWsInfo] = useState<{ ip: string; port: number } | null>(null);
  const [importedFonts, setImportedFonts] = useState<Array<{ name: string; dataUrl: string }>>([]);
  // Stable ref so the remote-action listener (registered once) can call the
  // latest updateSettings without a stale closure.
  const updateSettingsRef = useRef<(s: import("./types").Settings) => void>(() => {});
  
  const textContainerRef = useRef<HTMLDivElement>(null);
  const store = useRef<Store | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isCountingDownRef = useRef<boolean>(isCountingDown);
  const countdownRef = useRef<number>(countdown);
  const lastShortcutTime = useRef<number>(0); // For debouncing
  const clickThroughRef = useRef<boolean>(clickThrough);
  // Refs for values read inside event listeners to avoid stale closures.
  const loadedFilesRef = useRef<LoadedFile[]>(loadedFiles);
  const currentFileIdRef = useRef<string | null>(currentFileId);

  // Keep refs in sync


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

  useEffect(() => {
    loadedFilesRef.current = loadedFiles;
  }, [loadedFiles]);

  useEffect(() => {
    hotkeysRef.current = hotkeys;
  }, [hotkeys]);

  useEffect(() => {
    currentFileIdRef.current = currentFileId;
  }, [currentFileId]);

  useEffect(() => {
    if (!IS_TAURI) {
      return;
    }

    let disposed = false;
    let scriptUpdateListener: Promise<UnlistenFn> | undefined;
    let scriptErrorListener: Promise<UnlistenFn> | undefined;

    const setupWatcher = async () => {
      try {
        await invoke("start_script_watcher", { path: SCRIPT_FILE_PATH });
        if (disposed) {
          await invoke("stop_script_watcher").catch(() => {});
          return;
        }

        scriptUpdateListener = listen<{ text?: string }>("script-updated", (event) => {
          const payload = event.payload;
          if (payload && typeof payload.text === "string") {
            const incoming = payload.text;
            setText((prev) => {
              if (prev === incoming) {
                return prev;
              }
              return incoming;
            });
            setScrollPosition(0);
          }
        });

        scriptErrorListener = listen<{ error?: string }>("script-watcher-error", (event) => {
          const message = event.payload?.error;
          if (message) {
            console.error("Script watcher error:", message);
          }
        });
      } catch (error) {
        console.error("Failed to start live script watcher:", error);
      }
    };

    setupWatcher();

    return () => {
      disposed = true;
      if (scriptUpdateListener) {
        scriptUpdateListener.then((unlisten) => unlisten()).catch(() => {});
      }
      if (scriptErrorListener) {
        scriptErrorListener.then((unlisten) => unlisten()).catch(() => {});
      }
      invoke("stop_script_watcher").catch(() => {});
    };
  }, []);

  // Load available monitors on mount for multi-monitor positioning.
  useEffect(() => {
    if (!IS_TAURI) return;
    invoke<Array<{ index: number; name: string; x: number; y: number; width: number; height: number }>>(
      "list_monitors"
    )
      .then(setMonitors)
      .catch(console.error);
  }, []);

  const toggleSkipTaskbar = async () => {
    const next = !skipTaskbar;
    setSkipTaskbar(next);
    if (IS_TAURI) await invoke("set_skip_taskbar", { skip: next });
  };

  const moveToMonitor = async (index: number) => {
    if (IS_TAURI) await invoke("move_to_monitor", { monitorIndex: index });
  };

  const updateHotkeys = async (newHotkeys: HotkeyMap) => {
    setHotkeys(newHotkeys);
    hotkeysRef.current = newHotkeys;
    await store.current?.set("hotkeys", newHotkeys);
    await store.current?.save();
    // Re-register shortcuts with new bindings (takes effect on next registration cycle)
    shortcutsRegisteredRef.current = false;
  };

  const dismissFirstRun = async () => {
    setShowFirstRun(false);
    await store.current?.set("onboardingSeen", true);
    await store.current?.save();
  };

  // Open a file from the recent files list.
  const openRecentFile = async (path: string) => {
    try {
      const content = await readTextFile(path);
      const name = path.split(/[\\/]/).pop() || "Untitled";
      const existing = loadedFiles.find((f) => f.path === path);
      if (existing) {
        setCurrentFileId(existing.id);
        setText(existing.content);
        setScrollPosition(0);
        return;
      }
      const newFile: LoadedFile = { id: Date.now().toString(), name, path, content, loadedAt: new Date() };
      setLoadedFiles((prev) => [...prev, newFile]);
      setCurrentFileId(newFile.id);
      setText(content);
      setScrollPosition(0);
      setNotification({ show: true, message: `Opened "${name}"`, type: "success" });
      setTimeout(() => setNotification(null), 2000);
    } catch {
      setNotification({ show: true, message: `Could not open file`, type: "error" });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Persist a file to the recent files list (max 10, deduped by path).
  const addToRecentFiles = async (name: string, path: string) => {
    const entry = { name, path };
    const updated = [entry, ...recentFiles.filter((f) => f.path !== path)].slice(0, 10);
    setRecentFiles(updated);
    await store.current?.set("recentFiles", updated);
    await store.current?.save();
  };

  // Seek to a percentage position in the scroll container.
  const handleSeek = (pct: number) => {
    const el = textContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    setScrollPosition((pct / 100) * maxScroll);
  };

  // Cue markers derived from the current script text.
  const cues: Cue[] = parseCues(text);

  // Scroll the container so the cue line is at the top of the viewport.
  const jumpToCue = (lineIndex: number) => {
    const el = textContainerRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-cue-line="${lineIndex}"]`);
    if (target) {
      const offsetTop = target.offsetTop - (el as HTMLElement).offsetTop;
      setScrollPosition(offsetTop);
    }
  };

  // Listen for tray play/pause events emitted from the Rust tray menu handler.
  useEffect(() => {
    if (!IS_TAURI) return;
    let unlisten: UnlistenFn | null = null;
    listen("tray-play-pause", () => {
      togglePlayPause();
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  // togglePlayPause is stable (defined below) — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start the WebSocket remote-control server and listen for phone actions.
  useEffect(() => {
    if (!IS_TAURI) return;
    let unlisten: UnlistenFn | null = null;

    invoke<{ ip: string; port: number }>("get_ws_info").then((info) => {
      // Server not yet started — start it, then fetch updated info.
      if (info.port === 0) {
        return invoke<number>("start_ws_server").then(() =>
          invoke<{ ip: string; port: number }>("get_ws_info").then(setWsInfo)
        );
      }
      setWsInfo(info);
    }).catch(console.error);

    listen<{ action: string }>("remote-action", (event) => {
      const { action } = event.payload;
      switch (action) {
        case "play":
          if (!isPlayingRef.current && !isCountingDownRef.current) togglePlayPause();
          break;
        case "pause":
          if (isPlayingRef.current) togglePlayPause();
          break;
        case "toggle":
          togglePlayPause();
          break;
        case "faster":
          updateSettingsRef.current({ ...settingsRef.current, wpm: Math.min(600, settingsRef.current.wpm + 10) });
          break;
        case "slower":
          updateSettingsRef.current({ ...settingsRef.current, wpm: Math.max(30, settingsRef.current.wpm - 10) });
          break;
        case "reset":
          if (textContainerRef.current) textContainerRef.current.scrollTop = 0;
          break;
      }
    }).then((fn) => { unlisten = fn; }).catch(console.error);

    return () => { unlisten?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // IS_TAURI is a module-level constant — no per-render check needed.

  // Handle window dragging
  const handleDragStart = async (e: React.MouseEvent) => {
    if (!IS_TAURI) return;
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
    if (!IS_TAURI) return;
    e.stopPropagation(); // Prevent drag from triggering
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  };

  const handleMaximize = async (e: React.MouseEvent) => {
    if (!IS_TAURI) return;
    e.stopPropagation(); // Prevent drag from triggering
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch (error) {
      console.error("Failed to maximize:", error);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    if (!IS_TAURI) return;
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
      
      if (!IS_TAURI) {
        console.warn("Not running in Tauri environment. Run with 'npm run tauri dev'");
        return;
      }
      
      store.current = await Store.load("settings.json");
      await loadSettings();
      await loadSession();
      // Load recent files list
      const savedRecent = await store.current?.get<Array<{ name: string; path: string }>>("recentFiles");
      if (savedRecent) setRecentFiles(savedRecent);
      // Show first-run overlay if user has never opened the app before
      const hasSeenOnboarding = await store.current?.get<boolean>("onboardingSeen");
      if (!hasSeenOnboarding) setShowFirstRun(true);
      // Load saved hotkey map
      const savedHotkeys = await store.current?.get<HotkeyMap>("hotkeys");
      if (savedHotkeys) { setHotkeys(savedHotkeys); hotkeysRef.current = savedHotkeys; }
      // Load previously imported fonts and inject @font-face rules
      await loadImportedFonts();
      await loadScriptsFromDirectory();
    };
    initStore();
  }, []);

  // Load scripts from the default scripts directory
  const loadScriptsFromDirectory = async () => {
    if (!IS_TAURI) return;
    
    try {
      console.log("Loading scripts from directory...");
      const scripts = await invoke<Array<{ name: string; path: string; content: string }>>(
        "get_scripts_from_directory"
      );
      
      console.log(`Found ${scripts.length} script(s):`, scripts.map(s => s.name));
      
      if (scripts.length > 0) {
        // Try to preserve existing file IDs based on path
        const newFiles: LoadedFile[] = scripts.map((script) => {
          // Check if this file already exists (by path)
          const existingFile = loadedFiles.find(f => f.path === script.path);
          
          return {
            id: existingFile?.id || Date.now().toString() + Math.random().toString(36).substring(7),
            name: script.name,
            path: script.path,
            content: script.content,
            loadedAt: existingFile?.loadedAt || new Date(),
          };
        });
        
        setLoadedFiles(newFiles);
        
        // Handle current file selection
        if (currentFileId) {
          // Check if current file still exists
          const currentFileStillExists = newFiles.find(f => f.id === currentFileId);
          if (!currentFileStillExists) {
            // Current file was deleted, switch to first file
            setCurrentFileId(newFiles[0].id);
            setText(newFiles[0].content);
            console.log("Current file no longer exists, switched to:", newFiles[0].name);
          } else {
            // Update content of current file if it changed
            const updatedCurrentFile = newFiles.find(f => f.id === currentFileId);
            if (updatedCurrentFile && updatedCurrentFile.content !== text) {
              setText(updatedCurrentFile.content);
              console.log("Updated content of current file:", updatedCurrentFile.name);
            }
          }
        } else if (newFiles.length > 0) {
          // No current file, select the first one
          setCurrentFileId(newFiles[0].id);
          setText(newFiles[0].content);
          console.log("Selected first file:", newFiles[0].name);
        }
        
        setNotification({ show: true, message: `Loaded ${scripts.length} script(s)`, type: 'success' });
        setTimeout(() => setNotification(null), 2000);
      } else {
        // No files found, clear the list
        console.log("No script files found in directory");
        setLoadedFiles([]);
        setCurrentFileId(null);
        setText("");
        setNotification({ show: true, message: "No script files found", type: 'info' });
        setTimeout(() => setNotification(null), 2000);
      }
    } catch (error) {
      console.error("Failed to load scripts from directory:", error);
      setNotification({ show: true, message: "Failed to load scripts", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Watch the scripts directory for changes
  useEffect(() => {
    if (!IS_TAURI) return;

    let unlisten: UnlistenFn | null = null;

    const setupDirectoryWatcher = async () => {
      try {
        // Start watching the scripts directory
        await invoke("watch_scripts_directory");
        
        // Listen for directory updates — read loadedFiles/currentFileId from
        // refs to avoid stale closure bugs when state changes after mount.
        unlisten = await listen<Array<{ name: string; path: string; content: string }>>(
          "scripts-directory-updated",
          (event) => {
            const scripts = event.payload;

            if (scripts.length > 0) {
              const newFiles: LoadedFile[] = scripts.map((script) => ({
                id: Date.now().toString() + Math.random().toString(36).substring(7),
                name: script.name,
                path: script.path,
                content: script.content,
                loadedAt: new Date(),
              }));

              // Use refs so we always see the latest state, not the mount-time snapshot.
              const currentFile = loadedFilesRef.current.find(
                (f) => f.id === currentFileIdRef.current
              );
              let newCurrentFileId = currentFileIdRef.current;

              if (currentFile) {
                const matchingFile = newFiles.find((f) => f.path === currentFile.path);
                if (matchingFile) {
                  newCurrentFileId = matchingFile.id;
                  if (matchingFile.content !== currentFile.content) {
                    setText(matchingFile.content);
                  }
                } else {
                  newCurrentFileId = newFiles[0]?.id || null;
                  if (newFiles[0]) setText(newFiles[0].content);
                }
              }

              setLoadedFiles(newFiles);
              setCurrentFileId(newCurrentFileId);
              setNotification({ show: true, message: "Scripts directory updated", type: "info" });
              setTimeout(() => setNotification(null), 2000);
            } else {
              setLoadedFiles([]);
              setCurrentFileId(null);
              setText("");
            }
          }
        );
      } catch (error) {
        console.error("Failed to setup directory watcher:", error);
      }
    };

    setupDirectoryWatcher();

    return () => {
      if (unlisten) {
        unlisten();
      }
      if (IS_TAURI) {
        invoke("stop_watching_scripts_directory").catch(console.error);
      }
    };
  }, []);

  // File watching - listen for file updates from Tauri
  useEffect(() => {
    if (!IS_TAURI) return;

    let unlisten: UnlistenFn | null = null;

    const setupFileWatcher = async () => {
      unlisten = await listen<{ fileId: string; content: string; path: string }>(
        "file-updated",
        (event) => {
          const { fileId, content, path } = event.payload;
          
          // Update the file in the loaded files list
          setLoadedFiles((prev) => {
            const updated = prev.map((file) => {
              if (file.id === fileId) {
                return { ...file, content };
              }
              return file;
            });
            return updated;
          });

          // Use ref to avoid stale closure — currentFileId may have changed since mount.
          if (currentFileIdRef.current === fileId) {
            setText(content);
            setNotification({
              show: true,
              message: `File updated: ${path.split(/[\\/]/).pop()}`,
              type: "info",
            });
            setTimeout(() => setNotification(null), 2000);
          }
        }
      );
    };

    setupFileWatcher();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []); // currentFileId read via ref — no re-registration needed on file switch

  // Watch/unwatch files as they are added or removed
  useEffect(() => {
    if (!IS_TAURI) return;

    const watchFiles = async () => {
      for (const file of loadedFiles) {
        try {
          await invoke("watch_file", {
            fileId: file.id,
            path: file.path,
          });
        } catch (error) {
          console.error(`Failed to watch file ${file.name}:`, error);
        }
      }
    };

    watchFiles();

    // Cleanup: unwatch files when component unmounts
    return () => {
      if (IS_TAURI) {
        invoke("unwatch_all_files").catch(console.error);
      }
    };
  }, [loadedFiles]);

  // Track shortcut registration across hot reloads with a module-level variable
  // This persists across React re-renders and strict mode double mounting
  const shortcutsRegisteredRef = useRef(false);
  const isRegisteringRef = useRef(false);

  // Register global shortcuts
  useEffect(() => {
    let registered = false;
    
    /** Retry an async operation with exponential backoff. */
    const withRetry = async <T,>(
      fn: () => Promise<T>,
      maxAttempts = 3,
      baseDelayMs = 100
    ): Promise<T> => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (err) {
          if (attempt === maxAttempts - 1) throw err;
          await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
        }
      }
      throw new Error("withRetry: unreachable");
    };

    const registerShortcuts = async () => {
      // Skip if already registered OR currently registering
      if (shortcutsRegisteredRef.current || isRegisteringRef.current) {
        return;
      }

      isRegisteringRef.current = true;
      shortcutsRegisteredRef.current = true;

      if (!IS_TAURI) {
        isRegisteringRef.current = false;
        shortcutsRegisteredRef.current = false;
        return;
      }

      try {
        // Unregister with retry — Tauri may not be fully initialised on first mount
        await withRetry(() => unregisterAll(), 3, 100);

        const hk = hotkeysRef.current;

        await register(hk.playPause, () => {
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
        await register(hk.speedUp, () => {
          const current = settingsRef.current;
          updateSettings({ ...current, wpm: Math.min(current.wpm + 10, 500) });
        });
        await register(hk.speedDown, () => {
          const current = settingsRef.current;
          updateSettings({ ...current, wpm: Math.max(current.wpm - 10, 10) });
        });
        await register("CommandOrControl+BracketLeft", () => {
          const current = settingsRef.current;
          updateSettings({ ...current, text_color: adjustColorBrightness(current.text_color, -20) });
        });
        await register("CommandOrControl+BracketRight", () => {
          const current = settingsRef.current;
          updateSettings({ ...current, text_color: adjustColorBrightness(current.text_color, 20) });
        });

        // Toggle click-through temporarily for interaction
        await register(hk.toggleClickThrough, () => {
          const currentClickThrough = clickThroughRef.current;
          if (currentClickThrough && IS_TAURI) {
            console.log("Toggling click-through with Ctrl+I");
            // Toggle the actual click-through state
            invoke("toggle_click_through", {}).then((newState) => {
              setClickThrough(newState as boolean);
            }).catch(err => {
              console.error("Failed to toggle click-through:", err);
            });
          }
        });
        
        // Toggle file manager
        await register(hk.toggleFileManager, () => {
          setShowFileManager(prev => !prev);
        });

        // Font size hotkeys — adjust while playing without touching the panel
        await register(hk.fontSizeUp, () => {
          updateSettings({ ...settingsRef.current, font_size: Math.min(200, settingsRef.current.font_size + 2) });
        });
        await register(hk.fontSizeDown, () => {
          updateSettings({ ...settingsRef.current, font_size: Math.max(12, settingsRef.current.font_size - 2) });
        });

        registered = true;
        console.log("Global shortcuts registered successfully");
      } catch (error) {
        console.error("Failed to register shortcuts:", error);
        shortcutsRegisteredRef.current = false; // Allow retry on error
        isRegisteringRef.current = false; // Reset registering flag on error
      } finally {
        // Always reset the registering flag when done
        isRegisteringRef.current = false;
      }
    };

    registerShortcuts();

    // Cleanup only in development mode (React Strict Mode causes double mounting)
    return () => {
      // Only unregister if we're in development and doing hot reload
      // In production, keep shortcuts registered for the app lifetime
      const isDev = import.meta.env.DEV;
      if (!IS_TAURI || !registered || !isDev) {
        return;
      }
      
      console.log("Cleaning up shortcuts (dev mode)");
      unregisterAll().catch(console.error);
      shortcutsRegisteredRef.current = false;
      isRegisteringRef.current = false;
    };
  }, []); // Remove settings dependency

  // ── Settings (load/save/update) via hook ─────────────────────────────────
  const { settings, settingsRef, updateSettings, loadSettings } = useSettings(store);
  // Keep the ref current so closures registered before this point can call it.
  updateSettingsRef.current = updateSettings;

  // ── Scroll engine (continuous + karaoke) via hook ────────────────────────
  const {
    scrollPosition,
    setScrollPosition,
    scrollProgress,
    activeWordIndex,
  } = useScrollEngine({
    isPlaying,
    isCountingDown,
    settings,
    scrollMode,
    text,
    containerRef: textContainerRef,
    onPlaybackEnd: () => setIsPlaying(false),
  });

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

  /** Inject a @font-face rule into the document for a loaded font. */
  const injectFontFace = (name: string, dataUrl: string) => {
    const styleId = `font-face-${name.replace(/\s+/g, "-")}`;
    if (document.getElementById(styleId)) return; // already injected
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `@font-face { font-family: "${name}"; src: url("${dataUrl}"); }`;
    document.head.appendChild(style);
  };

  /** Load all previously imported fonts from the Rust side and inject them. */
  const loadImportedFonts = async () => {
    if (!IS_TAURI) return;
    try {
      const fonts = await invoke<Array<{ name: string; data_url: string }>>("list_imported_fonts");
      const mapped = fonts.map((f) => ({ name: f.name, dataUrl: f.data_url }));
      mapped.forEach((f) => injectFontFace(f.name, f.dataUrl));
      setImportedFonts(mapped);
    } catch (e) {
      console.error("Failed to load imported fonts:", e);
    }
  };

  /** Open a file picker, copy the chosen font to app data, inject it. */
  const handleImportFont = async () => {
    if (!IS_TAURI) return;
    try {
      const selected = await open({
        title: "Import Font",
        filters: [{ name: "Font Files", extensions: ["ttf", "otf", "woff", "woff2"] }],
        multiple: false,
      });
      if (!selected || typeof selected !== "string") return;
      const result = await invoke<{ name: string; data_url: string }>("import_font", { srcPath: selected });
      injectFontFace(result.name, result.data_url);
      setImportedFonts((prev) => {
        if (prev.some((f) => f.name === result.name)) return prev;
        return [...prev, { name: result.name, dataUrl: result.data_url }].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });
      setNotification({ show: true, message: `Font "${result.name}" imported`, type: "success" });
      setTimeout(() => setNotification(null), 2000);
    } catch (e) {
      console.error("Font import failed:", e);
      setNotification({ show: true, message: "Font import failed", type: "error" });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Auto-save session 500ms after text or scroll position stops changing.
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!store.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { saveSession(); }, 500);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, scrollPosition]);

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
    if (!IS_TAURI) {
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
        const fileName = selected.split(/[\\/]/).pop() || "Untitled";
        
        // Check if file is already loaded
        const existingFile = loadedFiles.find(f => f.path === selected);
        if (existingFile) {
          setNotification({ show: true, message: `File "${fileName}" is already loaded`, type: 'info' });
          setTimeout(() => setNotification(null), 3000);
          setCurrentFileId(existingFile.id);
          setText(existingFile.content);
          setScrollPosition(0);
          return;
        }
        
        // Add file to the loaded files list
        const newFile: LoadedFile = {
          id: Date.now().toString(),
          name: fileName,
          path: selected,
          content: content,
          loadedAt: new Date(),
        };
        
        setLoadedFiles(prev => [...prev, newFile]);
        setCurrentFileId(newFile.id);
        setText(content);
        setScrollPosition(0);
        await addToRecentFiles(fileName, selected);
        setNotification({ show: true, message: `File "${fileName}" loaded successfully!`, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("Failed to import file:", error);
      setNotification({ show: true, message: "Failed to import file", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const switchToFile = (fileId: string) => {
    const file = loadedFiles.find(f => f.id === fileId);
    if (file) {
      setCurrentFileId(fileId);
      setText(file.content);
      setScrollPosition(0);
      setNotification({ show: true, message: `Switched to "${file.name}"`, type: 'info' });
      setTimeout(() => setNotification(null), 2000);
    }
  };

  const removeFile = (fileId: string) => {
    const file = loadedFiles.find(f => f.id === fileId);
    if (!file) return;
    
    setConfirmDialog({
      show: true,
      title: "Remove File",
      message: `Are you sure you want to remove "${file.name}" from the file manager?`,
      onConfirm: () => {
        setLoadedFiles(prev => prev.filter(f => f.id !== fileId));
        
        // If removing the current file, clear or switch to another
        if (currentFileId === fileId) {
          const remaining = loadedFiles.filter(f => f.id !== fileId);
          if (remaining.length > 0) {
            setCurrentFileId(remaining[0].id);
            setText(remaining[0].content);
          } else {
            setCurrentFileId(null);
            setText("");
          }
        }
        
        setNotification({ show: true, message: `File "${file.name}" removed`, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
        setConfirmDialog(null);
      }
    });
  };

  const clearAllFiles = () => {
    if (loadedFiles.length === 0) return;
    
    setConfirmDialog({
      show: true,
      title: "Clear All Files",
      message: `Are you sure you want to remove all ${loadedFiles.length} file(s) from the file manager?`,
      onConfirm: () => {
        setLoadedFiles([]);
        setCurrentFileId(null);
        setText("");
        setNotification({ show: true, message: "All files cleared", type: 'success' });
        setTimeout(() => setNotification(null), 3000);
        setConfirmDialog(null);
      }
    });
  };

  const toggleClickThrough = async () => {
    if (!IS_TAURI) {
      alert("Click-through is only available in the Tauri app. Run with 'npm run tauri dev'");
      return;
    }
    try {
      const newState = await invoke<boolean>("toggle_click_through");
      setClickThrough(newState);
      
      // Show helpful notification when enabling click-through
      if (newState) {
        setNotification({ 
          show: true, 
          message: "Click-through enabled! Press Ctrl/Cmd+I to toggle it back.", 
          type: 'info' 
        });
        setTimeout(() => setNotification(null), 10000); // Show for 10 seconds
      }
    } catch (error) {
      console.error("Failed to toggle click-through:", error);
    }
  };

  const saveScript = async () => {
    setInputDialog({
      show: true,
      title: "Save Script",
      placeholder: "Enter script name (e.g., my-script.txt)...",
      defaultValue: "",
      onConfirm: async (name) => {
        if (name.trim()) {
          try {
            await invoke<string>('save_script_to_directory', { 
              filename: name.trim(), 
              content: text 
            });
            setNotification({ 
              show: true, 
              message: `Script "${name}" saved successfully!`, 
              type: 'success' 
            });
            setTimeout(() => setNotification(null), 3000);
            // Refresh the file list
            await loadScriptsFromDirectory();
          } catch (error) {
            console.error('Failed to save script:', error);
            setNotification({ 
              show: true, 
              message: `Failed to save script: ${error}`, 
              type: 'error' 
            });
            setTimeout(() => setNotification(null), 5000);
          }
        }
        setInputDialog(null);
      }
    });
  };

  const createNewFile = () => {
    setNewFileDialog({
      show: true,
      filename: "",
      content: ""
    });
  };

  const handleSaveNewFile = async () => {
    if (!newFileDialog) return;
    
    const filename = newFileDialog.filename.trim();
    const content = newFileDialog.content;
    
    if (!filename) {
      setNotification({ 
        show: true, 
        message: "Please enter a filename", 
        type: 'error' 
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    try {
      await invoke<string>('save_script_to_directory', { 
        filename, 
        content 
      });
      setNotification({ 
        show: true, 
        message: `Script "${filename}" created successfully!`, 
        type: 'success' 
      });
      setTimeout(() => setNotification(null), 3000);
      // Refresh the file list
      await loadScriptsFromDirectory();
      // Close the dialog
      setNewFileDialog(null);
    } catch (error) {
      console.error('Failed to create file:', error);
      setNotification({ 
        show: true, 
        message: `Failed to create file: ${error}`, 
        type: 'error' 
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="app">
      {/* Dialogs & overlays */}
      {showFirstRun && <FirstRunOverlay onDismiss={dismissFirstRun} />}
      <ConfirmDialogModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
      <InputDialogModal dialog={inputDialog} onClose={() => setInputDialog(null)} />

      <NewFileDialogModal
        dialog={newFileDialog}
        onChange={setNewFileDialog}
        onClose={() => setNewFileDialog(null)}
        onSave={handleSaveNewFile}
      />
      {textareaMaximized && (
        <MaximizedEditor
          text={text}
          onChange={setText}
          onClose={() => setTextareaMaximized(false)}
        />
      )}
      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}
      {showHotkeySettings && (
        <HotkeySettings
          hotkeys={hotkeys}
          onChange={updateHotkeys}
          onClose={() => setShowHotkeySettings(false)}
        />
      )}
      <NotificationToast notification={notification} />

      {/* File manager */}
      {showFileManager && showControls && (
        <FileManager
          loadedFiles={loadedFiles}
          currentFileId={currentFileId}
          onSwitchFile={switchToFile}
          onRemoveFile={removeFile}
          onClearAll={clearAllFiles}
          onRefresh={loadScriptsFromDirectory}
          onHide={() => setShowFileManager(false)}
        />
      )}
      {!showFileManager && showControls && (
        <FileManagerToggle onShow={() => setShowFileManager(true)} />
      )}

      {/* Drag handle when controls are hidden */}
      {!showControls && (
        <div className="drag-handle" data-tauri-drag-region onMouseDown={handleDragStart}>
          Teleprompter - Press Esc to toggle controls
        </div>
      )}

      {/* Playback status */}
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

      {/* Control panel */}
      {showControls && (
        <ControlPanel
          text={text}
          onTextChange={setText}
          onNewFile={createNewFile}
          onImportFile={handleImportFile}
          onSaveScript={saveScript}
          onMaximizeEditor={() => setTextareaMaximized(true)}
          recentFiles={recentFiles}
          onOpenRecentFile={openRecentFile}
          isPlaying={isPlaying}
          isCountingDown={isCountingDown}
          countdown={countdown}
          scrollMode={scrollMode}
          scrollProgress={scrollProgress}
          onTogglePlayPause={togglePlayPause}
          onReset={() => setScrollPosition(0)}
          onSeek={handleSeek}
          onCountdownChange={setCountdown}
          onScrollModeChange={setScrollMode}
          settings={settings}
          onSettingsChange={updateSettings}
          clickThrough={clickThrough}
          skipTaskbar={skipTaskbar}
          monitors={monitors}
          onToggleClickThrough={toggleClickThrough}
          onToggleSkipTaskbar={toggleSkipTaskbar}
          onMoveToMonitor={moveToMonitor}
          onHideControls={() => setShowControls(false)}
          onSaveSession={saveSession}
          onShowShortcuts={() => setShowShortcuts(true)}
          onConfigureHotkeys={() => setShowHotkeySettings(true)}
          importedFonts={importedFonts}
          onImportFont={handleImportFont}
          cues={cues}
          onJumpToCue={jumpToCue}
          wsInfo={wsInfo}
          onDragStart={handleDragStart}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          onClose={handleClose}
        />
      )}

      {!showControls && (
        <button
          className="show-controls-button"
          onClick={() => setShowControls(true)}
          style={{ position: "absolute", top: "10px", right: "10px", padding: "10px 20px", fontSize: "16px", cursor: "pointer", zIndex: 1000 }}
        >
          Show Controls
        </button>
      )}

      {/* Text display */}
      <TextDisplay
        ref={textContainerRef}
        text={text}
        settings={settings}
        clickThrough={clickThrough}
        scrollMode={scrollMode}
        activeWordIndex={activeWordIndex}
      />
    </div>
  );
}

export default App;
