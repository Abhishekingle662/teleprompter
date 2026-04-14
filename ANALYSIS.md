# Teleprompter — Code Analysis & Improvement Roadmap

> Analyzed by: Ona (AI Software Engineer)  
> Repository: https://github.com/Abhishekingle662/teleprompter  
> Stack: Tauri 2.0 · React 19 · TypeScript 5.8 · Rust (edition 2021) · Vite 7

---

## Executive Summary

The Teleprompter app is a well-intentioned v0.1.0 with a solid feature surface — transparent overlay, global hotkeys, file watching, and session persistence all work in principle. The biggest strength is the Tauri 2.0 foundation, which gives it a legitimate path to a sub-15 MB binary with native OS integration. The biggest opportunities are correctness (the WPM scroll calculation is mathematically wrong, karaoke mode is an unimplemented stub, and auto-save doesn't actually auto-save), architecture (a 1,755-line monolithic `App.tsx` with no component decomposition makes the codebase untestable and fragile), and security (CSP is explicitly disabled and DevTools ship in production builds).

---

## 1. Robustness & Reliability Improvements

### 1.1 Scroll Speed Math Is Wrong
**Priority: High | Effort: 3h**

`App.tsx` ~line 620:
```ts
const pixelsPerWord = settings.font_size * 0.7;
const pixelsPerSecond = wordsPerSecond * pixelsPerWord;
```
`font_size * 0.7` is a made-up heuristic. A word in Arial 48px is not 33.6px wide — it's closer to 120–180px depending on word length and font metrics. This means the WPM slider is not a meaningful unit; actual reading speed bears no relationship to the configured value. Fix: measure real character width using the Canvas 2D API (`ctx.measureText`) at the current font/size, compute average word width from a representative corpus, and derive pixels-per-second from that.

### 1.2 Karaoke Mode Is an Unimplemented Stub
**Priority: High | Effort: 6h**

`App.tsx` ~line 1520 (mode selector), `FEATURES.md` line 89:
The `scrollMode` state exists and the `<select>` renders, but the scroll `useEffect` (~line 615) ignores `scrollMode` entirely — karaoke behaves identically to continuous. The ROADMAP.md acknowledges this as "framework ready." This is a documented feature that silently does nothing, which is worse than not shipping it. Fix: implement word tokenization and `requestAnimationFrame`-based word highlighting with a separate scroll strategy.

### 1.3 Production Path Resolution Hack in Rust
**Priority: High | Effort: 2h**

`lib.rs` ~lines 230, 270, 310:
```rust
if current_dir.ends_with("src-tauri") {
    current_dir.parent().unwrap().join(SCRIPTS_DIR)
} else {
    current_dir.join(SCRIPTS_DIR)
}
```
This string-matching on `current_dir` breaks in any installed production build where the working directory is not the dev tree. Scripts will be written to the wrong location (e.g., `/usr/bin/scripts/` on Linux). Fix: use `app.path().app_data_dir()` from Tauri's path API, which resolves to the correct platform-specific user data directory (`~/.local/share/teleprompter/` on Linux, `~/Library/Application Support/teleprompter/` on macOS, `%APPDATA%\teleprompter\` on Windows).

### 1.4 `notify` Watcher Fires on All Event Types
**Priority: Medium | Effort: 1h**

`lib.rs` ~line 175 (`watch_file`), ~line 310 (`watch_scripts_directory`):
```rust
if let Ok(event) = res {
    // fires on Access, Metadata, Create, Modify, Remove — all of them
```
The handler fires on `Access` events (file opened for reading) and `Metadata` events (permissions changed), not just content modifications. This causes spurious `file-updated` emissions every time the OS reads the file. Fix: match only on `EventKind::Modify(ModifyKind::Data(_))` and `EventKind::Create(_)`.

### 1.5 Session Auto-Save Doesn't Exist
**Priority: Medium | Effort: 2h**

`App.tsx` ~line 1680, `README.md` line 130:
The README states "Your last text and scroll position are automatically saved." The code has a manual "Save Session" button that calls `saveSession()`, but there is no `useEffect` that auto-saves on text or scroll position change. Users who close the app without clicking the button lose their work. Fix: add a debounced `useEffect` (500ms) that calls `saveSession()` whenever `text` or `scrollPosition` changes.

### 1.6 Stale Closure in Directory Watcher
**Priority: Medium | Effort: 1h**

`App.tsx` ~line 380:
```ts
useEffect(() => {
  // captures loadedFiles and currentFileId at mount time
  unlisten = await listen("scripts-directory-updated", (event) => {
    const currentFile = loadedFiles.find(f => f.id === currentFileId); // stale!
```
The `scripts-directory-updated` listener captures `loadedFiles` and `currentFileId` from the closure at mount time. When files change after mount, the listener operates on stale state, causing incorrect file switching behavior. Fix: store `loadedFiles` and `currentFileId` in `useRef`s and read `.current` inside the listener.

### 1.7 `isTauri()` Called as Side-Effectful Function in Render
**Priority: Low | Effort: 30min**

`App.tsx` ~line 201:
```ts
const isTauri = () => {
  try { getCurrentWindow(); return true; } catch { return false; }
};
```
This function is re-created on every render and calls `getCurrentWindow()` — a Tauri API call — purely as an environment check. It's called dozens of times throughout the component. Fix: replace with a module-level constant computed once at import time:
```ts
const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
```

### 1.8 Shortcut Registration Uses Timing Hacks
**Priority: Low | Effort: 2h**

`App.tsx` ~lines 527, 535:
```ts
await new Promise(resolve => setTimeout(resolve, 300)); // wait for Tauri
await new Promise(resolve => setTimeout(resolve, 100)); // wait after unregister
```
Arbitrary `setTimeout` delays to work around Tauri initialization races are fragile — they will fail on slow machines and are unnecessary on fast ones. Fix: use `tauri-plugin-global-shortcut`'s event-based initialization or retry with exponential backoff (max 3 attempts, 100ms → 200ms → 400ms).

---

## 2. New Feature Suggestions

### Easy Wins (≤ 1 day)

**2.1 System Tray Icon**  
Add a persistent tray icon with Play/Pause, Show/Hide, and Quit menu items.  
_Why users love it_: The app is always-on-top and borderless — users need a way to access it when controls are hidden without hunting for a keyboard shortcut.  
_Implementation_: `tauri-plugin-tray` (already in Tauri 2.0 ecosystem). Add `"tray-icon:default"` to capabilities. ~50 lines of Rust in `lib.rs` + tray event listener in frontend.

**2.2 Reading Time Estimate**  
Show estimated reading time (minutes:seconds) based on current text and WPM setting.  
_Why users love it_: Presenters need to know if their script fits their time slot before they start.  
_Implementation_: Pure frontend — `Math.round(wordCount / wpm * 60)` seconds, displayed in the control panel. Zero new dependencies.

**2.3 Scroll Position Scrubber**  
Add a clickable progress bar that lets users jump to any position in the script.  
_Why users love it_: Currently there's no way to seek — you must reset to zero and wait. Essential for rehearsal.  
_Implementation_: `<input type="range">` bound to `scrollProgress`, on change set `scrollPosition = (value/100) * maxScroll`. ~10 lines.

**2.4 Recent Files List**  
Remember the last 10 imported files and show them in a dropdown.  
_Why users love it_: Eliminates the file picker dance for scripts used repeatedly.  
_Implementation_: Store file paths in `tauri-plugin-store` under `"recentFiles"` key. No new dependencies.

**2.5 Font Size Hotkeys**  
`Ctrl/Cmd+Plus` / `Ctrl/Cmd+Minus` to increase/decrease font size while playing.  
_Why users love it_: Adjusting font size mid-presentation without touching the control panel is essential for live use.  
_Implementation_: Two additional `register()` calls in the existing shortcut setup block.

---

### Medium Effort (2–5 days)

**2.6 True Karaoke Mode**  
Word-by-word highlighting that advances at WPM pace, keeping the current word centered in the focus band.  
_Why users love it_: Karaoke mode is the primary mode for glass teleprompter setups and live TV — it's the feature that separates professional tools from hobbyist ones.  
_Implementation_: Tokenize text into words with position offsets. Use `requestAnimationFrame` to advance a `currentWordIndex` at WPM pace. Highlight the current word with a `<span className="active-word">`. Scroll the container to keep the active word in the focus band using `element.scrollIntoView({ behavior: "smooth", block: "center" })`.

**2.7 Remote Control via WebSocket**  
Expose a local WebSocket server so a phone on the same network can control play/pause/speed.  
_Why users love it_: The #1 real-world teleprompter use case is a presenter controlling their own scroll from a phone while facing the camera.  
_Implementation_: Add `tokio` + `tokio-tungstenite` to `Cargo.toml`. Spawn a WebSocket server on `127.0.0.1:9001` in `lib.rs`. Expose a simple JSON protocol: `{"action": "play"}`, `{"action": "speed", "delta": 10}`. Serve a minimal mobile HTML control page from the same port.

**2.8 Custom Font Import**  
Allow users to load a `.ttf` or `.otf` file and use it as the display font.  
_Why users love it_: Broadcasters and studios have brand fonts. Dyslexia-friendly fonts (OpenDyslexic) are a common accessibility request.  
_Implementation_: Use `tauri-plugin-dialog` to pick a font file, `tauri-plugin-fs` to read it, convert to base64, inject as `@font-face` via a `<style>` tag. Store the base64 in `tauri-plugin-store` for persistence.

**2.9 Script Bookmarks / Cue Markers**  
Allow users to mark positions in the script (e.g., `[CUE: Scene 2]`) and jump between them with hotkeys.  
_Why users love it_: Multi-segment scripts (news broadcasts, long presentations) need section navigation.  
_Implementation_: Parse `[CUE: ...]` syntax during text rendering. Store cue positions as character offsets. `Ctrl+N` / `Ctrl+P` to jump to next/previous cue. Render cues as styled inline markers.

**2.10 Configurable Hotkeys**  
Let users remap any hotkey from the UI.  
_Why users love it_: `Ctrl+Space` conflicts with macOS Spotlight and input method switching. Users need to remap.  
_Implementation_: Store hotkey map in `tauri-plugin-store`. On settings change, call `unregisterAll()` then re-register with new keys. UI: a table of action → current shortcut with a "click to remap" capture input.

---

### Advanced / High-Impact (Future)

**2.11 OBS Studio Integration**  
Expose a WebSocket endpoint compatible with `obs-websocket` protocol so OBS can trigger play/pause on scene switch.  
_Why users love it_: Streamers and video producers want the teleprompter to start automatically when they go live.  
_Implementation_: Implement a subset of the `obs-websocket` v5 protocol in Rust using `tokio-tungstenite`. Listen for `SceneTransitioned` events.

**2.12 Voice-Paced Auto-Speed**  
Use the system microphone to detect speech pace and automatically adjust WPM to match the presenter's actual reading speed.  
_Why users love it_: Eliminates manual speed adjustment entirely — the teleprompter follows the speaker.  
_Implementation_: Use `cpal` (cross-platform audio) + `webrtc-vad` (voice activity detection) in Rust. Measure syllables-per-second, map to WPM, smooth with exponential moving average. Emit speed updates via Tauri events.

**2.13 Multi-Monitor Support**  
Allow the teleprompter to be pinned to a specific monitor, with a separate control window on another.  
_Why users love it_: Studio setups have a dedicated prompter monitor and a separate operator monitor.  
_Implementation_: Use `tauri::Monitor` API to enumerate displays. Allow user to select target monitor. Open a second `WebviewWindow` for the control panel on a different monitor.

**2.14 Companion Mobile App**  
A React Native or PWA companion that connects to the WebSocket remote control server.  
_Why users love it_: Wireless foot-pedal replacement. The presenter holds their phone and controls scroll speed with a thumb.  
_Implementation_: Build as a PWA served from the WebSocket server's HTTP endpoint. Single-page with large touch targets for play/pause/speed. No app store required.

---

## 3. UX / UI / Polish Enhancements

### 3.1 First-Run Experience
The app opens to a blank transparent window with no text and no onboarding. New users have no idea what to do. Add a first-run overlay (shown once, stored in `tauri-plugin-store`) that explains: drag the control panel, import a file, press Ctrl+Space to start.

### 3.2 Control Panel Overflow
The control panel is a single 350px-wide scrollable column with 8 sections. On a 768px-tall display, users must scroll extensively to reach Margins or Focus Band. Fix: collapse sections with `<details>` / accordion pattern, or add a tab bar (Playback | Appearance | Advanced).

### 3.3 Click-Through UX Is Confusing
When click-through is enabled, the only way back is `Ctrl+I` — but this is not discoverable. The 10-second notification is the only hint. Fix: show a persistent semi-transparent "Click-through ON — Press Ctrl+I to interact" badge in a corner that is always visible even in click-through mode (achieved by rendering it in a separate always-interactive overlay window).

### 3.4 No Visual Feedback During Countdown
The countdown overlay covers the entire screen with a black background, hiding the text. Users can't see what they're about to read. Fix: make the countdown overlay semi-transparent (rgba(0,0,0,0.5)) so the script is visible behind the countdown number.

### 3.5 Inline Styles Prevent Theming
~40% of styling is inline `style={{}}` objects scattered throughout JSX. This makes it impossible to implement themes or dark/light mode switching. Migrate all inline styles to CSS custom properties (`--color-accent`, `--panel-bg`, etc.) in `App.css`.

### 3.6 No Keyboard Navigation in Control Panel
The control panel has no logical tab order and no focus indicators. Users who rely on keyboard navigation cannot use the app. Add `tabIndex` ordering and `:focus-visible` styles.

### 3.7 Emoji in UI Code
The file manager uses emoji (`📁`, `🔄`, `👁️`) as UI elements. These render inconsistently across platforms (especially Linux) and at different sizes. Replace with SVG icons or a minimal icon font.

### 3.8 Text Rendering Quality
The text display uses `white-space: pre-wrap` and splits on `\n` into `<div>` elements with `key={index}`. This causes React reconciliation issues when text changes and doesn't handle `\r\n` line endings (Windows files). Fix: normalize line endings on import, use content-based keys.

### 3.9 Missing Accessibility Attributes
No `aria-label` on icon buttons, no `role` on custom dialogs, no `aria-live` region for notifications. Screen reader users cannot use the app at all.

---

## 4. Performance & Technical Improvements

### 4.1 Monolithic App.tsx (1,755 lines)
The entire application — state management, 12+ `useEffect`s, all UI, all event handlers — lives in one component. This causes:
- Full component re-render on any state change (15+ `useState` calls)
- Impossible to write unit tests
- Slow hot-reload in development
- No code splitting

Fix: decompose into `<ControlPanel>`, `<TextDisplay>`, `<FileManager>`, `<Dialogs>`, `<ShortcutsHelp>`. Extract business logic into custom hooks: `useScrollEngine`, `useShortcuts`, `useFileWatcher`, `useSettings`.

### 4.2 Scroll Animation Uses `setInterval` at 16ms
```ts
scrollIntervalRef.current = setInterval(() => {
  setScrollPosition((prev) => prev + pixelsPerInterval);
}, intervalMs); // 16ms
```
`setInterval` is not frame-synchronized — it will drift relative to the display refresh rate, causing visible jitter. Fix: replace with `requestAnimationFrame` loop that uses `performance.now()` delta for frame-accurate timing.

### 4.3 Text Rendering Splits on `\n` into Individual `<div>`s
A 5,000-word script creates 200+ individual `<div>` elements, each a separate React fiber node. For karaoke mode this will be thousands of `<span>` elements. Fix: use a virtualized list (`@tanstack/react-virtual`) for long scripts, or at minimum batch lines into paragraphs.

### 4.4 Settings Saved on Every Slider Move
```ts
onChange={(e) => updateSettings({ ...settings, wpm: parseInt(e.target.value) })}
```
`updateSettings` calls `store.current?.save()` on every slider `onChange` event — potentially 60 times per second while dragging. Fix: debounce `saveSettings` with a 300ms delay.

### 4.5 Multiple Redundant File Watchers
The app runs three separate `notify` watcher systems simultaneously: `script_watcher` (single file), `global_watcher` (per-file watchers), and `directory_watcher`. These overlap in responsibility and each holds OS file descriptor resources. Consolidate into a single watcher that handles both directory and individual file events.

### 4.6 `devtools` Feature in Production
`Cargo.toml` line 18: `tauri = { version = "2.0", features = ["devtools"] }`. This increases binary size and exposes the DevTools inspector in production builds. Gate it:
```toml
[features]
default = []
devtools = ["tauri/devtools"]

[dependencies]
tauri = { version = "2.0" }
```
And in `lib.rs`:
```rust
#[cfg(debug_assertions)]
app.get_webview_window("main").unwrap().open_devtools();
```

### 4.7 No TypeScript Strict Mode
`tsconfig.json` does not enable `"strict": true`. This allows implicit `any`, non-null assertions without checks, and loose function signatures throughout the codebase. Enable strict mode and fix the resulting errors — this will surface several real bugs.

---

## 5. Documentation, Distribution & Developer Experience

### 5.1 No CI/CD Pipeline
There are no GitHub Actions workflows. No automated lint, typecheck, or build verification on PRs. A broken commit can be merged without detection. Add:
- `ci.yml`: runs `tsc --noEmit`, `cargo check`, `cargo clippy` on every push/PR
- `release.yml`: builds platform binaries and creates GitHub releases on version tags

### 5.2 CSP Is Disabled
`tauri.conf.json`: `"csp": null`. Tauri's default CSP is a meaningful security boundary. Re-enable it:
```json
"security": {
  "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
}
```
`unsafe-inline` for styles is needed for the inline style objects (another reason to migrate them to CSS classes).

### 5.3 Version Mismatch
`package.json` has `"version": "0.1.0"` but `tauri.conf.json` has `"version": "0.2.0"`. These should be kept in sync. Use a single source of truth: read the version from `package.json` in `tauri.conf.json` via `"version": { "path": "../package.json" }`.

### 5.4 No Auto-Update
There is no `tauri-plugin-updater` integration. Users must manually download new versions. Add auto-update with a GitHub Releases endpoint as the update server.

### 5.5 MCP Server Is Undocumented
The `mcp-server/` directory contains a Model Context Protocol server with no documentation in the main README. It's unclear what it does or how to use it. Either document it or move it to a separate repository.

### 5.6 README Has Duplicate Sections
The README has two "Troubleshooting" sections (lines ~180 and ~220) with overlapping content. Consolidate.

### 5.7 No CHANGELOG
There is a `ROADMAP.md` but no `CHANGELOG.md`. Users upgrading cannot see what changed between versions.

### 5.8 `Cargo.toml` Author Placeholder
`Cargo.toml` line 5: `authors = ["you"]`. Should be the actual author name.

---

## 6. Quick Wins You Can Ship Today

### QW1: Fix the Security Regression (30 minutes)
**Files**: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`

1. In `tauri.conf.json`, change `"csp": null` to:
   ```json
   "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
   ```
2. In `Cargo.toml`, change `features = ["devtools"]` to no features, and add a `[features]` section gating devtools on `debug_assertions`.
3. Fix `authors = ["you"]` to the real author name.

### QW2: Fix Auto-Save (45 minutes)
**File**: `src/App.tsx`

Add a debounced auto-save effect after the existing `saveSession` function:
```ts
const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  autoSaveTimerRef.current = setTimeout(() => {
    if (store.current) saveSession();
  }, 500);
  return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
}, [text, scrollPosition]);
```
This makes the README's claim true and prevents data loss.

### QW3: Fix the `isTauri()` Environment Check (15 minutes)
**File**: `src/App.tsx`

Replace the function defined inside the component with a module-level constant:
```ts
// At the top of App.tsx, outside the component
const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
```
Then replace all `isTauri()` calls with `IS_TAURI`. This eliminates ~20 redundant `getCurrentWindow()` calls per render cycle.

---

## 7. Suggested 2-Week Implementation Roadmap

### Week 1 — Correctness & Architecture

| Day | Task | Files | Outcome |
|---|---|---|---|
| 1 | Fix CSP, devtools gate, Cargo author | `tauri.conf.json`, `Cargo.toml` | Security regression resolved |
| 1 | Fix `isTauri()`, fix `key={index}` | `App.tsx` | Render correctness |
| 2 | Fix scroll speed math (canvas measurement) | `App.tsx` | WPM is now accurate |
| 2 | Fix `notify` event filter | `lib.rs` | No spurious file-updated events |
| 3 | Fix production path resolution | `lib.rs` | Scripts save to correct location in prod |
| 3 | Fix stale closure in directory watcher | `App.tsx` | File switching works correctly after changes |
| 4 | Implement real debounced auto-save | `App.tsx` | README claim is now true |
| 4 | Enable TypeScript `strict: true`, fix errors | `tsconfig.json`, `App.tsx` | Type safety enforced |
| 5 | Decompose `App.tsx` into components + hooks | `src/components/`, `src/hooks/` | Testable, maintainable architecture |

### Week 2 — Features & Polish

| Day | Task | Files | Outcome |
|---|---|---|---|
| 6 | Implement true Karaoke mode | `App.tsx` / `TextDisplay.tsx` | Documented feature actually works |
| 7 | Replace `setTimeout` hacks with retry/backoff | `App.tsx` / `useShortcuts.ts` | Reliable shortcut registration |
| 8 | Add system tray icon | `lib.rs`, `Cargo.toml`, capabilities | App accessible when controls hidden |
| 9 | Add `skipTaskbar` toggle + multi-monitor positioning | `App.tsx`, `lib.rs` | Professional overlay behavior |
| 10 | Write CI/CD GitHub Actions workflows | `.github/workflows/` | Automated quality gates on every PR |

### Priority Order if Time Is Limited

If you can only do one week, do Week 1. The correctness bugs (scroll math, karaoke stub, path resolution, auto-save lie) and the security issues (CSP, devtools) are the highest-leverage fixes. Week 2 features are valuable but the app works without them; it doesn't work correctly without Week 1.

---

*Analysis based on full source review of commit history as of the analysis date. All line numbers are approximate and may shift with edits.*
