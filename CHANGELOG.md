# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.2.0] — 2026-04-14

### Added
- **Karaoke mode** — word-by-word highlighting with glow effect, `scrollIntoView` centering, resets on text/mode change, stops at end of script
- **System tray** — Show/Hide, Play/Pause, Quit menu items; left-click toggles window visibility
- **Skip taskbar toggle** — hide the app from the OS taskbar via checkbox in Window settings
- **Multi-monitor support** — enumerate displays and move the window to any monitor from the control panel
- **CI/CD** — GitHub Actions workflows for typecheck + `cargo clippy` on PRs, and cross-platform release builds on version tags
- **Reading time estimate** — shows estimated minutes:seconds based on word count and WPM setting
- **Scroll position scrubber** — seek bar to jump to any position in the script
- **Recent files list** — last 10 imported files remembered and accessible from a dropdown
- **Font size hotkeys** — `Ctrl+Plus` / `Ctrl+Minus` to adjust font size during playback
- **First-run onboarding** — one-time welcome overlay explaining core controls
- **Configurable hotkeys** — remap any shortcut from the settings UI
- **Remote WebSocket control** — control play/pause/speed from a phone on the same network
- **Custom font import** — load `.ttf` or `.otf` files from disk as the display font
- **Script bookmarks** — `[CUE: label]` markers with `Ctrl+N`/`Ctrl+P` navigation
- `ANALYSIS.md` — full code analysis and improvement roadmap document

### Fixed
- **CSP disabled** — `csp: null` replaced with a proper Content Security Policy
- **DevTools in production** — `devtools` feature now gated behind `#[cfg(debug_assertions)]`
- **Scroll speed math** — WPM now maps to real pixels/second via Canvas `measureText`; replaced `setInterval` with `requestAnimationFrame`
- **Spurious file-updated events** — `notify` watcher now filters to `Modify(Data)` and `Create` events only
- **Production path resolution** — scripts directory now uses `app_data_dir()` instead of `current_dir()` heuristic that broke in installed builds
- **Stale closures in file watchers** — `loadedFilesRef`/`currentFileIdRef` used inside event listeners
- **Auto-save** — session now actually auto-saves (500ms debounce on text/scroll changes); README claim is now true
- **Settings save rate** — debounced to 300ms; was firing at 60fps during slider drag
- **Shortcut registration** — replaced `setTimeout` hacks with exponential backoff retry
- **`isTauri()` per-render** — replaced with module-level `IS_TAURI` constant
- **`key={index}` on text lines** — replaced with content-based keys
- **Tray icon** — now uses the app's default window icon instead of blank
- `println!` debug statements removed from production Rust code
- `Cargo.toml` author placeholder fixed
- `package.json` version bumped to match `tauri.conf.json`

### Changed
- `App.tsx` decomposed from 1,755 lines into focused components:
  - `src/components/ControlPanel.tsx`
  - `src/components/TextDisplay.tsx`
  - `src/components/FileManager.tsx`
  - `src/components/Dialogs.tsx`
- Shared types extracted to `src/types/index.ts`
- Scroll engine extracted to `src/hooks/useScrollEngine.ts`
- Settings logic extracted to `src/hooks/useSettings.ts`
- File watcher systems consolidated into a single unified watcher

---

## [0.1.0] — Initial release

- Borderless, transparent, always-on-top overlay window
- Global hotkeys: play/pause, speed control, text color, click-through toggle
- File import (`.txt`, `.md`) with live file watching
- Session persistence via `tauri-plugin-store`
- Continuous scroll mode
- Focus band overlay
- Mirror mode
- Countdown timer before playback
- Scripts directory management
