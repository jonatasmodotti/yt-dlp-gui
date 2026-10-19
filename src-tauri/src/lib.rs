mod binaries;
mod browsers;
mod builder;
mod commands;
mod cookie_file;
mod errors;
mod jobs;
mod options;
mod process;
mod progress;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(jobs::JobManager::default())
        .invoke_handler(tauri::generate_handler![
            commands::engine_status,
            commands::preview_command,
            commands::start_download,
            commands::cancel_download,
            commands::detect_browsers,
            commands::inspect_cookie_file,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // Don't leave yt-dlp/ffmpeg running after the window closes.
            if let tauri::RunEvent::Exit = event {
                app.state::<jobs::JobManager>().kill_all();
            }
        });
}
