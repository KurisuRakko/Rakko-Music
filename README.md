# 🎵 Rakko Music Player: The Liquid Audio Experience

> **“不仅仅是播放，更是一场关于声音的视觉流浪。”**

Rakko 是一款为极致审美而生的现代本地音乐播放器。它融合了 **液态交互 (Liquid Interaction)**、**3D 空间美学 (PrismFlow)** 与 **物理引擎驱动的动效 (Spring Physics)**，为用户提供了一个如同艺术品般的听歌环境。

---

## ✨ 视觉与动效核心 (Visual & Animation Highlights)

### 1. PrismFlow 3D 舞台引擎
- **空间叙事**：利用 CSS 3D 矩阵变换构建了一个深度的“封面舞台”，支持 Z 轴空间位移。
- **动态倒影 (Dynamic Reflection)**：每一张封面下方都具有实时的、带遮罩的镜像倒影，模拟真实物理表面的反射效果。
- **环境光追踪 (Ambient Glow)**：背景模糊层会根据当前专辑封面自动提取色调，营造出柔和的沉浸式灯光效果。

### 2. 液态交互 UI (Liquid Glass UI)
- **物理感知动效**：所有的按钮、滑块和弹窗均采用自定义的贝塞尔曲线（Spring & Elegant Curves），模拟真实的物体阻尼感，消除机械僵硬感。
- **磨砂玻璃 2.0**：多层级 `backdrop-blur` 配合微弱的内发光（Inner Glow）和噪点纹理，呈现出厚重的晶体质感。
- **自适应响应**：界面元素在闲置时会自动进入“呼吸”状态，悬停时则如水滴般优雅展开。

### 3. 沉浸式剧场歌词 (Immersive Lyric Theater)
- **弹簧物理滚动**：歌词系统内置了一个微型物理模拟器，确保滚动时具有惯性和弹性，支持滚动中断与自适应对齐。
- **动力学排版**：当前行歌词拥有“光晕渲染”特效，非激活行则呈现柔和的高斯模糊，引导用户的视觉中心。
- **精准进度匹配**：歌词行下方设有流动的实时进度条，精准对齐当前音频的播放位点。

---

## 🚀 核心功能特性 (Key Features)

- **高级音频引擎**：集成 Web Audio API，支持 **12dB 低音增强 (Bass Boost)** 和 Canvas 高帧率实时波形渲染。
- **智能媒体解析**：自动解析文件名，精准拆解歌手、标题、版本（如 Remix/Live）、伴奏（Inst）及额外信息。
- **智能匹配算法**：利用 **Levenshtein Distance (编辑距离)** 算法，实现音频与 .lrc 歌词文件的一对一智能盲配。
- **GPU 加速渲染**：深度优化 CSS 层级，利用硬件加速确保在 3D 模式下依然保持 60+ FPS 的丝滑体验。

---

## ⌨️ 快捷键支持 (Hotkeys)

| 按键 | 功能 |
| :--- | :--- |
| `Space` | 播放 / 暂停 |
| `← / →` | 上一曲 / 下一曲 |
| `Esc` | 退出 3D 视图 / 退出全屏 |
| `F` | 切换全屏模式 |

---

## 🛠️ 技术栈 (Technical Stack)

- **核心**: React 19 (利用并发特性与高效渲染机制)
- **样式**: Tailwind CSS (自定义物理动效配置)
- **音频**: Web Audio API (BiquadFilterNode & AnalyserNode)
- **图标**: Lucide React (轻量化矢量图标系统)

---

*“让音乐回归视觉与听觉的双重纯粹。”*  
Copyright © 2025 KurisuRakko. Licensed under Apache 2.0.

---

## Mystery Code Feature

Rakko Music supports "Mystery Code" - a way to load remote resources via a URL.

### Usage
Click the "Eye" icon in the mode controls (right sidebar) and paste your code URL.

### File Structure
The server hosting the code should follow this structure:

```
[Base URL]/
├── music.mp3 (or .flac, .wav, .ogg, .m4a)
├── video.mp4 (Optional)
├── lyrics.lrc (Optional)
└── info.txt (Optional)
```

### info.txt Format
The `info.txt` file is used to provide rich metadata for the song. It supports simple `Key: Value` pairs.

**Supported Keys:**
- `Title`: Song Title
- `Artist`: Artist Name
- `Album`: Album Name
- `Version`: Song Version (e.g., Remix, Cover)
- `Extra`: Extra info (e.g., Translation, Anime Name)

**Example:**
```txt
Title: Beautifly Tomorrow
Artist: ReoNa
Album: Unknown
Version: Original Mix
Extra: Shangri-La Frontier OP 2
```