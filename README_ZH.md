<p align="center">
  <img src="public/assets/logo.png" alt="Supertonic 3" width="80" />
  <h1 align="center">Supertonic 3 — TTS 应用</h1>
  <p align="center">Windows 本地神经网络文字转语音应用，由 <a href="https://github.com/supertone-inc/supertonic">Supertone Supertonic 3</a> 引擎驱动。</p>
  <p align="center"><a href="README.md">English</a> | <strong>中文</strong></p>
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

---

## 简介

Supertonic 3 TTS App 是一款**完全离线**的文字转语音应用，所有神经网络推理均在本地设备上运行。无需云端、无需 API 密钥、数据不会离开您的电脑。

应用将 [Supertone Supertonic 3](https://github.com/supertone-inc/supertonic) ONNX 模型封装在 Tauri 2 桌面应用中，使用 React 和 TypeScript 构建了精致的双栏 UI。音频生成使用 ONNX Runtime Web，支持 **WebGPU GPU 加速**和**多线程 WASM CPU 回退**。

### 核心功能

| 功能 | 说明 |
|---|---|
| **本地推理** | ONNX Runtime Web — GPU (WebGPU) 或多线程 CPU (WASM SIMD + SharedArrayBuffer) |
| **10 种内置语音** | 5 种女声 (F1–F5) 和 5 种男声 (M1–M5)，英语 |
| **自定义语音克隆** | 加载通过 [supertonic_embeddings_trainer](https://github.com/Saganaki22/supertonic_embeddings_trainer) 训练的 `.json` 语音风格嵌入 |
| **文件导入** | 支持 `.txt`、`.pdf`、`.docx`、`.md` 文件（PDF/DOCX 限制 20 MB） |
| **GPU / CPU 切换** | 随时在 GPU 和 CPU 推理之间切换 |
| **CPU 使用率控制** | CPU 模式会自动检测逻辑线程数，并允许选择 10%–100% 使用率（默认 75%） |
| **步数控制** | 5（最快）到 16（最高质量）— 可调节速度/质量平衡 |
| **语速控制** | 0.5× 到 2.0× 播放速度，超过 1.6× 时显示警告 |
| **应用音量** | 全局播放音量滑块（默认 80%），作用于生成音频、历史记录和语音预览 |
| **标准化输出** | 峰值标准化开关 — 应用于播放、历史记录和下载 |
| **波形进度条** | 点击波形跳转到任意位置 |
| **音频历史** | 当前生成保留在主视图，历史记录最多显示之前的 6 条生成 |
| **MP3 和 WAV 导出** | 保存为 WAV 或 MP3（128 / 192 / 320 kbps），文件名自动带时间戳避免覆盖 |
| **深色 / 浅色主题** | 跟随系统的主题切换 |
| **5 种强调色** | 紫色、蓝色、绿色、红色、黄色 |
| **UI 缩放** | 80% 到 150% 缩放滑块 |
| **7 种界面语言** | English、中文、Español、Français、Ελληνικά、Русский、日本語 |
| **可调整面板** | 拖动输入和输出面板之间的分隔条（320–800 px） |
| **窗口状态记忆** | 自动记住窗口位置和大小 |
| **便携安装包** | NSIS 便携 EXE — 无需 UAC、无需写注册表、无需管理员权限 |
| **SHA-256 校验** | 所有模型文件下载后自动校验哈希值 |

---

## 架构

```
┌─────────────────────────────────────────────────┐
│                   Tauri 2 外壳                   │
│  ┌──────────────────────┐  ┌─────────────────┐  │
│  │   React + TypeScript │  │   Rust 后端      │  │
│  │                      │  │                  │  │
│  │  • UI 和状态管理      │  │  • 文件读写       │  │
│  │  • ONNX Runtime Web  │  │  • PDF 文本提取   │  │
│  │  • WebGPU / WASM     │  │  • DOCX 解析     │  │
│  │  • 音频播放           │  │  • 保存对话框     │  │
│  │  • MP3 编码           │  │  • 剪贴板        │  │
│  └──────────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────┘
```

**前端**通过 ONNX Runtime Web + `lamejs-fixed` 在浏览器内处理所有 ML 推理、音频处理和编码。

**Rust 后端**处理文件系统访问（读取文件、保存音频、从 PDF/DOCX 提取文本）、剪贴板、原生对话框、SharedArrayBuffer 所需 WebView 头，以及逻辑 CPU 线程数检测。无外部进程、无 Python、无 FFmpeg。

---

## 前置要求

- **Node.js** 18+ 和 npm
- **Rust** 1.70+（[rustup](https://rustup.rs)）
- **Tauri CLI** v2（`npm install @tauri-apps/cli`）
- **UPX**（可选，用于压缩）— [upx.github.io](https://upx.github.io)
- **模型** — 首次运行时从 [HuggingFace Supertone/supertonic-3](https://huggingface.co/Supertone/supertonic-3) 自动下载

---

## 快速开始

> **想要现成的应用？** 从[最新发布](https://github.com/Saganaki22/Supertonic_3_TTS_App/releases)下载 — 便携 EXE 或 NSIS 安装包，无需构建工具。

### 1. 克隆

```bash
git clone https://github.com/Saganaki22/Supertonic_3_TTS_App.git
cd Supertonic_3_TTS_App
```

### 2. 安装依赖

```bash
npm install
```

### 3. 模型下载

应用首次加载时会从 HuggingFace 自动下载模型并缓存到浏览器中。无需手动下载——但首次加载语音时需要网络连接。

以下 6 个文件会被下载并进行 SHA-256 校验：

| 文件 | 用途 |
|---|---|
| `tts.json` | 语音配置 |
| `text_encoder.onnx` | 文本编码模型 |
| `duration_predictor.onnx` | 时长预测模型 |
| `vector_estimator.onnx` | 向量估计模型 |
| `vocoder.onnx` | 音频声码器模型 |
| `unicode_indexer.json` | Unicode 索引映射 |

模型来自 [HuggingFace Supertone/supertonic-3](https://huggingface.co/Supertone/supertonic-3)。

### 4. 开发模式

```bash
npm run tauri dev
```

以开发模式启动应用，支持热重载。

### 5. 构建

```bash
npm run tauri build
```

生成的便携 NSIS 安装包位于：
```
src-tauri/target/release/bundle/nsis/Supertonic 3 TTS App_0.1.4_x64-setup.exe
```

可执行文件位于：
```
src-tauri/target/release/supertonic-3-tts-app.exe
```

### 6. 压缩（可选）

使用 [UPX](https://upx.github.io)：

```bash
upx --best --lzma src-tauri/target/release/supertonic-3-tts-app.exe
```

通常可将 exe 从 ~12 MB 压缩到 ~7.2 MB。

---

## 项目结构

```
├── index.html                  # Vite 入口
├── package.json                # npm 配置
├── tsconfig.json               # TypeScript 配置
├── vite.config.ts              # Vite 配置
├── public/
│   ├── assets/logo.png         # 应用图标
│   └── voice-samples/          # 语音样本 WAV (F1–F5, M1–M5)
├── scripts/
│   └── copy-ort-assets.js      # 为开发/生产复制 ONNX Runtime Web 资源
├── src/
│   ├── main.tsx                # 入口，全局事件处理
│   ├── App.tsx                 # 根组件，布局，状态
│   ├── App.css                 # 所有样式（主题、组件）
│   ├── vite-env.d.ts           # Vite 类型声明
│   ├── lamejs.d.ts             # lamejs-fixed 类型声明
│   ├── components/
│   │   ├── Header.tsx          # 图标、品牌、设置、状态徽章
│   │   ├── Footer.tsx          # 版本号、GitHub 链接
│   │   ├── SettingsPanel.tsx   # 主题、强调色、推理设备、CPU 使用率、音量、UI 缩放
│   │   ├── StatusBadge.tsx     # 模型状态 + GPU/CPU 下拉切换
│   │   ├── TextInput.tsx       # 文本框、字符计数、粘贴、浏览
│   │   ├── VoiceGrid.tsx       # 10 语音选择网格
│   │   ├── VoiceControls.tsx   # 步数和语速滑块
│   │   ├── VoiceClone.tsx      # 自定义语音 .json 上传
│   │   ├── OutputPanel.tsx     # 波形、播放器、带时间戳的 WAV/MP3 导出
│   │   ├── AudioHistory.tsx    # 最多 6 条历史生成记录
│   │   ├── PanelResize.tsx     # 可调整面板分隔条
│   │   ├── CachePanel.tsx      # 模型缓存信息
│   │   ├── ProgressBar.tsx     # 生成进度条
│   │   └── Toast.tsx           # Toast 通知
│   ├── hooks/
│   │   ├── useTTS.ts           # ONNX 引擎状态管理
│   │   ├── useAudioPlayer.ts   # Web Audio 播放和跳转
│   │   └── useAudioHistory.ts  # 六项音频历史
│   └── lib/
│       ├── tts.ts              # ONNX 推理引擎、显式 ORT 资源、SHA-256
│       ├── helpers.ts          # chunkText、normalizeAudio、wavToMp3
│       └── tauri.ts            # Tauri invoke 类型封装
└── src-tauri/
    ├── Cargo.toml              # Rust 依赖
    ├── tauri.conf.json         # Tauri 窗口、打包、CSP 配置
    ├── build.rs                # Tauri 构建脚本
    ├── capabilities/
    │   └── default.json        # Tauri 权限配置
    ├── icons/                  # 应用图标 (ico, png)
    └── src/
        ├── main.rs             # Rust 入口
        ├── lib.rs              # 插件注册、WebView 头、窗口创建
        └── commands/
            ├── mod.rs          # 命令模块导出
            ├── fs.rs           # read_text_file、save_wav/mp3_file
            ├── pdf.rs          # extract_pdf_text（20 MB 限制）
            ├── docx.rs         # extract_docx_text（20 MB 限制）
            └── system.rs       # logical_cpu_count，用于 CPU 线程自动检测
```

---

## 配置

所有设置可通过标题栏的齿轮图标访问：

| 设置 | 选项 | 默认值 |
|---|---|---|
| 主题 | 深色 / 浅色 | 深色 |
| 强调色 | 紫色、蓝色、绿色、红色、黄色 | 紫色 |
| GPU / CPU | WebGPU / 多线程 WASM SIMD | GPU（自动回退） |
| CPU 使用率 | 检测到的逻辑 CPU 线程的 10%–100% | 75% |
| 应用音量 | 0% – 100% | 80% |
| UI 缩放 | 80% – 150% | 100% |
| 应用语言 | English、中文、Español、Français、Ελληνικά、Русский、日本語 | English |
| 标准化输出 | 开 / 关 | 关 |
| MP3 比特率 | 128 / 192 / 320 kbps | 192 kbps |
| 步数 | 5 – 16 | 8 |
| 语速 | 0.5× – 2.0× | 1.0× |

设置保存在 `localStorage` 中。窗口位置和大小通过 `tauri-plugin-window-state` 持久化。

---

## 自定义语音风格

使用配套训练器训练您自己的语音嵌入：

**[Saganaki22/supertonic_embeddings_trainer](https://github.com/Saganaki22/supertonic_embeddings_trainer)**

导出包含 `style_ttl` 和 `style_dp` 张量的 `.json` 文件，然后通过应用中的"自定义语音"部分加载。加载时会验证文件（JSON 结构、张量维度、数据长度）。

---

## 语音样本

内置语音为英语神经网络 TTS 语音。样本音频文件位于 `public/voice-samples/`：

- **F1–F5**：女声（英语）
- **M1–M5**：男声（英语）

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 外壳 | Tauri 2 (Rust) |
| 前端 | React 19 + TypeScript |
| 打包器 | Vite 7 |
| ML 运行时 | ONNX Runtime Web 1.26 |
| 音频播放 | Web Audio API |
| MP3 编码 | lamejs-fixed（浏览器内） |
| PDF 解析 | pdf-extract (Rust) |
| DOCX 解析 | docx-rs (Rust) |
| 安装器 | NSIS（便携，无需 UAC） |
| 压缩 | UPX（可选） |

---

## 许可证

本项目（应用代码）采用 **MIT 许可证**授权。

附带的 TTS 模型采用 **OpenRAIL-M 许可证**发布。详见[模型仓库中的 LICENSE 文件](https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE)。

TTS 引擎由 [Supertone](https://github.com/supertone-inc/supertonic) 开发。模型从 [HuggingFace Supertone/supertonic-3](https://huggingface.co/Supertone/supertonic-3) 获取。
