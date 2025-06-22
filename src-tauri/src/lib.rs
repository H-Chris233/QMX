// src-tauri/src/main.rs
use tauri::{Manager, WindowBuilder};

#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) {
    let _ = WindowBuilder::new(&app, "settings")
        .title("设置")
        .build();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_settings_window])
        .run(tauri::generate_context!())
        .expect("Error running app");
}
