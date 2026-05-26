use tauri::command;

const MAX_FILE_SIZE: u64 = 20 * 1024 * 1024;

#[command]
pub fn extract_pdf_text(path: String) -> Result<String, String> {
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_FILE_SIZE {
        return Err(format!(
            "File too large ({} MB). Maximum supported size is 20 MB.",
            (meta.len() / (1024 * 1024))
        ));
    }
    pdf_extract::extract_text(&path).map_err(|e| e.to_string())
}
