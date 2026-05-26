mod commands;
use commands::{fs::*, pdf::*, docx::*};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            save_wav_file,
            save_mp3_file,
            extract_pdf_text,
            extract_docx_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
