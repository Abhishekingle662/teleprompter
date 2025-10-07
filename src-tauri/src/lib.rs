use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use tauri::{Emitter, Manager, State, Window};

const DEFAULT_SCRIPT_PATH: &str = "scripts/current.txt";
const SCRIPTS_DIR: &str = "scripts";

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ScriptFile {
    name: String,
    path: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct TeleprompterSettings {
    font_family: String,
    font_size: u32,
    wpm: u32,
    opacity: f64,
    blur: f64,
    margin_top: u32,
    margin_bottom: u32,
    margin_left: u32,
    margin_right: u32,
    mirror: bool,
    focus_band_enabled: bool,
    focus_band_position: u32,
    focus_band_height: u32,
    text_color: String,
}

impl Default for TeleprompterSettings {
    fn default() -> Self {
        Self {
            font_family: "Arial".to_string(),
            font_size: 48,
            wpm: 150,
            opacity: 1.0,
            blur: 0.0,
            margin_top: 50,
            margin_bottom: 50,
            margin_left: 50,
            margin_right: 50,
            mirror: false,
            focus_band_enabled: false,
            focus_band_position: 50,
            focus_band_height: 20,
            text_color: "#ffffff".to_string(),
        }
    }
}

struct ScriptWatcher {
    watcher: RecommendedWatcher,
    path: PathBuf,
}

struct FileWatcherEntry {
    path: PathBuf,
}

struct AppState {
    settings: Mutex<TeleprompterSettings>,
    click_through: Mutex<bool>,
    script_watcher: Mutex<Option<ScriptWatcher>>,
    file_watchers: Arc<Mutex<HashMap<String, FileWatcherEntry>>>,
    global_watcher: Mutex<Option<RecommendedWatcher>>,
    directory_watcher: Mutex<Option<RecommendedWatcher>>,
}

fn resolve_script_path(path: &str) -> Result<PathBuf, String> {
    let mut candidate = PathBuf::from(path);
    if candidate.is_relative() {
        let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
        candidate = cwd.join(candidate);
    }
    if let Some(parent) = candidate.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    if !candidate.exists() {
        fs::write(&candidate, "").map_err(|e| e.to_string())?;
    }
    Ok(candidate)
}

fn emit_script_update(window: &Window, path: &Path) {
    let payload = fs::read_to_string(path)
        .map(|text| serde_json::json!({ "text": text }))
        .unwrap_or_else(|err| serde_json::json!({ "error": err.to_string() }));

    if let Err(err) = window.emit("script-updated", payload) {
        eprintln!("Failed to emit script update: {err}");
    }
}

#[tauri::command]
fn toggle_click_through(window: Window, state: State<AppState>) -> Result<bool, String> {
    let mut click_through = state.click_through.lock().unwrap();
    *click_through = !*click_through;
    
    window.set_ignore_cursor_events(*click_through)
        .map_err(|e| e.to_string())?;
    
    Ok(*click_through)
}

#[tauri::command]
fn set_click_through(window: Window, enabled: bool, state: State<AppState>) -> Result<(), String> {
    let mut click_through = state.click_through.lock().unwrap();
    *click_through = enabled;
    
    window.set_ignore_cursor_events(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings(state: State<AppState>) -> Result<TeleprompterSettings, String> {
    let settings = state.settings.lock().unwrap();
    Ok(settings.clone())
}

#[tauri::command]
fn update_settings(settings: TeleprompterSettings, state: State<AppState>) -> Result<(), String> {
    let mut app_settings = state.settings.lock().unwrap();
    *app_settings = settings;
    Ok(())
}

#[tauri::command]
fn set_window_position(window: Window, x: i32, y: i32) -> Result<(), String> {
    use tauri::PhysicalPosition;
    window.set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_window_size(window: Window, width: u32, height: u32) -> Result<(), String> {
    use tauri::PhysicalSize;
    window.set_size(PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn start_script_watcher(
    window: Window,
    state: State<AppState>,
    path: Option<String>,
) -> Result<(), String> {
    let script_path = resolve_script_path(path.as_deref().unwrap_or(DEFAULT_SCRIPT_PATH))?;
    let watcher_path = script_path.clone();
    let window_clone = window.clone();

    let mut new_watcher = notify::recommended_watcher(
        move |res: Result<Event, notify::Error>| match res {
            Ok(_) => {
                emit_script_update(&window_clone, &watcher_path);
            }
            Err(err) => {
                let payload = serde_json::json!({ "error": err.to_string() });
                if let Err(e) = window_clone.emit("script-watcher-error", payload) {
                    eprintln!("Failed to emit watcher error: {e}");
                }
            }
        },
    )
    .map_err(|e| e.to_string())?;

    new_watcher
        .watch(&script_path, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    {
        let mut guard = state.script_watcher.lock().unwrap();
        if let Some(mut existing) = guard.take() {
            let _ = existing.watcher.unwatch(&existing.path);
        }
        *guard = Some(ScriptWatcher {
            watcher: new_watcher,
            path: script_path.clone(),
        });
    }

    emit_script_update(&window, &script_path);
    Ok(())
}

#[tauri::command]
fn stop_script_watcher(state: State<AppState>) -> Result<(), String> {
    let mut guard = state.script_watcher.lock().unwrap();
    if let Some(mut existing) = guard.take() {
        let _ = existing.watcher.unwatch(&existing.path);
    }
    Ok(())
}

#[tauri::command]
fn watch_file(
    file_id: String,
    path: String,
    app: tauri::AppHandle,
    state: State<AppState>,
) -> Result<(), String> {
    let file_path = PathBuf::from(&path);
    
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    // Store the file in our tracking
    {
        let mut watchers = state.file_watchers.lock().unwrap();
        watchers.insert(file_id.clone(), FileWatcherEntry {
            path: file_path.clone(),
        });
    }

    // Create or update the global watcher
    let mut global_watcher = state.global_watcher.lock().unwrap();
    
    if global_watcher.is_none() {
        // Create a new watcher if it doesn't exist
        let app_clone = app.clone();
        let watchers_clone = Arc::clone(&state.file_watchers);
        
        let watcher = notify::recommended_watcher(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    if let Some(path) = event.paths.first() {
                        // Find which file ID this path corresponds to
                        let watchers = watchers_clone.lock().unwrap();
                        for (id, entry) in watchers.iter() {
                            if entry.path == *path {
                                // Read the new content
                                if let Ok(content) = fs::read_to_string(path) {
                                    let payload = serde_json::json!({
                                        "fileId": id,
                                        "content": content,
                                        "path": path.to_string_lossy()
                                    });
                                    
                                    if let Some(window) = app_clone.get_webview_window("main") {
                                        let _ = window.emit("file-updated", payload);
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            }
        ).map_err(|e| e.to_string())?;
        
        *global_watcher = Some(watcher);
    }

    // Watch the file
    if let Some(watcher) = global_watcher.as_mut() {
        watcher.watch(&file_path, RecursiveMode::NonRecursive)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn unwatch_file(
    file_id: String,
    state: State<AppState>,
) -> Result<(), String> {
    let path = {
        let mut watchers = state.file_watchers.lock().unwrap();
        if let Some(entry) = watchers.remove(&file_id) {
            Some(entry.path)
        } else {
            None
        }
    };

    if let Some(file_path) = path {
        let mut global_watcher = state.global_watcher.lock().unwrap();
        if let Some(watcher) = global_watcher.as_mut() {
            let _ = watcher.unwatch(&file_path);
        }
    }

    Ok(())
}

#[tauri::command]
fn unwatch_all_files(state: State<AppState>) -> Result<(), String> {
    let mut watchers = state.file_watchers.lock().unwrap();
    let mut global_watcher = state.global_watcher.lock().unwrap();
    
    if let Some(watcher) = global_watcher.as_mut() {
        for (_, entry) in watchers.iter() {
            let _ = watcher.unwatch(&entry.path);
        }
    }
    
    watchers.clear();
    *global_watcher = None;
    
    Ok(())
}

#[tauri::command]
fn save_script_to_directory(filename: String, content: String) -> Result<String, String> {
    // Get the scripts directory path - go up from src-tauri to project root
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let scripts_path = if current_dir.ends_with("src-tauri") {
        // In dev mode, go up one level
        current_dir.parent().unwrap().join(SCRIPTS_DIR)
    } else {
        // In production, use current directory
        current_dir.join(SCRIPTS_DIR)
    };

    // Create scripts directory if it doesn't exist
    if !scripts_path.exists() {
        fs::create_dir_all(&scripts_path).map_err(|e| e.to_string())?;
    }

    // Ensure filename ends with .txt
    let filename = if filename.ends_with(".txt") {
        filename
    } else {
        format!("{}.txt", filename)
    };

    let file_path = scripts_path.join(&filename);
    
    // Write the content to the file
    fs::write(&file_path, content).map_err(|e| e.to_string())?;
    
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_scripts_from_directory() -> Result<Vec<ScriptFile>, String> {
    // Get the scripts directory path - go up from src-tauri to project root
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let scripts_path = if current_dir.ends_with("src-tauri") {
        // In dev mode, go up one level
        current_dir.parent().unwrap().join(SCRIPTS_DIR)
    } else {
        // In production, use current directory
        current_dir.join(SCRIPTS_DIR)
    };
    
    // Create the directory if it doesn't exist
    if !scripts_path.exists() {
        fs::create_dir_all(&scripts_path).map_err(|e| e.to_string())?;
    }
    
    
    let mut script_files = Vec::new();
    
    // Read all files from the directory
    let entries = fs::read_dir(&scripts_path).map_err(|e| {
        e.to_string()
    })?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            
            // Only process .txt and .md files
            if path.is_file() {
                if let Some(extension) = path.extension() {
                    if extension == "txt" || extension == "md" {
                        // Read the file content
                        match fs::read_to_string(&path) {
                            Ok(content) => {
                                if let Some(name) = path.file_name() {
                                    script_files.push(ScriptFile {
                                        name: name.to_string_lossy().to_string(),
                                        path: path.to_string_lossy().to_string(),
                                        content,
                                    });
                                }
                            }
                            Err(e) => {
                                println!("Failed to read file {:?}: {}", path, e);
                            }
                        }
                    } else {
                        println!("Skipping non-txt/md file: {:?}", path);
                    }
                }
            } else {
                println!("Not a file: {:?}", path);
            }
        }
    }
    
    // Sort by name
    script_files.sort_by(|a, b| a.name.cmp(&b.name));
    
    println!("Total scripts loaded: {}", script_files.len());
    
    Ok(script_files)
}

#[tauri::command]
fn watch_scripts_directory(
    app: tauri::AppHandle,
    state: State<AppState>,
) -> Result<(), String> {
    // Get the scripts directory path - go up from src-tauri to project root
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let scripts_path = if current_dir.ends_with("src-tauri") {
        // In dev mode, go up one level
        current_dir.parent().unwrap().join(SCRIPTS_DIR)
    } else {
        // In production, use current directory
        current_dir.join(SCRIPTS_DIR)
    };
    
    
    // Create the directory if it doesn't exist
    if !scripts_path.exists() {
        fs::create_dir_all(&scripts_path).map_err(|e| e.to_string())?;
    }

    let mut dir_watcher = state.directory_watcher.lock().unwrap();
    
    // Stop existing watcher if any
    if dir_watcher.is_some() {
        println!("Stopping existing directory watcher");
        *dir_watcher = None;
    }

    let app_clone = app.clone();
    let scripts_path_clone = scripts_path.clone();
    
    let mut watcher = notify::recommended_watcher(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                use notify::EventKind;
                
                println!("Directory event detected: {:?}", event.kind);
                
                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) => {
                        println!("Relevant event, checking paths: {:?}", event.paths);
                        // Check if any of the paths are .txt or .md files
                        for path in &event.paths {
                            if let Some(extension) = path.extension() {
                                if extension == "txt" || extension == "md" {
                                    println!("Text file change detected, reloading directory");
                                    // Get all scripts and emit update
                                    if let Ok(entries) = fs::read_dir(&scripts_path_clone) {
                                        let mut script_files = Vec::new();
                                        
                                        for entry in entries.flatten() {
                                            let entry_path = entry.path();
                                            if entry_path.is_file() {
                                                if let Some(ext) = entry_path.extension() {
                                                    if ext == "txt" || ext == "md" {
                                                        if let Ok(content) = fs::read_to_string(&entry_path) {
                                                            if let Some(name) = entry_path.file_name() {
                                                                script_files.push(serde_json::json!({
                                                                    "name": name.to_string_lossy().to_string(),
                                                                    "path": entry_path.to_string_lossy().to_string(),
                                                                    "content": content,
                                                                }));
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        
                                        script_files.sort_by(|a, b| {
                                            a["name"].as_str().unwrap_or("").cmp(b["name"].as_str().unwrap_or(""))
                                        });
                                        
                                        if let Some(window) = app_clone.get_webview_window("main") {
                                            let _ = window.emit("scripts-directory-updated", script_files);
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    ).map_err(|e| e.to_string())?;

    watcher.watch(&scripts_path, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    *dir_watcher = Some(watcher);
    
    println!("Directory watcher successfully started for: {:?}", scripts_path);
    
    Ok(())
}

#[tauri::command]
fn stop_watching_scripts_directory(state: State<AppState>) -> Result<(), String> {
    let mut dir_watcher = state.directory_watcher.lock().unwrap();
    *dir_watcher = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState {
            settings: Mutex::new(TeleprompterSettings::default()),
            click_through: Mutex::new(false),
            script_watcher: Mutex::new(None),
            file_watchers: Arc::new(Mutex::new(HashMap::new())),
            global_watcher: Mutex::new(None),
            directory_watcher: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            toggle_click_through,
            set_click_through,
            get_settings,
            update_settings,
            set_window_position,
            set_window_size,
            start_script_watcher,
            stop_script_watcher,
            watch_file,
            unwatch_file,
            unwatch_all_files,
            save_script_to_directory,
            get_scripts_from_directory,
            watch_scripts_directory,
            stop_watching_scripts_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
