use tauri::command;

const MAX_FILE_SIZE: u64 = 20 * 1024 * 1024;

#[command]
pub fn extract_docx_text(path: String) -> Result<String, String> {
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_FILE_SIZE {
        return Err(format!(
            "File too large ({} MB). Maximum supported size is 20 MB.",
            (meta.len() / (1024 * 1024))
        ));
    }
    let data = std::fs::read(&path).map_err(|e| e.to_string())?;
    let docx = docx_rs::read_docx(&data).map_err(|e| e.to_string())?;
    let mut text = String::new();
    for child in &docx.document.children {
        if let docx_rs::DocumentChild::Paragraph(p) = child {
            for run_child in &p.children {
                if let docx_rs::ParagraphChild::Run(run) = run_child {
                    for rc in &run.children {
                        if let docx_rs::RunChild::Text(t) = rc {
                            text.push_str(&t.text);
                        }
                    }
                }
            }
            text.push('\n');
        }
    }
    Ok(text.trim().to_string())
}
