import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "node_modules", "onnxruntime-web", "dist");
const out = join(root, "public", "ort");

mkdirSync(out, { recursive: true });

for (const file of [
  "ort.all.min.mjs",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
]) {
  copyFileSync(join(dist, file), join(out, file));
}
