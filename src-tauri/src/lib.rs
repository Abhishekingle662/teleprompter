use tauri::{State, Window};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

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

struct AppState {
    settings: Mutex<TeleprompterSettings>,
    click_through: Mutex<bool>,
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
        })
        .invoke_handler(tauri::generate_handler![
            toggle_click_through,
            set_click_through,
            get_settings,
            update_settings,
            set_window_position,
            set_window_size,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
