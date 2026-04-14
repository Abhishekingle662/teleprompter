# Teleprompter — Improvement Roadmap Specification

## Overview

This spec defines the deliverable for a comprehensive code-level analysis and improvement roadmap of the Teleprompter repository. The output is a structured analysis document covering robustness, new features, UX, performance, and a 2-week implementation plan.

---

## Tech Stack (Confirmed)

| Layer | Technology |
|---|---|
| Desktop framework | Tauri 2.0 |
| Frontend | React 19, TypeScript 5.8, Vite 7 |
| Backend | Rust (edition 2021) |
| Persistence | `tauri-plugin-store` 2.0 (JSON) |
| File system | `tauri-plugin-fs` 2.0 |
| Global shortcuts | `tauri-plugin-global-shortcut` 2.0 |
| File dialogs | `tauri-plugin-dialog` 2.0 |
| File watching | `notify` 6 (Rust) |
| Extras | MCP server (separate Node.js package) |

---

## Problem Statement

The repository is a functional v0.1.0 teleprompter desktop app with a solid feature set. However, the codebase has accumulated significant technical debt in a single 1,755-line monolithic component (`App.tsx`), has correctness bugs in scroll speed calculation, missing karaoke mode implementation, no CI/CD, a null CSP, and several cross-platform reliability gaps. The goal is to produce a prioritized, actionable improvement roadmap that keeps the app lightweight and true to its minimalist purpose.

---

## Deliverable Requirements

The spec.md drives implementation of a **comprehensive analysis document** (written directly into this spec or as a separate `ANALYSIS.md`). The analysis must cover all six sections below with the exact structure requested.

### 1. Executive Summary
- 2–3 sentences: overall quality, strengths, biggest opportunities

### 2. Robustness & Reliability Improvements
- 5–8 items
- Each item: priority (High/Medium/Low), estimated effort (hours), why it matters, exact file/line reference

### 3. New Feature Suggestions
Categorized:
- Easy wins (≤ 1 day)
- Medium effort (2–5 days)
- Advanced / high-impact (future)

Each feature: name, one-sentence description, user value, technical implementation notes

### 4. UX / UI / Polish Enhancements

### 5. Performance & Technical Improvements

### 6. Documentation, Distribution & Developer Experience

### 7. Quick Wins You Can Ship Today (top 3)

### 8. Suggested 2-Week Roadmap

---

## Acceptance Criteria

The spec is complete and the Ralph loop is done when:

1. ✅ All six analysis sections are written with the exact structure above
2. ✅ Every robustness item references a specific file and approximate line number
3. ✅ Every feature suggestion includes concrete library/API names
4. ✅ The 2-week roadmap is day-by-day or milestone-based with clear sequencing
5. ✅ Quick wins include exact next steps (not just descriptions)
6. ✅ The analysis is honest about incomplete/hacky areas (karaoke mode stub, monolithic App.tsx, null CSP, scroll math bug, path resolution hack)
7. ✅ User confirms the completion criteria are correct

---

## Key Findings from Code Analysis

These findings inform the analysis document and must all be addressed:

### Critical Bugs / Correctness Issues

1. **Scroll speed math is wrong** (`App.tsx` ~line 620):
   ```ts
   const pixelsPerWord = settings.font_size * 0.7;
   ```
   This is a made-up heuristic. Actual word width depends on font metrics, not just font size. At 48px font, a "word" is not 33.6px. This causes WPM to be meaningless as an absolute measure.

2. **Karaoke mode is a stub** (`App.tsx` ~line 1520, `FEATURES.md`):
   The mode selector exists but karaoke scrolling is never implemented — it behaves identically to continuous mode. The ROADMAP.md acknowledges this ("framework ready").

3. **`isTauri()` is called as a function inside render** (`App.tsx` ~line 201):
   ```ts
   const isTauri = () => { try { getCurrentWindow(); return true; } catch { return false; } }
   ```
   This is re-created on every render and calls `getCurrentWindow()` (a side-effectful API) just to check environment. Should be a module-level constant computed once.

4. **Shortcut registration race condition** (`App.tsx` ~lines 507–600):
   Uses `setTimeout(resolve, 300)` and `setTimeout(resolve, 100)` as timing hacks to avoid Tauri initialization races. This is fragile and will fail on slow machines.

5. **Directory path resolution is fragile** (`lib.rs` ~lines 230, 270, 310):
   ```rust
   if current_dir.ends_with("src-tauri") { ... parent() ... }
   ```
   This string-matching hack breaks if the app is installed anywhere other than the dev tree. Production builds will write scripts to the wrong directory.

6. **`notify` watcher fires on all events including metadata** (`lib.rs` ~line 175):
   The `watch_file` handler fires on any `Event` including `Access` and `Metadata` events, not just `Modify`. This causes spurious file-updated emissions.

7. **Session save is manual-only** (`App.tsx` ~line 1680):
   The "Save Session" button exists but there is no auto-save on text change or scroll position change. The README claims "automatically saves" but the code does not.

8. **`csp: null`** (`tauri.conf.json` line 16):
   Content Security Policy is explicitly disabled. This is a security regression from Tauri's defaults.

9. **`devtools` feature enabled in production** (`Cargo.toml` line 18):
   ```toml
   tauri = { version = "2.0", features = ["devtools"] }
   ```
   DevTools should only be enabled in debug builds.

10. **`Cargo.toml` author is `"you"`** (`Cargo.toml` line 5):
    Placeholder not updated.

### Architecture Issues

- **Monolithic `App.tsx`** (1,755 lines): All state, all effects, all UI in one component. No separation of concerns. Makes testing impossible and hot-reload slow.
- **No state management library**: 15+ `useState` calls, 6+ `useRef` for sync, manual ref-sync `useEffect`s. Classic React anti-pattern at scale.
- **`loadedFiles` closure stale in directory watcher** (`App.tsx` ~line 380): The `scripts-directory-updated` listener captures `loadedFiles` and `currentFileId` at mount time, causing stale closure bugs when files change.
- **`key={index}` for text lines** (`App.tsx` ~line 1750): Using array index as React key causes incorrect reconciliation when text changes.
- **No TypeScript strict mode**: `tsconfig.json` does not enable `strict: true`.
- **Inline styles mixed with CSS classes**: ~40% of styling is inline `style={{}}` objects, defeating CSS optimization and making theming impossible.

---

## Implementation Approach

The implementation phase will:

1. Write the full analysis as `ANALYSIS.md` at the repo root, covering all 8 sections
2. Implement everything in the 2-week roadmap as actual code changes
3. The Ralph loop completes when both the analysis document and all roadmap code changes are done

### 2-Week Roadmap Scope (to be implemented)

**Week 1 — Correctness & Architecture**

| Day | Work |
|---|---|
| 1 | Fix `csp: null` → proper CSP; gate `devtools` behind `#[cfg(debug_assertions)]`; fix `Cargo.toml` author |
| 1 | Fix `isTauri()` → module-level constant; fix `key={index}` → content-based key |
| 2 | Fix scroll speed math: measure actual character width via canvas API, derive real px/s from WPM |
| 2 | Fix `notify` event filter in `watch_file` — only fire on `Modify(Data)` events |
| 3 | Fix production path resolution in `lib.rs` — use `app.path().app_data_dir()` instead of `current_dir()` heuristic |
| 3 | Fix stale closure in directory watcher — use `useRef` for `loadedFiles`/`currentFileId` |
| 4 | Implement real auto-save (debounced, on text change and scroll position change) |
| 4 | Enable TypeScript `strict: true`; fix all resulting type errors |
| 5 | Decompose `App.tsx` into focused components: `ControlPanel`, `TextDisplay`, `FileManager`, `Dialogs` |

**Week 2 — Features & Polish**

| Day | Work |
|---|---|
| 6 | Implement true Karaoke mode: word-by-word highlighting with `requestAnimationFrame` |
| 7 | Add shortcut registration retry with exponential backoff (replace `setTimeout` hacks) |
| 8 | Add system tray icon with play/pause/quit menu items (`tauri-plugin-tray`) |
| 9 | Add `skipTaskbar: true` toggle and multi-monitor window positioning |
| 10 | Write CI/CD GitHub Actions workflow: lint, typecheck, Rust `cargo check`, build on push |

---

## Completion Criteria

The Ralph loop is **done** when:
1. `ANALYSIS.md` exists at repo root with all 8 sections fully populated
2. All 10 days of roadmap code changes are implemented and committed
3. All critical bugs listed in "Key Findings" are fixed
4. TypeScript strict mode passes with no errors
5. The app builds successfully (`npm run tauri build` equivalent check)
