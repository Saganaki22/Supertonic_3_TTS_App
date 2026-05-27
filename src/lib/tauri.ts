import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { readText } from "@tauri-apps/plugin-clipboard-manager";

export async function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export async function saveWavFile(path: string, bytes: number[]): Promise<void> {
  return invoke<void>("save_wav_file", { path, bytes });
}

export async function saveMp3File(path: string, bytes: number[]): Promise<void> {
  return invoke<void>("save_mp3_file", { path, bytes });
}

export async function extractPdfText(path: string): Promise<string> {
  return invoke<string>("extract_pdf_text", { path });
}

export async function extractDocxText(path: string): Promise<string> {
  return invoke<string>("extract_docx_text", { path });
}

export async function getLogicalCpuCount(): Promise<number> {
  return invoke<number>("logical_cpu_count");
}

export async function openTextFile(): Promise<string | null> {
  return open({
    multiple: false,
    filters: [{ name: "Text files", extensions: ["txt", "pdf", "docx", "md"] }],
  });
}

export async function browseSave(
  defaultPath: string,
  filters: { name: string; extensions: string[] }[]
): Promise<string | null> {
  return save({ defaultPath, filters });
}

export function openExternal(url: string): void {
  shellOpen(url);
}

export async function pasteFromClipboard(): Promise<string> {
  return await readText();
}
