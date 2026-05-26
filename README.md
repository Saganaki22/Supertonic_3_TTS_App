<p align="center">
  <img src="public/assets/logo.png" alt="Supertonic 3" width="80" />
  <h1 align="center">Supertonic 3 — TTS App</h1>
  <p align="center">On-device neural text-to-speech for Windows, powered by <a href="https://github.com/supertone-inc/supertonic">Supertone's Supertonic 3</a> engine.</p>
</p>

<p align="center">
  <a href="https://github.com/supertone-inc/supertonic">
    <img src="https://img.shields.io/badge/engine-supertone%2Fsupertonic-6e40c9?style=flat-square&logo=github" alt="Supertone Engine" />
  </a>
  <a href="https://huggingface.co/Supertone/supertonic-3">
    <img src="https://img.shields.io/badge/models-HuggingFace%20Supertone%2Fsupertonic--3-FFD21E?style=flat-square&logo=huggingface&logoColor=black" alt="HuggingFace Models" />
  </a>
  <img src="https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/Tauri-24C8D8?style=flat-square&logo=tauri&logoColor=white" alt="Tauri" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Windows-0078D4?style=flat-square&logo=windows11&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/Portable-NSIS-00A86B?style=flat-square" alt="Portable NSIS" />
</p>

<img width="1420" height="1122" alt="image" src="https://github.com/user-attachments/assets/4a3e96ee-6246-42dc-8c42-3f99536c54bc" />


---

## What It Does

Supertonic 3 TTS App is a **fully offline** text-to-speech application that runs neural TTS inference entirely on your device. No cloud, no API keys, no data leaves your machine.

It wraps the [Supertone Supertonic 3](https://github.com/supertone-inc/supertonic) ONNX models inside a Tauri 2 desktop app with a premium two-column UI built with React and TypeScript. Audio generation uses ONNX Runtime Web with **GPU acceleration via WebGPU** (falls back to WASM CPU automatically).

### Key Features

| Feature | Details |
|---|---|
| **On-device inference** | ONNX Runtime Web — GPU (WebGPU) or CPU (WASM SIMD) |
| **10 built-in voices** | 5 female (F1–F5) and 5 male (M1–M5) English voices |
| **Custom voice cloning** | Load `.json` voice style embeddings trained with [supertonic_embeddings_trainer](https://github.com/Saganaki22/supertonic_embeddings_trainer) |
| **File input** | Import `.txt`, `.pdf`, `.docx`, `.md` files (20 MB limit for PDF/DOCX) |
| **GPU / CPU selection** | Switch between GPU and CPU providers at any time |
| **Steps control** | 5 (fastest) to 16 (highest quality) — adjustable speed/quality tradeoff |
| **Speed control** | 0.5× to 2.0× playback speed with warning above 1.6× |
| **Audio normalization** | Peak normalization toggle — applies to playback, history, and downloads |
| **Waveform seekbar** | Click the waveform to seek to any position during playback |
| **Audio history** | Last 10 generations stored with metadata (voice, steps, speed, duration) |
| **MP3 & WAV export** | Download as WAV or MP3 (128 / 192 / 320 kbps bitrate selection) |
| **Dark / Light theme** | System-aware theme toggle |
| **5 accent colors** | Purple, Blue, Green, Red, Yellow |
| **UI scaling** | 80% to 150% zoom slider |
| **Resizable panels** | Drag the divider between input and output (320–800 px) |
| **Window state** | Remembers position and size between sessions |
| **Portable installer** | NSIS portable EXE — no UAC, no registry, no admin required |
| **SHA-256 verification** | All model files are hash-verified on download |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Tauri 2 Shell                 │
│  ┌──────────────────────┐  ┌─────────────────┐  │
│  │   React + TypeScript │  │   Rust Backend   │  │
│  │                      │  │                  │  │
│  │  • UI & State        │  │  • File I/O      │  │
│  │  • ONNX Runtime Web  │  │  • PDF extraction│  │
│  │  • WebGPU / WASM     │  │  • DOCX parsing  │  │
│  │  • Audio playback    │  │  • Save dialogs  │  │
│  │  • MP3 encoding      │  │  • Clipboard     │  │
│  └──────────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Frontend** handles all ML inference, audio processing, and encoding in-browser via ONNX Runtime Web + `lamejs-fixed`.

**Rust backend** handles only filesystem access (read files, save audio, extract text from PDF/DOCX), clipboard, and native dialogs. Zero sidecars, zero Python, zero FFmpeg.

---

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.70+ ([rustup](https://rustup.rs))
- **Tauri CLI** v2 (`npm install @tauri-apps/cli`)
- **UPX** (optional, for compression) — [upx.github.io](https://upx.github.io)
- **Models** — download from [HuggingFace Supertone/supertonic-3](https://huggingface.co/Supertone/supertonic-3) (see below)

---

## Getting Started

### 1. Clone

```bash
git clone https://github.com/Saganaki22/Supertonic_3_TTS_App.git
cd Supertonic_3_TTS_App
```

### 2. Install dependencies

```bash
npm install
```

### 3. Download models

The app fetches models at runtime from HuggingFace on first load and caches them in the browser. No manual download required — but you need an internet connection the first time you load a voice.

The following 6 files are fetched and SHA-256 verified:

| File | Purpose |
|---|---|
| `tts.json` | Voice configuration |
| `text_encoder.onnx` | Text encoding model |
| `duration_predictor.onnx` | Duration prediction model |
| `vector_estimator.onnx` | Vector estimation model |
| `vocoder.onnx` | Audio vocoder model |
| `unicode_indexer.json` | Unicode indexing map |

Models are sourced from [HuggingFace Supertone/supertonic-3](https://huggingface.co/Supertone/supertonic-3).

### 4. Development

```bash
npm run tauri dev
```

Opens the app in development mode with hot-reload.

### 5. Build

```bash
npm run tauri build
```

Produces a portable NSIS installer at:
```
src-tauri/target/release/bundle/nsis/Supertonic 3 TTS App_0.1.2_x64-setup.exe
```

And the raw executable at:
```
src-tauri/target/release/supertonic-3-tts-app.exe
```

### 6. Compress (optional)

Using [UPX](https://upx.github.io):

```bash
upx --best --lzma src-tauri/target/release/supertonic-3-tts-app.exe
```

This typically reduces the exe from ~12 MB to ~7.2 MB.

---

## Project Structure

```
├── index.html                  # Vite entry point
├── package.json                # npm config
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite config
├── public/
│   ├── assets/logo.png         # App logo
│   └── voice-samples/          # Voice sample WAVs (F1–F5, M1–M5)
├── scripts/
│   └── patch-lamejs.js         # Postinstall patch for lamejs-fixed
├── src/
│   ├── main.tsx                # Entry point, global event handlers
│   ├── App.tsx                 # Root component, layout, state
│   ├── App.css                 # All styles (themes, components)
│   ├── vite-env.d.ts           # Vite type declarations
│   ├── lamejs.d.ts             # Type declarations for lamejs-fixed
│   ├── components/
│   │   ├── Header.tsx          # Logo, brand, settings, status badge
│   │   ├── Footer.tsx          # Version, GitHub link
│   │   ├── SettingsPanel.tsx   # Theme, accent, GPU/CPU, UI scale
│   │   ├── StatusBadge.tsx     # Model status + GPU/CPU chevron dropdown
│   │   ├── TextInput.tsx       # Textarea with char count, paste, browse
│   │   ├── VoiceGrid.tsx       # 10-voice selector grid
│   │   ├── VoiceControls.tsx   # Steps & speed sliders
│   │   ├── VoiceClone.tsx      # Custom voice .json upload
│   │   ├── OutputPanel.tsx     # Waveform, player, download menu
│   │   ├── AudioHistory.tsx    # Last 10 generations
│   │   ├── PanelResize.tsx     # Resizable panel divider
│   │   ├── CachePanel.tsx      # Model cache info
│   │   ├── ProgressBar.tsx     # Generation progress bar
│   │   └── Toast.tsx           # Toast notifications
│   ├── hooks/
│   │   ├── useTTS.ts           # ONNX engine state management
│   │   ├── useAudioPlayer.ts   # Web Audio playback + seeking
│   │   └── useAudioHistory.ts  # Audio history with pushCurrent pattern
│   └── lib/
│       ├── tts.ts              # ONNX inference engine, model loading, SHA-256
│       ├── helpers.ts          # chunkText, normalizeAudio, wavToMp3
│       └── tauri.ts            # Typed Tauri invoke wrappers
└── src-tauri/
    ├── Cargo.toml              # Rust dependencies
    ├── tauri.conf.json         # Tauri window, bundle, CSP config
    ├── build.rs                # Tauri build script
    ├── capabilities/
    │   └── default.json        # Tauri permission capabilities
    ├── icons/                  # App icons (ico, png)
    └── src/
        ├── main.rs             # Rust entry point
        ├── lib.rs              # Plugin registration
        └── commands/
            ├── mod.rs          # Command module exports
            ├── fs.rs           # read_text_file, save_wav/mp3_file
            ├── pdf.rs          # extract_pdf_text (20 MB limit)
            └── docx.rs         # extract_docx_text (20 MB limit)
```

---

## Configuration

All settings are accessible from the gear icon in the header:

| Setting | Options | Default |
|---|---|---|
| Theme | Dark / Light | Dark |
| Accent Color | Purple, Blue, Green, Red, Yellow | Purple |
| GPU / CPU | WebGPU / WASM SIMD | GPU (auto-fallback) |
| UI Scale | 80% – 150% | 100% |
| Normalize Audio | On / Off | Off |
| MP3 Bitrate | 128 / 192 / 320 kbps | 192 kbps |
| Steps | 5 – 16 | 8 |
| Speed | 0.5× – 2.0× | 1.0× |

Settings persist in `localStorage`. Window position and size persist via `tauri-plugin-window-state`.

---

## Custom Voice Styles

Train your own voice embeddings using the companion trainer:

**[Saganaki22/supertonic_embeddings_trainer](https://github.com/Saganaki22/supertonic_embeddings_trainer)**

Export a `.json` file containing `style_ttl` and `style_dp` tensors, then load it via the "Custom voice" section in the app. The file is validated on load (JSON schema, tensor dimensions, data length).

---

## Voice Samples

Built-in voices are English neural TTS voices. Sample audio files are in `public/voice-samples/`:

- **F1–F5**: Female voices (English)
- **M1–M5**: Male voices (English)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript |
| Bundler | Vite 7 |
| ML Runtime | ONNX Runtime Web 1.26 |
| Audio Playback | Web Audio API |
| MP3 Encoding | lamejs-fixed (in-browser) |
| PDF Parsing | pdf-extract (Rust) |
| DOCX Parsing | docx-rs (Rust) |
| Installer | NSIS (portable, no UAC) |
| Compression | UPX (optional) |

---

## License

This project (application code) is licensed under the **MIT License**.

The accompanying TTS model is released under the **OpenRAIL-M License**. See the [LICENSE file in the model repository](https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE) for details.

The TTS engine is developed by [Supertone](https://github.com/supertone-inc/supertonic). Models are fetched from [HuggingFace Supertone/supertonic-3](https://huggingface.co/Supertone/supertonic-3).
