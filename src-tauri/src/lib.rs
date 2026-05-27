use tauri::http::header::{HeaderName, HeaderValue};
use tauri::{WebviewUrl, WebviewWindowBuilder};

mod commands;
use commands::{docx::*, fs::*, pdf::*, system::*};

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
            logical_cpu_count,
        ])
        .setup(|app| {
            std::env::set_var(
                "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
                "--enable-features=SharedArrayBuffer",
            );
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Supertonic 3 TTS App")
                .inner_size(1100.0, 750.0)
                .min_inner_size(960.0, 640.0)
                .resizable(true)
                .drag_and_drop(true)
                .on_web_resource_request(|_req, res| {
                    let h = res.headers_mut();
                    h.insert(
                        HeaderName::from_static("cross-origin-opener-policy"),
                        HeaderValue::from_static("same-origin"),
                    );
                    h.insert(
                        HeaderName::from_static("cross-origin-embedder-policy"),
                        HeaderValue::from_static("credentialless"),
                    );
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
