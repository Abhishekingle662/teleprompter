# Teleprompter

A free, cross-platform desktop teleprompter that runs as a borderless,
transparent, always-on-top overlay. Park it over your camera app, OBS,
or any window beneath it and read scrolling text without obstructing
what's underneath. Built with [Tauri 2](https://tauri.app/) and React,
ships as a sub-15 MB binary on Windows, macOS, and Linux.

![Platforms: Windows · macOS · Linux](https://img.shields.io/badge/platforms-windows%20%7C%20macos%20%7C%20linux-blue)
![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Version: 0.3.0](https://img.shields.io/badge/version-0.3.0-brightgreen)

---

## What it looks like

```
 ┌────────────────────────────────────────────────────────────┐
 │                                                            │
 │       Welcome to the show. Today we're going to talk       │
 │   ▒▒▒▒  about a small thing that changes a lot.  ▒▒▒▒      │  ← focus band
 │                                                            │
 │       It's a tool, but more importantly it's a habit.      │
 │                                                            │
 │  ● Playing — 23%                            ⌥ Inspector ⏵  │
 └────────────────────────────────────────────────────────────┘
```
https://github.com/user-attachments/assets/950a2ddb-6cbe-4bc3-881d-df3ba78f19a5

The window is transparent, borderless, and stays on top — the dotted
border above is just the diagram. Press `Ctrl+Space` to play/pause,
`Ctrl+Up`/`Ctrl+Down` to nudge the WPM, or hit Inspector to tweak
everything.

---

## Features

**Display**
- Borderless, transparent, always-on-top window
- Click-through mode with hold-`Ctrl` to interact
- Mirror mode for teleprompter glass / beam-splitter setups
- Adjustable opacity and Gaussian text blur
- Focus band overlay (highlighted reading area, configurable position
  and height)
- Per-side margins (0–300 px independently)
- Skip-taskbar toggle

**Playback**
- Continuous scroll mode (WPM-accurate via Canvas `measureText`)
- Karaoke mode with word-by-word highlighting and auto-centering
- Configurable countdown timer (0–10 s) before playback starts
- Scroll-position scrubber to seek to any point
- Reading-time estimate based on word count and WPM
- 60 fps `requestAnimationFrame` engine

**Scripts**
- Import `.txt` / `.md` files, paste text, or type directly
- Multi-file workspace with recent-files list (last 10)
- Live file watching — edit a `.txt` in your editor and the prompter
  refreshes
- Cue markers: insert `[CUE: label]` anywhere; jump between cues with
  `Ctrl+N` / `Ctrl+P`
- Persistent display settings (font, WPM, margins, focus band, etc.)
- Session auto-save (debounced, on every text or scroll change)

**Hotkeys**
- Global shortcuts that work without window focus
- Every shortcut remappable from the Inspector

**Integration**
- System tray icon (Play/Pause, Show/Hide, Quit)
- Multi-monitor support — pick which display to dock on
- Custom font import (`.ttf` / `.otf` from disk)
- WebSocket remote control on the local network (phone or any client) —
  the listen address is shown in the Inspector
- MCP server for AI-assisted script editing from Claude or ChatGPT, with
  a copy-the-path setup panel in the Inspector

**Platform**
- Windows 10/11, macOS (Intel + Apple Silicon), Linux (X11 fully
  supported; Wayland partial)

---

## Quick start

The 30-second path:

1. Download the build for your OS from
   [Releases](https://github.com/Abhishekingle662/teleprompter/releases)
   — or skip to **Build from source** below.
2. Launch the app. It opens as a transparent overlay with the Inspector
   on the right.
3. Click **Import File** → pick a `.txt` or `.md`, or paste text into
   the editor.
4. Press `Ctrl+Space` (or click Play).
5. To get a clean view: click **Hide Controls**. Press `Escape` to bring
   them back.

Recommended starting settings: WPM 150, font size 56 px, margins 60 px
on each side, focus band at 50 %.

---

## Build from source

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- [Rust](https://rustup.rs/) (latest stable)
- Platform-specific:

  **Linux (Debian/Ubuntu):**
  ```bash
  sudo apt update
  sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl \
    wget file libxdo-dev libssl-dev libayatana-appindicator3-dev \
    librsvg2-dev patchelf
  ```

  **Linux (Fedora):**
  ```bash
  sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
    libappindicator-gtk3-devel librsvg2-devel
  ```

  **macOS:**
  ```bash
  xcode-select --install
  ```

  **Windows:** Install
  [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  with the "Desktop development with C++" workload. WebView2 is preinstalled
  on Windows 10/11.

### Build

```bash
git clone https://github.com/Abhishekingle662/teleprompter.git
cd teleprompter
npm install
npm run tauri dev        # run with hot-reload
npm run tauri build      # produce installable binaries
```

Production output lands in `src-tauri/target/release/bundle/`:

- Windows: `.msi` (in `msi/`) or `.exe` (in `nsis/`)
- macOS: `.dmg` (in `dmg/`) or raw `.app` (in `macos/`)
- Linux: `.deb` (`deb/`), `.AppImage` (`appimage/`), `.rpm` (`rpm/`)

> Use `npm run tauri dev` — not `npm run dev`. The latter starts Vite
> only; Tauri APIs aren't available in a plain browser context.

---

## Usage

### Loading a script

Three ways:

- **Import** — click "Import File" and pick a `.txt` or `.md`.
- **Paste** — click the editor area and `Ctrl+V` / `Cmd+V`.
- **Live file** — drop a file into the scripts directory (`Inspector →
  Files → Open scripts folder`). Edits in your text editor refresh the
  on-screen text automatically.

The bundled `sample.txt` is a quick way to verify things work.

### Cue markers

Insert `[CUE: label]` anywhere in your script. The Inspector lists all
cues; `Ctrl+N` jumps to the next, `Ctrl+P` to the previous.

```
Welcome to the show.

[CUE: Intro] Today we're going to talk about three things.

[CUE: Body] First, let's start with the basics...

[CUE: Outro] Thanks for watching.
```

### Inspector tabs

The right-hand panel is grouped into four tabs to keep things scannable:

- **Type** — font family, custom font import, size, text color, opacity,
  blur, mirror
- **Speed** — WPM (with live reading-time estimate), countdown, scroll
  mode (continuous / karaoke)
- **Stage** — per-side margins, focus band (enable / position / height),
  cue-marker jump list
- **Output** — MCP setup path, window controls (click-through,
  skip-taskbar, monitor picker), save session, configure hotkeys, and the
  WebSocket remote address

Hotkeys are remapped from a dedicated panel opened via "Configure
hotkeys" in the Output tab.

### Click-through mode

Enable click-through to make the window invisible to mouse clicks —
useful when recording. Click "Enable Click-Through" or hit the bound
hotkey. To interact again: hold `Ctrl`/`Cmd` while clicking, or press
`Ctrl+I` to toggle it off entirely.

### Session restore

Your display settings persist automatically (debounced, 300 ms), and your
last text and scroll position are auto-saved (debounced, 500 ms) — close
the app and reopen, you're back where you left off. Everything lives in a
single `settings.json` store; there's no separate profile management.

---

## Keyboard shortcuts

Global, so they work without window focus. Every binding is remappable
in the Inspector → Hotkeys tab.

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd+Space` | Play / Pause |
| `Ctrl/Cmd+Up` | Increase WPM (+10) |
| `Ctrl/Cmd+Down` | Decrease WPM (−10) |
| `Ctrl/Cmd+=` | Increase font size (+2 px) |
| `Ctrl/Cmd+-` | Decrease font size (−2 px) |
| `Ctrl/Cmd+N` | Jump to next cue |
| `Ctrl/Cmd+P` | Jump to previous cue |
| `Ctrl/Cmd+I` | Toggle click-through |
| `Ctrl/Cmd+F` | Toggle file manager |
| `Escape` | Stop playback or toggle controls |

---

## AI integration (MCP)

The `mcp-server/` directory ships a
[Model Context Protocol](https://modelcontextprotocol.io/) server that
exposes the workspace to MCP-compatible clients (Claude Desktop,
ChatGPT, etc.). Once wired up, you can say "rewrite the third paragraph
more concisely" and the on-screen prompt updates within a second.

Sample Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "teleprompter": {
      "command": "node",
      "args": ["/abs/path/to/teleprompter/mcp-server/dist/index.js"],
      "env": {
        "MCP_WORKSPACE_ROOT": "/abs/path/to/teleprompter",
        "MCP_SCRIPT_PATH": "scripts/current.txt"
      }
    }
  }
}
```

The teleprompter watches `scripts/current.txt` (configurable) — when
the MCP client writes to it, the change shows up live. See
[`mcp-server/README.md`](mcp-server/README.md) for the full tool list
and deployment models (local companion process vs. remote service).

---

## Remote control (WebSocket)

The app starts a WebSocket server bound to `0.0.0.0` on an
OS-assigned port (so any device on the same network can reach it). The
exact address — `ip:port` — is displayed in the Inspector's **Output**
tab once the server is up. Send JSON frames to control playback — handy
for a phone-as-remote setup.

Sample JS client (replace the port with the one shown in the Inspector):

```js
const ws = new WebSocket("ws://192.168.1.20:54321");
ws.onopen = () => {
  ws.send(JSON.stringify({ action: "toggle" }));
  ws.send(JSON.stringify({ action: "faster" }));
};
```

Supported actions (each is `{ "action": "<name>" }`):

| Action | Effect |
|---|---|
| `play` | Start playback (if stopped) |
| `pause` | Pause playback (if playing) |
| `toggle` | Toggle play / pause |
| `faster` | Increase WPM by 10 (max 600) |
| `slower` | Decrease WPM by 10 (min 30) |
| `reset` | Scroll back to the top |

The same `scripts/ws-smoke.mjs` helper in the repo runs through these
actions against a running instance for a quick end-to-end check.

---

## Configuration files

Settings, scripts, and imported fonts live in the OS-standard application
data directory:

| OS | Path |
|---|---|
| Windows | `%APPDATA%\teleprompter\` |
| macOS | `~/Library/Application Support/teleprompter/` |
| Linux | `~/.local/share/teleprompter/` |

Contents: a single `settings.json` store (holds both display settings and
the restored session), a `scripts/` subdirectory with the live
`current.txt` and any saved scripts, and a `fonts/` subdirectory for
imported `.ttf` / `.otf` files. This directory is also what you point
`MCP_WORKSPACE_ROOT` at — the Inspector's Output tab shows and copies the
exact path.

---

## Architecture

Three processes at runtime: the Tauri shell (Rust, native window APIs +
file watching + WebSocket), the React frontend in the WebView (renderer,
scroll engine, settings UI), and the optional MCP server (Node.js,
stdio). The connection between them is filesystem-driven — any MCP
write triggers a `notify` event that refreshes the on-screen text.

See [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) for a full technical
walkthrough: component tree, custom hooks, Tauri command surface, and
six engineering stories from the v0.2.0 refactor.

---

## Troubleshooting

**"Cannot read properties of undefined (reading 'transformCallback')"**
You're running the bare Vite dev server. Use `npm run tauri dev` — the
Tauri plugins (file system, store, global shortcuts) only exist in the
native app context.

**Global shortcuts don't work (macOS)**
System Settings → Privacy & Security → Accessibility → add the
Teleprompter app and toggle it on.

**Global shortcuts don't work (Linux/Wayland)**
Wayland's security model blocks cross-application global shortcuts.
Switch to an X11 session, or use the WebSocket remote as a workaround.

**Transparent window not transparent (Linux)**
You need a running compositor. Most modern desktops have one
(GNOME/KDE/Sway); if you're on a minimal WM, install `picom` or similar.

**Click-through stuck on**
Press `Ctrl+I` to toggle it off. If that's been remapped, open the
system tray icon → Show, then disable click-through from the Inspector.

**Build fails on Linux: `webkit2gtk not found`**
Install the system dependencies listed under **Build from source →
Prerequisites → Linux** above.

---

## Contributing

Pull requests welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for dev
setup, the project layout, the manual smoke-test checklist, and the
PR process.

## Roadmap

See [`ROADMAP.md`](ROADMAP.md) for what's planned. The
[`CHANGELOG.md`](CHANGELOG.md) tracks what's already shipped.

## License

MIT. See [`LICENSE`](LICENSE).

## Acknowledgments

Built with [Tauri](https://tauri.app/), [React](https://react.dev/),
[Vite](https://vite.dev/), and the
[Model Context Protocol](https://modelcontextprotocol.io/) SDK.
