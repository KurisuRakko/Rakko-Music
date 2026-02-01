# Rakko Music Player

A modern, web-based music player with immersive features.

## Mystery Link (Mystery Code) Feature

The Mystery Link feature allows you to import music, lyrics, and videos by directly providing a URL or by using a shorthand code defined in your local configuration.

### How it Works
1. Open the "Mystery Code" / "Import Resource" modal.
2. Enter a value in the input box.
3. The system first checks your local `config.yaml` or `config.txt` file (Short Code Lookup).
    - If the input matches an **Index** or **Song Name**, it resolves to the corresponding **Link**.
4. If no local match is found, the input is treated as a URL.
5. The system scans the URL for a remote configuration file (`config.yaml` or `config.txt`).
    - If found, it displays a **Selection Page** allowing you to choose multiple songs to import.
6. If no configuration is found, it attempts to resolve the URL as a direct song resource (probing for `music.mp3` etc.).

### Configuration (`config.yaml` or `config.txt`)
To use the lookup feature (Short Codes) or Bulk Import, place a configuration file in your app root or at the Mystery Link URL.

**YAML Format (Recommended):**
Create a `config.yaml` file:
```yaml
songs:
  - index: "1"
    name: Never Gonna Give You Up
    link: https://rick.link/roll
  - name: Sandstorm
    link: https://music.site/sandstorm
```

**Text Format (Legacy):**
Create a `config.txt` file:
```text
Index | Song Name | Link
1   | Never Gonna Give You Up | https://rick.link/roll
002 | Sandstorm               | https://music.site/sandstorm
```

### Resource Directory Structure
The URL (whether direct or resolved from config) should point to a directory/path containing:
- **Audio**: `music.mp3`, `music.flac`, `music.wav`, etc.
- **Video** (Optional): `video.mp4`
- **Lyrics** (Optional): `lyrics.lrc`
- **Info** (Optional): `info.txt` (Key-Value pairs like `Title: ...`, `Artist: ...`)
