# Teleprompter — Project Overview

A technical deep-dive into the architecture, design choices, and engineering
stories behind the Teleprompter desktop app. Intended as a companion to
`README.md` (which targets users); this document targets developers and
anyone evaluating the codebase.

---

## 1. Elevator pitch

A free, cross-platform desktop teleprompter that runs as a borderless,
transparent, always-on-top overlay. You can park it over OBS, Zoom, a
camera viewfinder app, or any window beneath it, and read scrolling text
without obstructing the underlying app. It supports continuous and
karaoke modes, global hotkeys that work without focus, a phone-side
WebSocket remote, an embedded MCP server that lets Claude or ChatGPT edit
the live script, and ships as a sub-15 MB binary on Windows, macOS, and
Linux.

It's built on Tauri 2 (Rust core, WebView frontend) instead of Electron,
which is why it's small, starts in under a second, and can do native
window manipulation (transparency, click-through, skip-taskbar) the
browser layer can't reach.

## 2. Problem & stack

Existing teleprompter apps fall into three buckets: web-based ones (tab
loses focus, no global hotkeys, no transparency), heavyweight Electron
desktop apps (200 MB+, sluggish), and broadcast-grade native tools
(expensive, Windows-only, hard to install). The goal: a fast, free,
cross-platform alternative that does the basics well and exposes a
scripting surface for power users.

| Layer | Technology |
|---|---|
| Desktop framework | Tauri 2.0 |
| Frontend | React 19, TypeScript 5.8, Vite 7 |
| Backend | Rust (edition 2021) |
| Persistence | `tauri-plugin-store` 2.0 (JSON in `app_data_dir`) |
| File system | `tauri-plugin-fs` 2.0 |
| Global shortcuts | `tauri-plugin-global-shortcut` 2.0 |
| File dialogs | `tauri-plugin-dialog` 2.0 |
| File watching | `notify` 6 (Rust) |
| Remote control | `tokio-tungstenite` 0.24 (WebSocket) |
| AI integration | MCP server (Node.js, separate package in `mcp-server/`) |

v0.2.0 (April 2026) added karaoke mode, system tray, multi-monitor,
WebSocket remote, MCP integration, configurable hotkeys, custom font
import, cue markers, and a substantial architecture refactor. v0.3.0
(May 2026) is a stabilization release — MCP test suite and Docker
support, the `get_app_data_dir` setup panel, and a full CI pipeline —
the last milestone before the in-app phone-remote feature. See
`CHANGELOG.md` for the full list.

## 3. Architecture

Three processes participate at runtime, communicating across two
boundaries:

```
                ┌───────────────────────────────┐
                │   Tauri main process (Rust)   │
                │                               │
   IPC (Tauri   │  ┌─────────────────────────┐  │   spawn / stdio
   commands &   │  │  WebSocket server       │  │  ┌────────────────────┐
   events)      │  │  (tokio-tungstenite,    │  │  │  MCP server        │
   ◄────────────┼──┤   0.0.0.0:OS-port)      │  │  │  (Node.js, stdio)  │
                │  │                         │  │  │  registers 7 tools │
                │  └─────────────────────────┘  │  └────────────────────┘
                │                               │           ▲
                │  ┌─────────────────────────┐  │           │ Claude /
                │  │  notify file watcher    │  │           │ ChatGPT
                │  │  (debounced, filtered)  │  │           ▼
                │  └─────────────────────────┘  │       scripts/current.txt
                │              ▲                │
                └──────────────┼────────────────┘
                               │ writes
                               │
       ┌───────────────────────┼───────────────────────┐
       │  WebView (React 19)   │                       │
       │                       ▼                       │
       │   ┌───────┐  ┌────────────────┐  ┌────────┐   │
       │   │ TopBar │ │ TextDisplay    │  │ Inspector│  │
       │   └───────┘  │ (scroll engine)│  └────────┘   │
       │   ┌──────────┴────────────────┴─────────┐    │
       │   │ useScrollEngine · useSettings        │    │
       │   └──────────────────────────────────────┘    │
       └───────────────────────────────────────────────┘
```

Why Tauri and not Electron: Tauri ships the OS-native WebView (WebView2
on Windows, WebKit elsewhere) instead of bundling Chromium, which is why
the installer is ~12 MB instead of ~150 MB. The Rust core gives us
straightforward access to `set_decorations(false)`, `set_transparent`,
`set_ignore_cursor_events` (click-through), `set_skip_taskbar`, and
monitor enumeration — these are all native window calls that the
browser can't reach. The trade-off is testing matrix: WebKit-on-Linux
behaves differently than Chromium and Safari, so the renderer can't
rely on any cutting-edge CSS features.

The MCP server is a deliberately separate process. It speaks stdio, so
it can be launched by Claude Desktop directly (the user wires it into
their Claude config) and the Tauri app does not need to know it exists.
The link between the two is the filesystem: MCP writes
`scripts/current.txt`, `notify` fires, the WebView reloads. This means
the AI workflow works whether the app is running or not.

## 4. Frontend tour

The frontend lives in `src/`. Top-level component tree:

```
App (src/App.tsx)
├── TopBar               window controls + file picker (local only)
├── TransportBar         play/pause, reset, scrubber, WPM (local only)
├── Inspector            tabbed settings panel (local only)
├── TextDisplay          the scrolling text + focus band overlay
├── FileManager          scripts/ directory browser + recent files
├── HotkeySettings       remap any shortcut
└── Dialogs              confirm, input, notification, new-file
```

`TopBar`, `TransportBar`, and `Inspector` carve the old monolithic
control panel into window chrome, the transport row, and the tabbed
settings panel respectively. `Inspector` has four tabs — **Type**
(font/size/color/opacity/blur/mirror), **Speed** (WPM, reading-time
estimate, countdown, scroll mode), **Stage** (margins, focus band, cue
jumps), and **Output** (MCP setup path, window controls, session save,
hotkey config, WebSocket address).

State shape — defined in `src/types/index.ts`:

- `Settings` — display & playback config (font, wpm, opacity, margins,
  focus band, mirror, text color). Persisted to `tauri-plugin-store`,
  debounced 300 ms.
- `LoadedFile[]` — the multi-file in-memory cache (id, name, path,
  content, loadedAt). The active file's content is what `TextDisplay`
  renders.
- `HotkeyMap` — seven user-remappable bindings: `playPause`, `speedUp`,
  `speedDown`, `fontSizeUp`, `fontSizeDown`, `toggleClickThrough`,
  `toggleFileManager`. Defaults match `DEFAULT_HOTKEYS`.
- `Cue[]` — parsed from inline `[CUE: label]` markers in the script
  via `parseCues()`. Used for `Ctrl+N` / `Ctrl+P` jump navigation.

Custom hooks — both in `src/hooks/`:

- `useScrollEngine` — the heart of the renderer. Owns the
  `requestAnimationFrame` loop, derives pixels-per-second from the
  current font + WPM via Canvas `measureText` (`measureAvgWordWidth`),
  exposes `scrollPosition`, `scrollProgress`, `activeWordIndex`. Two
  strategies internally: continuous (steady scrollTop increment) and
  karaoke (advance `activeWordIndex` at WPM pace, call
  `scrollIntoView({ block: "center" })`).
- `useSettings` — wraps the Tauri store, debounces writes, exposes a
  `mutateSettings(partial)` helper so child components don't have to
  spread the whole object.

## 5. Backend tour

The Rust side lives in `src-tauri/src/lib.rs` (~1k lines, single file
intentionally — the surface is narrow and splitting helps less than it
hurts). Tauri commands grouped by purpose:

**Window & IPC:**
- `toggle_click_through`, `set_click_through` — flip
  `set_ignore_cursor_events`; the frontend listens for `Ctrl+I` and
  toggles back when the user needs to interact.
- `set_window_position`, `set_window_size` — frontend-driven layout.
- `set_skip_taskbar` — taskbar/dock visibility toggle.

**Settings:**
- `get_settings`, `update_settings` — pass-through to in-process
  `AppState`. The actual persistence is done frontend-side via
  `tauri-plugin-store` to keep the JSON schema authoritative on one
  side.

**File watching (three related commands, one consolidated watcher):**
- `start_script_watcher` / `stop_script_watcher` — watches
  `scripts/current.txt` (the MCP integration target).
- `watch_file` / `unwatch_file` / `unwatch_all_files` — per-file
  watchers for arbitrary imported files.
- `watch_scripts_directory` / `stop_watching_scripts_directory` —
  watches the whole scripts/ directory for adds/removes.

All three feed through `dispatch_watch_event`, which filters to only
`EventKind::Modify(ModifyKind::Data(_))` and `EventKind::Create(_)`
— without this filter, `notify` fires on `Access` events (every time
the OS opens the file to read it) and produces a flood of spurious
events.

**Scripts directory:**
- `save_script_to_directory`, `get_scripts_from_directory` — read/write
  inside `app_data_dir().join("scripts")`. The path was previously
  derived from `current_dir()` with a string-match on `"src-tauri"`,
  which broke in installed builds; now it goes through the Tauri path
  API.

**Fonts:**
- `import_font` — copies a `.ttf` / `.otf` into the app data dir,
  returns the resolved path. Frontend then injects `@font-face`.
- `list_imported_fonts` — enumerates the imported fonts directory.

**Paths:**
- `get_app_data_dir` — returns the resolved `app_data_dir()` as a string.
  The Output tab displays it with a copy button so the user can paste it
  into `MCP_WORKSPACE_ROOT` — the app data dir *is* the MCP workspace
  root, which is how the live-script handshake stays consistent across
  the two processes.

**Monitors:**
- `list_monitors` — enumerates displays with position, size, and
  scale factor.
- `move_to_monitor` — repositions the main window onto a chosen monitor.

**WebSocket remote:**
- `start_ws_server` binds `0.0.0.0:0` (the OS assigns a free port, so
  there is no hard-coded port to collide with), spawns a
  `tokio_tungstenite::accept_async` loop, and is idempotent — calling it
  again returns the already-bound port. The frontend invokes it once on
  mount, then calls `get_ws_info` to read back `{ ip, port }` and renders
  the address in the Inspector's Output tab. Incoming JSON frames
  (`{"action": "..."}`) are forwarded verbatim as `remote-action` Tauri
  events; the frontend's `remote-action` listener interprets
  `play`, `pause`, `toggle`, `faster` (+10 WPM, cap 600), `slower`
  (−10 WPM, floor 30), and `reset` (scroll to top) — the same code path
  as the keyboard hotkeys, so actions are interpreted in exactly one
  place.

**Tray:** `TrayIconBuilder` with Play/Pause, Show/Hide, Quit menu
items, plus a left-click handler that toggles window visibility.

## 6. Six engineering stories

These are the moments where the easy path was wrong and the fix was
interesting. Each one shipped in v0.2.0.

### 6.1 WPM math via Canvas `measureText`

The original scroll speed math was:

```ts
const pixelsPerWord = settings.font_size * 0.7;
```

This made the WPM slider meaningless — actual reading speed bore no
relationship to the configured number. At 48px Arial, an average word
is closer to 120 px, not 33.6 px. The fix is in `useScrollEngine.ts`:
`measureAvgWordWidth(fontFamily, fontSize)` creates an offscreen
canvas, sets the font, and measures 20 of the most common English
words via `ctx.measureText`. The average becomes the conversion factor.
Now the WPM slider corresponds to actual reading words-per-minute
within ~5 % on standard fonts.

### 6.2 Karaoke without re-rendering 10k nodes

A naive karaoke implementation wraps every word in a `<span>` and
re-renders the highlighted one. For a 5 000-word script that's 5 000
React fibers, and React reconciliation gets slow. The implementation:
tokenize once on text change into a stable array, render words with
`data-word-index` attributes, store a single `activeWordIndex` in
state. CSS handles the highlight via an attribute selector
(`[data-word-index="${i}"]`). On index change, call
`element.scrollIntoView({ behavior: "smooth", block: "center" })` —
the browser handles the smooth scroll natively. No per-word React
updates, and the focus band stays centered automatically.

### 6.3 Stale closures in the directory watcher

The `scripts-directory-updated` listener was:

```ts
useEffect(() => {
  const unlisten = await listen("scripts-directory-updated", (event) => {
    const currentFile = loadedFiles.find(f => f.id === currentFileId);
    // ...
  });
}, []); // mount only
```

`loadedFiles` and `currentFileId` are captured at mount. When files
change after mount, the listener operates on the stale values from
when the effect ran — so opening a second file and then having the
filesystem change wouldn't update the right entry. The fix: stash the
values in `useRef`s, update the ref on every render, read `ref.current`
inside the listener. The same pattern protects the
`playback-end` callback and the WebSocket remote handler.

### 6.4 First-run hotkey registration on Windows

`tauri-plugin-global-shortcut`'s `register()` would fail on cold Windows
boots with no error — just silently no-op. The original workaround was
`await new Promise(r => setTimeout(r, 300))` before registering, which
is fragile (slow machines failed, fast machines wasted 300 ms).
Replaced with an exponential backoff retry: 100 ms → 200 ms → 400 ms,
max 3 attempts, abort on first success. In practice it succeeds on the
first attempt on warm runs and the second attempt on first-launch
runs.

### 6.5 CSP and DevTools in production builds

`tauri.conf.json` had `"csp": null`, and `Cargo.toml` had the
`devtools` feature enabled unconditionally. Shipping DevTools in prod
is both a binary-size cost and an attack surface. The fix is two
lines: `csp` set to
`"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"`
and the devtools feature moved behind `#[cfg(debug_assertions)]`. The
`'unsafe-inline'` for styles is unfortunate but required for the
remaining inline `style={{}}` objects in the React tree — migrating
those to CSS classes is a tracked follow-up.

### 6.6 The MCP loop

Claude Desktop launches `mcp-server/dist/index.js` over stdio. The
user asks Claude to "rewrite the third paragraph more concisely."
Claude calls the `write_script` tool, which writes
`scripts/current.txt`. The Tauri `notify` watcher fires the filtered
`Modify(Data)` event. The Rust core emits a `script-updated` Tauri
event. The React side has a `listen("script-updated", ...)` effect
that re-reads the file and updates `text` state. The on-screen prompt
refreshes within ~50 ms.

The thing that made this work cleanly is that the integration is
purely file-based. No new IPC, no network. The teleprompter doesn't
know whether the file was changed by Claude, by a manual save in VS
Code, or by `echo > scripts/current.txt`. That makes the surface area
tiny and the failure modes obvious.

## 7. MCP integration

[Model Context Protocol](https://modelcontextprotocol.io/) is a
standard for exposing tools to LLM clients. The server lives in
`mcp-server/` (TypeScript, MCP SDK over stdio), and registers seven
tools:

| Tool | Use |
|---|---|
| `list_files` | List files/folders beneath a relative path |
| `read_file` | Read text or base64 contents |
| `write_file` | Create or overwrite a file |
| `read_script` | Read the live script (default `scripts/current.txt`) |
| `write_script` | Write the live script |
| `update_file` | Replace contents of an existing file |
| `append_file` | Append to an existing file |

All paths are validated to stay inside `MCP_WORKSPACE_ROOT`; attempts
to escape (`../`, absolute paths outside the root, symlinks pointing
out) are rejected.

A typical Claude Desktop config entry:

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

With this in place, "Claude, rewrite the intro to sound more casual"
becomes a one-shot edit visible on-screen in under a second.

### 7.1 Why TypeScript (the Python → TypeScript migration)

The MCP server began in Python, where the MCP SDK had the best early
support. During the v0.2.0 refactor it was migrated to TypeScript to
align with the existing Node/Vite build toolchain and eliminate the
two-runtime coordination overhead (a separate Python process alongside
Node/Tauri). The protocol itself is language-agnostic — the migration
was purely an operational simplification, not a capability change.

## 8. Performance & testing

Honest current state:

- **CI pipeline** (`.github/workflows/ci.yml`) gates merges with
  change-detection plus per-area jobs: frontend (`tsc --noEmit` + a real
  Vite production build, which catches missing imports a bare typecheck
  misses), MCP server (typecheck + build + `vitest` with coverage), Rust
  (`rustfmt --check` + `clippy -D warnings` + `cargo test`), and a
  cross-platform `tauri-build` that compiles the full bundle on Linux,
  macOS, and Windows. A `security` job runs advisory `npm audit` /
  `cargo audit`, and a single `ci-success` check is the branch-protection
  gate. A separate `release.yml` builds and publishes platform binaries
  on version tags.
- **Automated tests are partial.** The MCP server has a `vitest` suite
  covering path-escape rejection, the `write_file` overwrite guard, and
  the default-script-path fallback. The Tauri frontend and Rust core have
  no behavior tests yet — `cargo test` runs but the crate currently
  carries no unit tests.
- **Manual smoke test** documented in `CONTRIBUTING.md`. Takes ~5
  minutes per platform. `scripts/ws-smoke.mjs` automates the
  WebSocket-remote leg of that check.
- **Render performance** measured informally: 5 000-word script at
  300 WPM holds 60 fps on a 2020-era M1; CPU sits around 3–5 %
  during playback. The `setInterval(16)` scroll loop was replaced
  with `requestAnimationFrame` in v0.2.0 — visible jitter on
  high-refresh displays is gone.
- **Bundle size:** ~12 MB on Windows, ~14 MB on macOS, ~18 MB on
  Linux (deb). About 100× smaller than an Electron equivalent.

What's next on the testing side: Playwright end-to-end tests for the
golden paths (load script, hit play, change WPM, hit pause), and unit
tests for `useScrollEngine`'s math.

## 9. What I'd do differently

Three calls I'd revisit if I were starting from scratch:

1. **Scroll engine in a Web Worker.** The current
   `requestAnimationFrame` loop runs on the main thread alongside
   React reconciliation. For very large scripts (50 000+ words) the
   layout cost of word-by-word DOM updates eventually shows. Moving
   tokenization and active-word tracking into a Worker and
   communicating via `postMessage` would buy headroom.

2. **CSS `translate3d` instead of `scrollTop`.** Mutating `scrollTop`
   on every frame works but triggers paint on every change. A
   transformed inner container moves on the compositor thread and
   skips paint entirely — measurable win on Linux/WebKit, where paint
   is the slow path.

3. **A real plugin API instead of bespoke MCP tools.** The MCP server
   reimplements file I/O concepts that the Tauri side already has.
   Exposing a single "run this snippet in the prompter context"
   command and letting third parties build on top would be more
   general than seven hand-rolled tools.

See also: `README.md` (users), `CHANGELOG.md` (v0.1.0 → v0.2.0
diff), `CONTRIBUTING.md` (dev setup), `mcp-server/README.md` (MCP
tools and deployment), `ROADMAP.md` (what's next).
