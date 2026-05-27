use tauri::command;

#[command]
pub fn logical_cpu_count() -> usize {
    std::thread::available_parallelism()
        .map(|count| count.get())
        .unwrap_or(4)
}
