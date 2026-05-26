import * as ort from "onnxruntime-web";

export const AVAILABLE_LANGS = [
  "en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et", "fi",
  "fr", "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl", "pt", "ro",
  "ru", "sk", "sl", "sv", "tr", "uk", "vi",
];

export const HF_BASE =
  "https://huggingface.co/Supertone/supertonic-3/resolve/main";

const MODEL_HASHES: Record<string, string> = {
  "onnx/tts.json": "42078d3aef1cd43ab43021f3c54f47d2d75ceb4e75f627f118890128b06a0d09",
  "onnx/duration_predictor.onnx": "c3eb91414d5ff8a7a239b7fe9e34e7e2bf8a8140d8375ffb14718b1c639325db",
  "onnx/text_encoder.onnx": "c7befd5ea8c3119769e8a6c1486c4edc6a3bc8365c67621c881bbb774b9902ff",
  "onnx/vector_estimator.onnx": "883ac868ea0275ef0e991524dc64f16b3c0376efd7c320af6b53f5b780d7c61c",
  "onnx/vocoder.onnx": "085de76dd8e8d5836d6ca66826601f615939218f90e519f70ee8a36ed2a4c4ba",
  "onnx/unicode_indexer.json": "9bf7346e43883a81f8645c81224f786d43c5b57f3641f6e7671a7d6c493cb24f",
};

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function fetchWithHashCheck(url: string, relPath: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${relPath}: ${res.status}`);
  const buf = await res.arrayBuffer();
  const expected = MODEL_HASHES[relPath];
  if (expected) {
    const actual = await sha256Hex(buf);
    if (actual !== expected) {
      throw new Error(
        `Integrity check failed for ${relPath}.\nExpected: ${expected}\nGot:      ${actual}\nThe file may be corrupted or tampered with.`
      );
    }
  }
  return buf;
}

export type ProgressCallback = (step: number, total: number) => void;
export type ChunkProgressCallback = (chunk: number, totalChunks: number, step: number, totalSteps: number) => void;

class UnicodeProcessor {
  private indexer: number[];

  constructor(indexer: number[]) {
    this.indexer = indexer;
  }

  call(textList: string[], langList: string[]) {
    const processedTexts = textList.map((t, i) =>
      this.preprocessText(t, langList[i])
    );
    const lengths = processedTexts.map((t) => t.length);
    const maxLen = Math.max(...lengths);
    const textIds = processedTexts.map((text) => {
      const row = new Array(maxLen).fill(0);
      for (let j = 0; j < text.length; j++) {
        const cp = text.codePointAt(j)!;
        row[j] = cp < this.indexer.length ? this.indexer[cp] : -1;
      }
      return row;
    });
    const textMask = this.lengthToMask(lengths);
    return { textIds, textMask };
  }

  private preprocessText(text: string, lang: string): string {
    text = text.normalize("NFKD");
    const emoji =
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu;
    text = text.replace(emoji, "");
    const reps: Record<string, string> = {
      "–": "-", "‑": "-", "—": "-", _: " ", "\u201C": '"', "\u201D": '"',
      "\u2018": "'", "\u2019": "'", "´": "'", "`": "'", "[": " ", "]": " ",
      "|": " ", "/": " ", "#": " ", "→": " ", "←": " ",
    };
    for (const [k, v] of Object.entries(reps)) text = text.replaceAll(k, v);
    text = text.replace(/[♥☆♡©\\]/g, "");
    const exprs: Record<string, string> = {
      "@": " at ", "e.g.,": "for example, ", "i.e.,": "that is, ",
    };
    for (const [k, v] of Object.entries(exprs)) text = text.replaceAll(k, v);
    text = text
      .replace(/ ,/g, ",")
      .replace(/ \./g, ".")
      .replace(/ !/g, "!")
      .replace(/ \?/g, "?")
      .replace(/ ;/g, ";")
      .replace(/ :/g, ":")
      .replace(/ '/g, "'");
    while (text.includes('""')) text = text.replace('""', '"');
    while (text.includes("''")) text = text.replace("''", "'");
    while (text.includes("``")) text = text.replace("``", "`");
    text = text.replace(/\s+/g, " ").trim();
    if (!/[.!?;:,'\"')\]}…。」』】〉》›»]$/.test(text)) text += ".";
    if (!AVAILABLE_LANGS.includes(lang))
      throw new Error(`Invalid language: ${lang}`);
    return `<${lang}>${text}</${lang}>`;
  }

  lengthToMask(lengths: number[], maxLen: number | null = null): number[][][] {
    const actual = maxLen ?? Math.max(...lengths);
    return lengths.map((len) => {
      const row = new Array(actual).fill(0.0);
      for (let j = 0; j < Math.min(len, actual); j++) row[j] = 1.0;
      return [row];
    });
  }
}

class Style {
  constructor(
    public ttl: ort.Tensor,
    public dp: ort.Tensor
  ) {}
}

export class TextToSpeech {
  public sampleRate: number;

  constructor(
    private cfgs: any,
    private textProcessor: UnicodeProcessor,
    private dpOrt: ort.InferenceSession,
    private textEncOrt: ort.InferenceSession,
    private vectorEstOrt: ort.InferenceSession,
    private vocoderOrt: ort.InferenceSession
  ) {
    this.sampleRate = cfgs.ae.sample_rate;
  }

  async call(
    text: string,
    lang: string,
    style: Style,
    totalStep: number,
    speed = 1.05,
    silenceDuration = 0.3,
    onProgress?: ChunkProgressCallback
  ): Promise<{ wav: number[]; duration: number[] }> {
    const maxLen = lang === "ko" || lang === "ja" ? 120 : 300;
    const { chunkText } = await import("./helpers");
    const textList = chunkText(text, maxLen);
    const langList = new Array(textList.length).fill(lang);
    const totalChunks = textList.length;
    let wavCat: number[] = [];
    let durCat = 0;
    for (let i = 0; i < textList.length; i++) {
      const onStep: ProgressCallback | undefined = onProgress
        ? (step, total) => onProgress(i + 1, totalChunks, step, total)
        : undefined;
      const { wav, duration } = await this._infer(
        [textList[i]],
        [langList[i]],
        style,
        totalStep,
        speed,
        onStep
      );
      if (wavCat.length === 0) {
        wavCat = wav;
        durCat = duration[0];
      } else {
        const silenceLen = Math.floor(silenceDuration * this.sampleRate);
        wavCat = [...wavCat, ...new Array(silenceLen).fill(0), ...wav];
        durCat += duration[0] + silenceDuration;
      }
    }
    return { wav: wavCat, duration: [durCat] };
  }

  private async _infer(
    textList: string[],
    langList: string[],
    style: Style,
    totalStep: number,
    speed: number,
    onStep?: ProgressCallback
  ) {
    const bsz = textList.length;
    const { textIds, textMask } = this.textProcessor.call(textList, langList);
    const textIdsFlat = new BigInt64Array(
      textIds.flat().map((x) => BigInt(x))
    );
    const textIdsTensor = new ort.Tensor("int64", textIdsFlat, [
      bsz,
      textIds[0].length,
    ]);
    const textMaskFlat = new Float32Array(textMask.flat(2));
    const textMaskTensor = new ort.Tensor("float32", textMaskFlat, [
      bsz,
      1,
      textMask[0][0].length,
    ]);

    const dpOut = await this.dpOrt.run({
      text_ids: textIdsTensor,
      style_dp: style.dp,
      text_mask: textMaskTensor,
    });
    const duration = Array.from(dpOut.duration.data as Float32Array);
    for (let i = 0; i < duration.length; i++) duration[i] /= speed;

    const textEncOut = await this.textEncOrt.run({
      text_ids: textIdsTensor,
      style_ttl: style.ttl,
      text_mask: textMaskTensor,
    });
    const textEmb = textEncOut.text_emb;

    let { xt, latentMask } = this.sampleNoisyLatent(
      duration,
      this.sampleRate,
      this.cfgs.ae.base_chunk_size,
      this.cfgs.ttl.chunk_compress_factor,
      this.cfgs.ttl.latent_dim
    );
    const latentMaskFlat = new Float32Array(latentMask.flat(2));
    const latentMaskTensor = new ort.Tensor("float32", latentMaskFlat, [
      bsz,
      1,
      latentMask[0][0].length,
    ]);
    const totalStepT = new ort.Tensor(
      "float32",
      new Float32Array(bsz).fill(totalStep),
      [bsz]
    );

    for (let step = 0; step < totalStep; step++) {
      onStep?.(step + 1, totalStep);
      await new Promise<void>((r) => setTimeout(r, 0));
      const curT = new ort.Tensor(
        "float32",
        new Float32Array(bsz).fill(step),
        [bsz]
      );
      const xtT = new ort.Tensor("float32", new Float32Array(xt.flat(2)), [
        bsz,
        xt[0].length,
        xt[0][0].length,
      ]);
      const vecOut = await this.vectorEstOrt.run({
        noisy_latent: xtT,
        text_emb: textEmb,
        style_ttl: style.ttl,
        latent_mask: latentMaskTensor,
        text_mask: textMaskTensor,
        current_step: curT,
        total_step: totalStepT,
      });
      const denoised = Array.from(
        vecOut.denoised_latent.data as Float32Array
      );
      const dim = xt[0].length;
      const len = xt[0][0].length;
      xt = [];
      let idx = 0;
      for (let b = 0; b < bsz; b++) {
        const batch: number[][] = [];
        for (let d = 0; d < dim; d++) {
          const row: number[] = [];
          for (let t = 0; t < len; t++) row.push(denoised[idx++]);
          batch.push(row);
        }
        xt.push(batch);
      }
    }

    const finalT = new ort.Tensor("float32", new Float32Array(xt.flat(2)), [
      bsz,
      xt[0].length,
      xt[0][0].length,
    ]);
    const vocOut = await this.vocoderOrt.run({ latent: finalT });
    return {
      wav: Array.from(vocOut.wav_tts.data as Float32Array),
      duration,
    };
  }

  private sampleNoisyLatent(
    duration: number[],
    sampleRate: number,
    baseChunkSize: number,
    chunkCompress: number,
    latentDim: number
  ) {
    const bsz = duration.length;
    const maxDur = Math.max(...duration);
    const wavLenMax = Math.floor(maxDur * sampleRate);
    const wavLengths = duration.map((d) => Math.floor(d * sampleRate));
    const chunkSize = baseChunkSize * chunkCompress;
    const latentLen = Math.floor((wavLenMax + chunkSize - 1) / chunkSize);
    const dimVal = latentDim * chunkCompress;
    const xt: number[][][] = [];
    for (let b = 0; b < bsz; b++) {
      const batch: number[][] = [];
      for (let d = 0; d < dimVal; d++) {
        const row: number[] = [];
        for (let t = 0; t < latentLen; t++) {
          const u1 = Math.max(0.0001, Math.random());
          const u2 = Math.random();
          row.push(
            Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
          );
        }
        batch.push(row);
      }
      xt.push(batch);
    }
    const latentLengths = wavLengths.map((l) =>
      Math.floor((l + chunkSize - 1) / chunkSize)
    );
    const latentMask = this.textProcessor.lengthToMask(latentLengths, latentLen);
    for (let b = 0; b < bsz; b++)
      for (let d = 0; d < dimVal; d++)
        for (let t = 0; t < latentLen; t++)
          xt[b][d][t] *= latentMask[b][0][t];
    return { xt, latentMask };
  }
}

export async function loadVoiceStyle(paths: string[]): Promise<Style> {
  const bsz = paths.length;
  const first = await (await fetch(paths[0])).json();
  const ttlDims = first.style_ttl.dims;
  const dpDims = first.style_dp.dims;
  const ttlFlat = new Float32Array(bsz * ttlDims[1] * ttlDims[2]);
  const dpFlat = new Float32Array(bsz * dpDims[1] * dpDims[2]);
  for (let i = 0; i < bsz; i++) {
    const style = await (await fetch(paths[i])).json();
    ttlFlat.set(style.style_ttl.data.flat(Infinity), i * ttlDims[1] * ttlDims[2]);
    dpFlat.set(style.style_dp.data.flat(Infinity), i * dpDims[1] * dpDims[2]);
  }
  return new Style(
    new ort.Tensor("float32", ttlFlat, [bsz, ttlDims[1], ttlDims[2]]),
    new ort.Tensor("float32", dpFlat, [bsz, dpDims[1], dpDims[2]])
  );
}

export function loadCustomVoiceStyle(json: {
  style_ttl: { dims: number[]; data: number[][] };
  style_dp: { dims: number[]; data: number[][] };
}): Style {
  const ttlDims = json.style_ttl.dims;
  const dpDims = json.style_dp.dims;
  const ttlFlat = new Float32Array((json.style_ttl.data as any[]).flat(Infinity) as number[]);
  const dpFlat = new Float32Array((json.style_dp.data as any[]).flat(Infinity) as number[]);
  return new Style(
    new ort.Tensor("float32", ttlFlat, [1, ttlDims[1], ttlDims[2]]),
    new ort.Tensor("float32", dpFlat, [1, dpDims[1], dpDims[2]])
  );
}

export async function loadTextToSpeech(
  onnxDir: string,
  sessionOpts: ort.InferenceSession.SessionOptions,
  onLoad?: (name: string, cur: number, total: number) => void
): Promise<{ tts: TextToSpeech; cfgs: any }> {
  const cfgsBuf = await fetchWithHashCheck(`${onnxDir}/tts.json`, "onnx/tts.json");
  const cfgs = JSON.parse(new TextDecoder().decode(cfgsBuf));
  const modelFiles = [
    { name: "Duration Predictor", file: "duration_predictor.onnx" },
    { name: "Text Encoder", file: "text_encoder.onnx" },
    { name: "Vector Estimator", file: "vector_estimator.onnx" },
    { name: "Vocoder", file: "vocoder.onnx" },
  ];
  const sessions: ort.InferenceSession[] = [];
  for (let i = 0; i < modelFiles.length; i++) {
    onLoad?.(modelFiles[i].name, i + 1, modelFiles.length + 1);
    const relPath = `onnx/${modelFiles[i].file}`;
    const modelBuf = await fetchWithHashCheck(`${onnxDir}/${modelFiles[i].file}`, relPath);
    const blob = new Blob([modelBuf]);
    const url = URL.createObjectURL(blob);
    try {
      sessions.push(await ort.InferenceSession.create(url, sessionOpts));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const [dp, enc, vec, voc] = sessions;
  onLoad?.("Indexer", modelFiles.length + 1, modelFiles.length + 1);
  const idxBuf = await fetchWithHashCheck(`${onnxDir}/unicode_indexer.json`, "onnx/unicode_indexer.json");
  const indexer = JSON.parse(new TextDecoder().decode(idxBuf));
  const processor = new UnicodeProcessor(indexer);
  return {
    tts: new TextToSpeech(cfgs, processor, dp, enc, vec, voc),
    cfgs,
  };
}

export function writeWavFile(audioData: number[] | Float32Array, sampleRate: number): ArrayBuffer {
  const data =
    audioData instanceof Float32Array
      ? Array.from(audioData)
      : audioData;
  const numCh = 1;
  const bps = 16;
  const byteRate = sampleRate * numCh * (bps / 8);
  const blockAlign = numCh * (bps / 8);
  const dataSize = data.length * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  ws(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  ws(8, "WAVE");
  ws(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, numCh, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, bps, true);
  ws(36, "data");
  v.setUint32(40, dataSize, true);
  const i16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++)
    i16[i] = Math.floor(Math.max(-1, Math.min(1, data[i])) * 32767);
  new Uint8Array(buf, 44).set(new Uint8Array(i16.buffer));
  return buf;
}
