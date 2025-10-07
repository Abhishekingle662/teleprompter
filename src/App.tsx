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

interface LoadedFile {
  id: string;
  name: string;
  path: string;
  content: string;
  loadedAt: Date;
}

const SCRIPT_FILE_PATH = "scripts/current.txt";

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
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [inputDialog, setInputDialog] = useState<{
    show: boolean;
    title: string;
    placeholder: string;
    defaultValue: string;
    onConfirm: (value: string) => void;
  } | null>(null);
  const [newFileDialog, setNewFileDialog] = useState<{
    show: boolean;
    filename: string;
    content: string;
  } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [showFileManager, setShowFileManager] = useState(true);
  const [textareaMaximized, setTextareaMaximized] = useState(false);
  
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

  useEffect(() => {
    if (!isTauri()) {
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
      await loadSession();
      await loadScriptsFromDirectory();
    };
    initStore();
  }, []);

  // Load scripts from the default scripts directory
  const loadScriptsFromDirectory = async () => {
    if (!isTauri()) return;
    
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
    if (!isTauri()) return;

    let unlisten: UnlistenFn | null = null;

    const setupDirectoryWatcher = async () => {
      try {
        // Start watching the scripts directory
        await invoke("watch_scripts_directory");
        
        // Listen for directory updates
        unlisten = await listen<Array<{ name: string; path: string; content: string }>>(
          "scripts-directory-updated",
          (event) => {
            const scripts = event.payload;
            
            console.log("Scripts directory updated, reloading files...");
            
            if (scripts.length > 0) {
              const newFiles: LoadedFile[] = scripts.map((script) => ({
                id: Date.now().toString() + Math.random().toString(36).substring(7),
                name: script.name,
                path: script.path,
                content: script.content,
                loadedAt: new Date(),
              }));
              
              // Preserve the currently active file if it still exists
              const currentFile = loadedFiles.find(f => f.id === currentFileId);
              let newCurrentFileId = currentFileId;
              
              if (currentFile) {
                // Find the same file in the new list by path
                const matchingFile = newFiles.find(f => f.path === currentFile.path);
                if (matchingFile) {
                  newCurrentFileId = matchingFile.id;
                  // Update the text if content changed
                  if (matchingFile.content !== currentFile.content) {
                    setText(matchingFile.content);
                  }
                } else {
                  // Current file was deleted, switch to first file
                  newCurrentFileId = newFiles[0]?.id || null;
                  if (newFiles[0]) {
                    setText(newFiles[0].content);
                  }
                }
              }
              
              setLoadedFiles(newFiles);
              setCurrentFileId(newCurrentFileId);
              
              setNotification({
                show: true,
                message: "Scripts directory updated",
                type: "info",
              });
              setTimeout(() => setNotification(null), 2000);
            } else {
              // All files were deleted
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
      if (isTauri()) {
        invoke("stop_watching_scripts_directory").catch(console.error);
      }
    };
  }, []);

  // File watching - listen for file updates from Tauri
  useEffect(() => {
    if (!isTauri()) return;

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

          // If this is the currently active file, update the text
          if (currentFileId === fileId) {
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
  }, [currentFileId]);

  // Watch/unwatch files as they are added or removed
  useEffect(() => {
    if (!isTauri()) return;

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
      if (isTauri()) {
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
    
    const registerShortcuts = async () => {
      // Skip if already registered OR currently registering
      if (shortcutsRegisteredRef.current || isRegisteringRef.current) {
        console.log("Shortcuts already registered or registration in progress, skipping");
        return;
      }
      
      // Mark as registering IMMEDIATELY to prevent concurrent registration attempts
      isRegisteringRef.current = true;
      shortcutsRegisteredRef.current = true;
      
      // Wait for Tauri to be ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!isTauri()) {
        console.warn("Not in Tauri, skipping shortcut registration");
        isRegisteringRef.current = false;
        shortcutsRegisteredRef.current = false;
        return;
      }
      
      try {
        // Unregister ALL shortcuts first to avoid conflicts
        console.log("Unregistering all existing shortcuts...");
        await unregisterAll().catch((err) => {
          console.warn("Failed to unregister all shortcuts:", err);
        });
        
        // Small delay after unregistering
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log("Registering global shortcuts...");
        
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
        
        // Toggle file manager
        await register("CommandOrControl+F", () => {
          setShowFileManager(prev => !prev);
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
      if (!isTauri() || !registered || !isDev) {
        return;
      }
      
      console.log("Cleaning up shortcuts (dev mode)");
      unregisterAll().catch(console.error);
      shortcutsRegisteredRef.current = false;
      isRegisteringRef.current = false;
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
    if (!isTauri()) {
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
      {/* Custom Confirmation Dialog */}
      {confirmDialog && confirmDialog.show && (
        <div className="dialog-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title">{confirmDialog.title}</h3>
            <p className="dialog-message">{confirmDialog.message}</p>
            <div className="dialog-buttons">
              <button 
                className="dialog-button dialog-button-cancel"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button 
                className="dialog-button dialog-button-confirm"
                onClick={confirmDialog.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Input Dialog */}
      {inputDialog && inputDialog.show && (
        <div className="dialog-overlay" onClick={() => setInputDialog(null)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title">{inputDialog.title}</h3>
            <input
              type="text"
              className="dialog-input"
              placeholder={inputDialog.placeholder}
              defaultValue={inputDialog.defaultValue}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  inputDialog.onConfirm(e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  setInputDialog(null);
                }
              }}
            />
            <div className="dialog-buttons">
              <button 
                className="dialog-button dialog-button-cancel"
                onClick={() => setInputDialog(null)}
              >
                Cancel
              </button>
              <button 
                className="dialog-button dialog-button-confirm"
                onClick={(e) => {
                  const input = (e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement);
                  if (input) {
                    inputDialog.onConfirm(input.value);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New File Dialog */}
      {newFileDialog && newFileDialog.show && (
        <div className="dialog-overlay" onClick={() => setNewFileDialog(null)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <h3 className="dialog-title">Create New Script</h3>
            <input
              type="text"
              className="dialog-input"
              placeholder="Enter filename (e.g., my-script.txt)..."
              value={newFileDialog.filename}
              onChange={(e) => setNewFileDialog({ ...newFileDialog, filename: e.target.value })}
              autoFocus
              style={{ marginBottom: '10px' }}
            />
            <textarea
              className="dialog-input"
              placeholder="Write your script here..."
              value={newFileDialog.content}
              onChange={(e) => setNewFileDialog({ ...newFileDialog, content: e.target.value })}
              rows={15}
              style={{ 
                resize: 'vertical',
                minHeight: '200px',
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
            />
            <div className="dialog-buttons">
              <button 
                className="dialog-button dialog-button-cancel"
                onClick={() => setNewFileDialog(null)}
              >
                Cancel
              </button>
              <button 
                className="dialog-button dialog-button-confirm"
                onClick={handleSaveNewFile}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maximized Textarea Modal */}
      {textareaMaximized && (
        <div className="dialog-overlay" onClick={() => setTextareaMaximized(false)}>
          <div 
            className="dialog-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '95vw', 
              width: '95vw',
              height: '90vh',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 className="dialog-title" style={{ margin: 0 }}>Script Editor</h3>
              <div style={{ fontSize: '12px', color: 'rgba(97, 218, 251, 0.7)' }}>
                {text.length} characters • {text.split(/\n/).length} lines
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your script here..."
              autoFocus
              style={{ 
                flex: 1,
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                lineHeight: '1.8',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(97, 218, 251, 0.3)',
                borderRadius: '6px',
                color: '#e0e0e0',
                resize: 'none',
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                marginBottom: '15px'
              }}
            />
            <div className="dialog-buttons">
              <button 
                className="dialog-button dialog-button-confirm"
                onClick={() => setTextareaMaximized(false)}
                style={{ width: '100%' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && notification.show && (
        <div className={`notification notification-${notification.type}`}>
          <span className="notification-icon">
            {notification.type === 'success' && '✓'}
            {notification.type === 'error' && '✕'}
            {notification.type === 'info' && 'ℹ'}
          </span>
          <span className="notification-message">{notification.message}</span>
        </div>
      )}

      {/* File Manager Panel */}
      {showFileManager && showControls && (
        <div className="file-manager-panel">
          <div className="file-manager-header">
            <h3>📁 Loaded Files</h3>
            <button 
              className="file-manager-toggle"
              onClick={() => setShowFileManager(false)}
              title="Hide file manager"
            >
              ‹
            </button>
          </div>
          <div className="file-manager-content">
            {loadedFiles.length === 0 ? (
              <div className="file-manager-empty">
                <p>No files loaded</p>
                <p className="file-manager-hint">Add .txt or .md files to the 'scripts/' directory</p>
                <button 
                  className="file-manager-refresh-btn-empty"
                  onClick={loadScriptsFromDirectory}
                >
                  🔄 Load Scripts
                </button>
              </div>
            ) : (
              <>
                <div className="file-manager-actions">
                  <button 
                    className="file-manager-refresh-btn"
                    onClick={loadScriptsFromDirectory}
                    title="Refresh scripts from directory"
                  >
                    🔄 Refresh
                  </button>
                  <button 
                    className="file-manager-clear-btn"
                    onClick={clearAllFiles}
                    title="Clear all files"
                  >
                    Clear All
                  </button>
                  <span className="file-count">{loadedFiles.length} file{loadedFiles.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="file-list">
                  {loadedFiles.map((file) => (
                    <div 
                      key={file.id}
                      className={`file-item ${currentFileId === file.id ? 'active' : ''}`}
                      onClick={() => switchToFile(file.id)}
                    >
                      <div className="file-info">
                        <div className="file-name" title={file.name}>
                          {currentFileId === file.id && <span className="file-active-indicator">●</span>}
                          {file.name}
                          <span className="file-watching-indicator" title="Watching for changes">👁️</span>
                        </div>
                        <div className="file-date">
                          {new Date(file.loadedAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        className="file-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* File Manager Toggle Button (when hidden) */}
      {!showFileManager && showControls && (
        <button 
          className="file-manager-show-btn"
          onClick={() => setShowFileManager(true)}
          title="Show file manager"
        >
          📁 ›
        </button>
      )}

      {/* Keyboard Shortcuts Help Panel */}
      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-header">
              <h2>⌨️ Keyboard Shortcuts</h2>
              <button className="shortcuts-close" onClick={() => setShowShortcuts(false)}>✕</button>
            </div>
            <div className="shortcuts-content">
              <div className="shortcuts-section">
                <h3>Playback Controls</h3>
                <div className="shortcut-item">
                  <kbd>Ctrl</kbd> + <kbd>Space</kbd>
                  <span>Play / Pause</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Esc</kbd>
                  <span>Stop playback or toggle controls</span>
                </div>
              </div>

              <div className="shortcuts-section">
                <h3>Speed Adjustment</h3>
                <div className="shortcut-item">
                  <kbd>Ctrl</kbd> + <kbd>↑</kbd>
                  <span>Increase speed (+10 WPM)</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl</kbd> + <kbd>↓</kbd>
                  <span>Decrease speed (-10 WPM)</span>
                </div>
              </div>

              <div className="shortcuts-section">
                <h3>Text Color</h3>
                <div className="shortcut-item">
                  <kbd>Ctrl</kbd> + <kbd>[</kbd>
                  <span>Darken text color</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl</kbd> + <kbd>]</kbd>
                  <span>Lighten text color</span>
                </div>
              </div>

              <div className="shortcuts-section">
                <h3>Click-Through Mode</h3>
                <div className="shortcut-item">
                  <kbd>Ctrl</kbd> + <kbd>I</kbd>
                  <span>Toggle click-through (when enabled)</span>
                </div>
              </div>

              <div className="shortcuts-section">
                <h3>File Manager</h3>
                <div className="shortcut-item">
                  <kbd>Ctrl</kbd> + <kbd>F</kbd>
                  <span>Toggle file manager panel</span>
                </div>
              </div>

              <div className="shortcuts-note">
                <strong>Note:</strong> On macOS, use <kbd>Cmd</kbd> instead of <kbd>Ctrl</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <button onClick={createNewFile}>New File</button>
              <button onClick={handleImportFile}>Import File</button>
              <button onClick={saveScript}>Save Script</button>
            </div>
            <div style={{ position: "relative" }}>
              <button 
                onClick={() => setTextareaMaximized(true)}
                title="Maximize editor"
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  zIndex: 10,
                  background: "rgba(0, 0, 0, 0.6)",
                  border: "1px solid rgba(97, 218, 251, 0.4)",
                  color: "#61dafb",
                  width: "28px",
                  height: "28px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(97, 218, 251, 0.2)";
                  e.currentTarget.style.borderColor = "#61dafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)";
                  e.currentTarget.style.borderColor = "rgba(97, 218, 251, 0.4)";
                }}
              >
                ⛶
              </button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your script here, import a file, or create a new one..."
                rows={5}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(97, 218, 251, 0.3)",
                  borderRadius: "6px",
                  color: "#e0e0e0",
                  resize: "vertical",
                  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace"
                }}
              />
              <div style={{
                fontSize: "11px",
                color: "rgba(97, 218, 251, 0.6)",
                marginTop: "4px",
                display: "flex",
                justifyContent: "space-between"
              }}>
                <span>{text.length} characters</span>
                <span>{text.split(/\n/).length} lines</span>
              </div>
            </div>
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
            <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>
                • Set a countdown for controlled playback.
              </div>

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
            <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>
                • Control the playback speed.
              </div>
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
            <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>
                • Adjust the borders of the script.
              </div>
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
            <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>
                • Enables focus mode.
              </div>
          </div>

          <div className="control-section">
            <h3>Window</h3>
            <button onClick={toggleClickThrough}>
              {clickThrough ? "Disable" : "Enable"} Click-Through
            </button>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>
                • Interact with background apps while its on top, making it invisible. 
              </div>
            <button onClick={() => setShowControls(false)}>Hide Controls</button>
            <button onClick={saveSession}>Save Session</button>
            <button onClick={() => setShowShortcuts(true)}>⌨️ Keyboard Shortcuts</button>
          </div>


        </div>
      )}

      {!showControls && (
        <button
          className="show-controls-button"
          onClick={() => setShowControls(true)}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            zIndex: 1000,
          }}
        >
          Show Controls
        </button>
      )}

      {/* Text container */}
      <div
        className="text-container"
        ref={textContainerRef}
        style={{
          pointerEvents: clickThrough ? "none" : "auto",
          userSelect: clickThrough ? "none" : "auto",
        }}
      >
        <div className="text-content" style={textStyle}>
          {text.split("\n").map((line, index) => (
            <div key={index} className="text-line">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
