import lamejs from "lamejs-fixed";

export function chunkText(text: string, maxLen = 300): string[] {
  if (typeof text !== "string")
    throw new Error(`chunkText expects string, got ${typeof text}`);
  const paragraphs = text
    .trim()
    .split(/\n\s*\n+/)
    .filter((p) => p.trim());
  const chunks: string[] = [];
  for (let paragraph of paragraphs) {
    paragraph = paragraph.trim();
    if (!paragraph) continue;
    const sentences = paragraph.split(
      /(?<!Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Jr\.|Ph\.D\.|etc\.|e\.g\.|i\.e\.|vs\.|Inc\.|Ltd\.|Co\.|Corp\.|St\.|Ave\.|Blvd\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+/
    );
    let currentChunk = "";
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length + 1 <= maxLen) {
        currentChunk += (currentChunk ? " " : "") + sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
  }
  return chunks;
}

export function cleanPdfText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

export function normalizeAudio(float32: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < float32.length; i++) {
    const abs = Math.abs(float32[i]);
    if (abs > peak) peak = abs;
  }
  if (peak === 0 || peak >= 0.95) return float32;
  const scale = 0.95 / peak;
  const out = new Float32Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    out[i] = float32[i] * scale;
  }
  return out;
}

export function wavToMp3(
  float32: Float32Array,
  sampleRate = 44100,
  kbps = 192
): Uint8Array {
  const encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
  const samples = Int16Array.from(
    float32.map((s) => Math.max(-1, Math.min(1, s)) * 32767)
  );
  const blockSize = 1152;
  const parts: Uint8Array[] = [];
  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize);
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length > 0) parts.push(new Uint8Array(encoded));
  }
  const flushed = encoder.flush();
  if (flushed.length > 0) parts.push(new Uint8Array(flushed));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
