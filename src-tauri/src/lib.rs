use futures_util::StreamExt;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    net::TcpListener,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, State, Window,
};
use tokio_tungstenite::{accept_async, tungstenite::Message};

const DEFAULT_SCRIPT_PATH: &str = "scripts/current.txt";
const SCRIPTS_DIR: &str = "scripts";

/// Resolves the scripts directory using Tauri's app data dir so it works
/// correctly in both dev and installed production builds.
fn resolve_scripts_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
    let scripts_path = data_dir.join(SCRIPTS_DIR);
    if !scripts_path.exists() {
        fs::create_dir_all(&scripts_path)
            .map_err(|e| format!("Failed to create scripts dir: {e}"))?;
    }
    Ok(scripts_path)
}

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

/// What a watched path is being tracked for.
#[derive(Clone)]
enum WatchKind {
    /// The legacy single-script watcher (`script-updated` / `script-watcher-error` events).
    Script,
    /// An individually loaded file identified by a frontend-assigned ID (`file-updated` event).
    File { file_id: String },
    /// The scripts directory (`scripts-directory-updated` event).
    Directory { path: PathBuf },
}

/// A single `RecommendedWatcher` that handles all three watch use-cases.
struct UnifiedWatcher {
    watcher: RecommendedWatcher,
    /// Maps each watched path to its purpose.
    entries: HashMap<PathBuf, WatchKind>,
}

impl UnifiedWatcher {
    fn new(watcher: RecommendedWatcher) -> Self {
        Self { watcher, entries: HashMap::new() }
    }
}

struct AppState {
    settings: Mutex<TeleprompterSettings>,
    click_through: Mutex<bool>,
    /// Unified file watcher — replaces the three separate watchers.
    watcher: Mutex<Option<UnifiedWatcher>>,
    /// Port the WebSocket remote-control server is listening on (0 = not started).
    ws_port: Mutex<u16>,
}

fn resolve_script_path(app: &tauri::AppHandle, path: &str) -> Result<PathBuf, String> {
    let mut candidate = PathBuf::from(path);
    if candidate.is_relative() {
        // Anchor relative paths to the app data directory, not the process cwd.
        let data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
        candidate = data_dir.join(candidate);
    }
    if let Some(parent) = candidate.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    if !candidate.exists() {
        fs::write(&candidate, "").map_err(|e| e.to_string())?;
    }
    Ok(candidate)
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

/// Build the single shared `UnifiedWatcher` if it doesn't exist yet.
///
/// The watcher callback dispatches events to the correct Tauri event based on
/// which `WatchKind` is registered for the changed path.
fn ensure_watcher(
    app: &tauri::AppHandle,
    guard: &mut Option<UnifiedWatcher>,
) -> Result<(), String> {
    if guard.is_some() {
        return Ok(());
    }

    let app_clone = app.clone();

    let watcher = notify::recommended_watcher(
        move |res: Result<Event, notify::Error>| {
            let event = match res {
                Ok(e) => e,
                Err(e) => {
                    if let Some(w) = app_clone.get_webview_window("main") {
                        let _ = w.emit("script-watcher-error", serde_json::json!({ "error": e.to_string() }));
                    }
                    return;
                }
            };

            // Only react to actual data writes — ignore Access, Metadata, etc.
            let is_data_event = matches!(
                event.kind,
                EventKind::Modify(notify::event::ModifyKind::Data(_))
                    | EventKind::Create(_)
                    | EventKind::Remove(_)
            );
            if !is_data_event {
                return;
            }

            // Retrieve the current entry map from AppState via the app handle.
            let state = app_clone.state::<AppState>();
            let entries = {
                let guard = state.watcher.lock().unwrap();
                guard.as_ref().map(|w| w.entries.clone()).unwrap_or_default()
            };

            for changed_path in &event.paths {
                // Direct path match
                if let Some(kind) = entries.get(changed_path) {
                    dispatch_watch_event(&app_clone, changed_path, kind, &event.kind);
                    continue;
                }
                // Directory match — the changed file is inside a watched directory
                for (watched_path, kind) in &entries {
                    if let WatchKind::Directory { .. } = kind {
                        if changed_path.starts_with(watched_path) {
                            dispatch_watch_event(&app_clone, changed_path, kind, &event.kind);
                        }
                    }
                }
            }
        },
    )
    .map_err(|e| e.to_string())?;

    *guard = Some(UnifiedWatcher::new(watcher));
    Ok(())
}

fn dispatch_watch_event(
    app: &tauri::AppHandle,
    changed_path: &Path,
    kind: &WatchKind,
    event_kind: &EventKind,
) {
    let window = match app.get_webview_window("main") {
        Some(w) => w,
        None => return,
    };

    match kind {
        WatchKind::Script => {
            let payload = fs::read_to_string(changed_path)
                .map(|text| serde_json::json!({ "text": text }))
                .unwrap_or_else(|e| serde_json::json!({ "error": e.to_string() }));
            let _ = window.emit("script-updated", payload);
        }
        WatchKind::File { file_id } => {
            if let Ok(content) = fs::read_to_string(changed_path) {
                let _ = window.emit("file-updated", serde_json::json!({
                    "fileId": file_id,
                    "content": content,
                    "path": changed_path.to_string_lossy(),
                }));
            }
        }
        WatchKind::Directory { path: dir_path } => {
            // Only react to .txt / .md files
            let ext = changed_path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext != "txt" && ext != "md" {
                return;
            }
            // Re-read the whole directory and emit the updated list.
            if let Ok(entries) = fs::read_dir(dir_path) {
                let mut files: Vec<serde_json::Value> = entries
                    .flatten()
                    .filter_map(|e| {
                        let p = e.path();
                        if !p.is_file() { return None; }
                        let ext = p.extension()?.to_str()?;
                        if ext != "txt" && ext != "md" { return None; }
                        let name = p.file_name()?.to_string_lossy().to_string();
                        let content = fs::read_to_string(&p).ok()?;
                        Some(serde_json::json!({ "name": name, "path": p.to_string_lossy(), "content": content }))
                    })
                    .collect();
                files.sort_by(|a, b| {
                    a["name"].as_str().unwrap_or("").cmp(b["name"].as_str().unwrap_or(""))
                });
                let _ = window.emit("scripts-directory-updated", files);
            }
            // Suppress unused-variable warning for event_kind in this arm
            let _ = event_kind;
        }
    }
}

#[tauri::command]
fn start_script_watcher(
    app: tauri::AppHandle,
    window: Window,
    state: State<AppState>,
    path: Option<String>,
) -> Result<(), String> {
    let script_path = resolve_script_path(&app, path.as_deref().unwrap_or(DEFAULT_SCRIPT_PATH))?;

    let mut guard = state.watcher.lock().unwrap();
    ensure_watcher(&app, &mut guard)?;
    let uw = guard.as_mut().unwrap();

    // Unwatch any previous script path.
    let old_script: Option<PathBuf> = uw.entries.iter()
        .find(|(_, v)| matches!(v, WatchKind::Script))
        .map(|(k, _)| k.clone());
    if let Some(old) = old_script {
        let _ = uw.watcher.unwatch(&old);
        uw.entries.remove(&old);
    }

    uw.watcher.watch(&script_path, RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;
    uw.entries.insert(script_path.clone(), WatchKind::Script);

    // Emit the current content immediately.
    let payload = fs::read_to_string(&script_path)
        .map(|text| serde_json::json!({ "text": text }))
        .unwrap_or_else(|e| serde_json::json!({ "error": e.to_string() }));
    let _ = window.emit("script-updated", payload);

    Ok(())
}

#[tauri::command]
fn stop_script_watcher(state: State<AppState>) -> Result<(), String> {
    let mut guard = state.watcher.lock().unwrap();
    if let Some(uw) = guard.as_mut() {
        let old: Option<PathBuf> = uw.entries.iter()
            .find(|(_, v)| matches!(v, WatchKind::Script))
            .map(|(k, _)| k.clone());
        if let Some(p) = old {
            let _ = uw.watcher.unwatch(&p);
            uw.entries.remove(&p);
        }
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
        return Err(format!("File does not exist: {path}"));
    }

    let mut guard = state.watcher.lock().unwrap();
    ensure_watcher(&app, &mut guard)?;
    let uw = guard.as_mut().unwrap();

    uw.watcher.watch(&file_path, RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;
    uw.entries.insert(file_path, WatchKind::File { file_id });
    Ok(())
}

#[tauri::command]
fn unwatch_file(file_id: String, state: State<AppState>) -> Result<(), String> {
    let mut guard = state.watcher.lock().unwrap();
    if let Some(uw) = guard.as_mut() {
        let key: Option<PathBuf> = uw.entries.iter()
            .find(|(_, v)| matches!(v, WatchKind::File { file_id: id } if id == &file_id))
            .map(|(k, _)| k.clone());
        if let Some(p) = key {
            let _ = uw.watcher.unwatch(&p);
            uw.entries.remove(&p);
        }
    }
    Ok(())
}

#[tauri::command]
fn unwatch_all_files(state: State<AppState>) -> Result<(), String> {
    let mut guard = state.watcher.lock().unwrap();
    if let Some(uw) = guard.as_mut() {
        let file_paths: Vec<PathBuf> = uw.entries.iter()
            .filter(|(_, v)| matches!(v, WatchKind::File { .. }))
            .map(|(k, _)| k.clone())
            .collect();
        for p in file_paths {
            let _ = uw.watcher.unwatch(&p);
            uw.entries.remove(&p);
        }
    }
    Ok(())
}

#[tauri::command]
fn save_script_to_directory(
    app: tauri::AppHandle,
    filename: String,
    content: String,
) -> Result<String, String> {
    let scripts_path = resolve_scripts_dir(&app)?;

    // Ensure filename ends with .txt
    let filename = if filename.ends_with(".txt") || filename.ends_with(".md") {
        filename
    } else {
        format!("{}.txt", filename)
    };

    let file_path = scripts_path.join(&filename);
    fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_scripts_from_directory(app: tauri::AppHandle) -> Result<Vec<ScriptFile>, String> {
    let scripts_path = resolve_scripts_dir(&app)?;

    let mut script_files = Vec::new();

    for entry in fs::read_dir(&scripts_path).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "txt" || ext == "md" {
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
                        Err(e) => eprintln!("Failed to read {:?}: {}", path, e),
                    }
                }
            }
        }
    }

    script_files.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(script_files)
}

#[tauri::command]
fn watch_scripts_directory(
    app: tauri::AppHandle,
    state: State<AppState>,
) -> Result<(), String> {
    let scripts_path = resolve_scripts_dir(&app)?;

    let mut guard = state.watcher.lock().unwrap();
    ensure_watcher(&app, &mut guard)?;
    let uw = guard.as_mut().unwrap();

    // Unwatch any previous directory entry.
    let old: Option<PathBuf> = uw.entries.iter()
        .find(|(_, v)| matches!(v, WatchKind::Directory { .. }))
        .map(|(k, _)| k.clone());
    if let Some(p) = old {
        let _ = uw.watcher.unwatch(&p);
        uw.entries.remove(&p);
    }

    uw.watcher.watch(&scripts_path, RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;
    uw.entries.insert(scripts_path.clone(), WatchKind::Directory { path: scripts_path });
    Ok(())
}

#[tauri::command]
fn stop_watching_scripts_directory(state: State<AppState>) -> Result<(), String> {
    let mut guard = state.watcher.lock().unwrap();
    if let Some(uw) = guard.as_mut() {
        let old: Option<PathBuf> = uw.entries.iter()
            .find(|(_, v)| matches!(v, WatchKind::Directory { .. }))
            .map(|(k, _)| k.clone());
        if let Some(p) = old {
            let _ = uw.watcher.unwatch(&p);
            uw.entries.remove(&p);
        }
    }
    Ok(())
}

/// Copy a font file into `app_data_dir/fonts/` and return a base64 data URL
/// the frontend can use directly in a `@font-face` rule.
///
/// Returns `{ name, data_url }` where `name` is the stem of the filename
/// (e.g. `"MyFont"` for `MyFont.ttf`).
#[tauri::command]
fn import_font(app: tauri::AppHandle, src_path: String) -> Result<serde_json::Value, String> {
    let src = PathBuf::from(&src_path);

    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    let mime = match ext.as_str() {
        "ttf"   => "font/truetype",
        "otf"   => "font/opentype",
        "woff"  => "font/woff",
        "woff2" => "font/woff2",
        other   => return Err(format!("Unsupported font format: .{other}")),
    };

    let font_name = src
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or("Invalid filename")?
        .to_string();

    // Copy to app data dir so the font persists across sessions.
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let fonts_dir = data_dir.join("fonts");
    fs::create_dir_all(&fonts_dir).map_err(|e| e.to_string())?;

    let dest = fonts_dir.join(src.file_name().ok_or("Invalid filename")?);
    fs::copy(&src, &dest).map_err(|e| format!("Failed to copy font: {e}"))?;

    // Read and base64-encode.
    let bytes = fs::read(&dest).map_err(|e| e.to_string())?;
    let mut b64 = String::new();
    // Simple base64 encoding without an extra dep — use the alphabet directly.
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut i = 0;
    while i + 2 < bytes.len() {
        let n = ((bytes[i] as u32) << 16) | ((bytes[i+1] as u32) << 8) | (bytes[i+2] as u32);
        b64.push(ALPHABET[((n >> 18) & 63) as usize] as char);
        b64.push(ALPHABET[((n >> 12) & 63) as usize] as char);
        b64.push(ALPHABET[((n >>  6) & 63) as usize] as char);
        b64.push(ALPHABET[( n        & 63) as usize] as char);
        i += 3;
    }
    match bytes.len() - i {
        1 => {
            let n = (bytes[i] as u32) << 16;
            b64.push(ALPHABET[((n >> 18) & 63) as usize] as char);
            b64.push(ALPHABET[((n >> 12) & 63) as usize] as char);
            b64.push_str("==");
        }
        2 => {
            let n = ((bytes[i] as u32) << 16) | ((bytes[i+1] as u32) << 8);
            b64.push(ALPHABET[((n >> 18) & 63) as usize] as char);
            b64.push(ALPHABET[((n >> 12) & 63) as usize] as char);
            b64.push(ALPHABET[((n >>  6) & 63) as usize] as char);
            b64.push('=');
        }
        _ => {}
    }
    let data_url = format!("data:{mime};base64,{b64}");

    Ok(serde_json::json!({ "name": font_name, "data_url": data_url }))
}

/// Return a list of previously imported fonts as `{ name, data_url }` objects.
#[tauri::command]
fn list_imported_fonts(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let fonts_dir = data_dir.join("fonts");
    if !fonts_dir.exists() {
        return Ok(vec![]);
    }

    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = Vec::new();

    for entry in fs::read_dir(&fonts_dir).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        if !path.is_file() { continue; }
        let ext = path.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()).unwrap_or_default();
        let mime = match ext.as_str() {
            "ttf"   => "font/truetype",
            "otf"   => "font/opentype",
            "woff"  => "font/woff",
            "woff2" => "font/woff2",
            _       => continue,
        };
        let name = match path.file_stem().and_then(|s| s.to_str()) {
            Some(n) => n.to_string(),
            None    => continue,
        };
        let bytes = match fs::read(&path) { Ok(b) => b, Err(_) => continue };

        let mut b64 = String::new();
        let mut i = 0;
        while i + 2 < bytes.len() {
            let n = ((bytes[i] as u32) << 16) | ((bytes[i+1] as u32) << 8) | (bytes[i+2] as u32);
            b64.push(ALPHABET[((n >> 18) & 63) as usize] as char);
            b64.push(ALPHABET[((n >> 12) & 63) as usize] as char);
            b64.push(ALPHABET[((n >>  6) & 63) as usize] as char);
            b64.push(ALPHABET[( n        & 63) as usize] as char);
            i += 3;
        }
        match bytes.len() - i {
            1 => {
                let n = (bytes[i] as u32) << 16;
                b64.push(ALPHABET[((n >> 18) & 63) as usize] as char);
                b64.push(ALPHABET[((n >> 12) & 63) as usize] as char);
                b64.push_str("==");
            }
            2 => {
                let n = ((bytes[i] as u32) << 16) | ((bytes[i+1] as u32) << 8);
                b64.push(ALPHABET[((n >> 18) & 63) as usize] as char);
                b64.push(ALPHABET[((n >> 12) & 63) as usize] as char);
                b64.push(ALPHABET[((n >>  6) & 63) as usize] as char);
                b64.push('=');
            }
            _ => {}
        }
        result.push(serde_json::json!({ "name": name, "data_url": format!("data:{mime};base64,{b64}") }));
    }

    result.sort_by(|a, b| {
        a["name"].as_str().unwrap_or("").cmp(b["name"].as_str().unwrap_or(""))
    });
    Ok(result)
}

/// Return the app data directory as a string so the UI can display it for MCP setup.
#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// Toggle whether the window appears in the OS taskbar.
#[tauri::command]
fn set_skip_taskbar(app: tauri::AppHandle, skip: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_skip_taskbar(skip).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Return a list of available monitors with their position, size, and scale factor.
#[tauri::command]
fn list_monitors(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    let result = monitors
        .into_iter()
        .enumerate()
        .map(|(i, m)| {
            serde_json::json!({
                "index": i,
                "name": m.name().map(|s| s.as_str()).unwrap_or(""),
                "x": m.position().x,
                "y": m.position().y,
                "width": m.size().width,
                "height": m.size().height,
                "scale_factor": m.scale_factor(),
            })
        })
        .collect();
    Ok(result)
}

/// Start a WebSocket server on an OS-assigned port.
///
/// Each connected client can send JSON messages of the form:
///   `{"action": "play" | "pause" | "faster" | "slower" | "reset"}`
///
/// The server forwards these as `remote-action` Tauri events to the frontend.
/// Returns the port number so the UI can display a QR / URL for the phone.
#[tauri::command]
async fn start_ws_server(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<u16, String> {
    // If already running, return the existing port.
    {
        let port = state.ws_port.lock().unwrap();
        if *port != 0 {
            return Ok(*port);
        }
    }

    // Bind on port 0 to let the OS pick a free port, then immediately read it.
    let listener = TcpListener::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let port = listener
        .local_addr()
        .map_err(|e| e.to_string())?
        .port();

    {
        let mut p = state.ws_port.lock().unwrap();
        *p = port;
    }

    // Tokio requires the std listener to be in non-blocking mode before
    // adopting it; otherwise `accept().await` blocks the worker thread and
    // incoming connections are accepted by the kernel but never handled.
    listener
        .set_nonblocking(true)
        .map_err(|e| e.to_string())?;

    // Convert to a Tokio listener and spawn the accept loop.
    let tokio_listener =
        tokio::net::TcpListener::from_std(listener).map_err(|e| e.to_string())?;

    let app_clone = app.clone();
    tokio::spawn(async move {
        loop {
            match tokio_listener.accept().await {
                Ok((stream, _addr)) => {
                    let app_inner = app_clone.clone();
                    tokio::spawn(async move {
                        if let Ok(ws) = accept_async(stream).await {
                            let (mut _sink, mut source) = ws.split();
                            while let Some(Ok(msg)) = source.next().await {
                                if let Message::Text(text) = msg {
                                    if let Ok(val) =
                                        serde_json::from_str::<serde_json::Value>(&text)
                                    {
                                        if let Some(action) =
                                            val.get("action").and_then(|v| v.as_str())
                                        {
                                            if let Some(window) =
                                                app_inner.get_webview_window("main")
                                            {
                                                let _ = window.emit(
                                                    "remote-action",
                                                    serde_json::json!({ "action": action }),
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
                Err(e) => {
                    eprintln!("WS accept error: {e}");
                    break;
                }
            }
        }
    });

    Ok(port)
}

/// Return the local non-loopback IPv4 address and the WS port (0 if not started).
#[tauri::command]
fn get_ws_info(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let port = *state.ws_port.lock().unwrap();

    // Walk network interfaces to find the first non-loopback IPv4 address.
    let ip = local_ip().unwrap_or_else(|| "127.0.0.1".to_string());

    Ok(serde_json::json!({ "ip": ip, "port": port }))
}

/// Best-effort: return the first non-loopback IPv4 address visible on the LAN.
fn local_ip() -> Option<String> {
    // Connect a UDP socket to a public address (no packet is actually sent).
    // The OS picks the source address that would be used for that route.
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let addr = socket.local_addr().ok()?;
    Some(addr.ip().to_string())
}

/// Move the main window to a specific monitor by index.
#[tauri::command]
fn move_to_monitor(app: tauri::AppHandle, monitor_index: usize) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    if let Some(monitor) = monitors.get(monitor_index) {
        let pos = monitor.position();
        window
            .set_position(tauri::PhysicalPosition::new(pos.x, pos.y))
            .map_err(|e| e.to_string())?;
    }
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
            watcher: Mutex::new(None),
            ws_port: Mutex::new(0),
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
            set_skip_taskbar,
            list_monitors,
            move_to_monitor,
            start_ws_server,
            get_ws_info,
            import_font,
            list_imported_fonts,
            get_app_data_dir,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            // System tray with Play/Pause, Show/Hide, and Quit items.
            let show_hide = MenuItem::with_id(app, "show_hide", "Show / Hide", true, None::<&str>)?;
            let play_pause = MenuItem::with_id(app, "play_pause", "Play / Pause", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_hide, &play_pause, &quit])?;

            let icon = app.default_window_icon().cloned()
                .ok_or("no default window icon")?;

            TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app: &tauri::AppHandle, event| match event.id.as_ref() {
                    "show_hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "play_pause" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("tray-play-pause", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray: &tauri::tray::TrayIcon, event| {
                    // Left-click toggles window visibility
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
