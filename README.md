![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)

# 🎶 Rakko Music Player

**Rakko Music Player** is a modern, web-based audio player designed with a focus on fluid animations, immersive lyrics, and elegant visual styling.  
Built with **React 19**, **TypeScript**, and **Tailwind CSS**, the player features glassmorphism UI, physics-based lyric scrolling, and a distraction-free immersive mode.

---

## ✨ Features

###  Local Library Management
- Drag & drop multiple audio files or manually select them
- Instant playlist creation
- Automatic album art and metadata extraction

###  Synced Lyrics
- Full `.lrc` support  
- **Spring-Physics Lyrics Scrolling** — heavy, natural movement
- **Immersive Focus Mode** — only the active line is highlighted

###  Visual Customization
- Stunning **glassmorphism** UI
- Dynamic blurred backgrounds generated from album art
- Custom wallpapers
- Neon-inspired accent colors

###  Smart Metadata
- Parse ID3 tags via `jsmediatags`
- Auto-extract and render embedded cover art

###  Immersive Mode
A full-screen aesthetic mode featuring:
- Centered active lyric line
- Faded inactive lines
- Soft blur transitions
- Morphing UI components

---

## 🛠️ Built With

- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Lucide React**
- **jsmediatags**
- **Web Audio API** (visualization & audio processing)

---

##  Installation & Development

```bash
git clone https://github.com/<your-username>/rakko-music-player.git
cd rakko-music-player
npm install
npm run dev
Then open:
http://localhost:5173

---

## Project Structure
src/
  App.tsx               // Main application controller
  components/
    Controls.tsx
    Playlist.tsx
    LyricsView.tsx
    Visualizer.tsx
    Settings.tsx
  utils/
    format.ts
    lrc.ts
    audio.ts
  assets/
    icons/
    wallpaper/


##Roadmap
* Touch support for mobile devices
* Playlist persistence (IndexedDB)
* Waveform seek bar
* Advanced equalizer presets
* Auto-fetch lyrics
* Multi-theme UI system

License
Released under the Apache License 2.0.
Copyright © 2025 
KurisuRakko (Bowen Yang)
See the LICENSE file for full text.
