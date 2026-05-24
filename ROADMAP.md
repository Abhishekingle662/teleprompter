# Teleprompter Roadmap

This roadmap reflects what's shipped and what's planned. For the detailed
diff of what landed in each release, see [`CHANGELOG.md`](CHANGELOG.md).

**Current version:** v0.3.0 (released 2026-05-24) — the last
stabilization release before the in-app phone-remote feature.

---

## ✅ Shipped

### v0.1.0 — Initial release
- Cross-platform desktop app (Tauri 2 + React 19 / Vite)
- Borderless, transparent, always-on-top overlay
- Click-through mode with hold-to-interact
- Text import (`.txt` / `.md`) and paste, with live file watching
- Continuous scroll with WPM speed control
- Font family/size, per-side margins, mirror, opacity, blur
- Focus band highlighting and countdown timer
- Global hotkeys, session restore
- Windows / macOS / Linux support

### v0.2.0 — Enhanced controls & integrations
- **Karaoke mode** — true word-by-word highlighting with auto-centering
- **WPM accuracy** — scroll speed mapped to real pixels/second via Canvas
  `measureText`; `requestAnimationFrame` engine
- **WebSocket remote** — control playback from a phone or any client on
  the LAN (`play` / `pause` / `toggle` / `faster` / `slower` / `reset`)
- **MCP server** — AI-assisted live script editing from Claude / ChatGPT
- **Configurable hotkeys** — remap any shortcut from the Inspector
- **Custom font import** (`.ttf` / `.otf`)
- **Cue markers** — `[CUE: label]` with `Ctrl+N` / `Ctrl+P` navigation
- **Multi-monitor**, **system tray**, **skip-taskbar toggle**
- **Reading-time estimate**, **scroll scrubber**, **recent-files list**
- Security/quality: real CSP, DevTools gated to debug builds, `App.tsx`
  decomposed into focused components, CI/CD workflows

### v0.3.0 — Stabilization
- MCP server `vitest` test suite + Docker support; helpers refactored to
  be importable/testable
- `get_app_data_dir` command + an Inspector **Output** panel that copies
  the MCP workspace path
- CI pipeline overhaul: change-detection, frontend build, MCP test +
  coverage, Rust fmt/clippy/test, cross-platform `tauri-build` smoke
  builds, advisory security audits
- Cross-platform icon assets (Android / iOS / macOS) — groundwork for
  future mobile targets
- `scripts/ws-smoke.mjs` end-to-end check for the WebSocket remote

---

## 🔭 Planned

The near-term focus is hardening (tests, performance) and the two
extension surfaces the architecture already hints at (remote/mobile,
plugins). Items are intentionally unbound from calendar quarters —
this is a side project and dates were the most-wrong part of the old
roadmap.

### Next: stability & test coverage
- [ ] Playwright end-to-end tests for the golden paths (load → play →
      change WPM → pause)
- [ ] Unit tests for `useScrollEngine` WPM math and cue parsing
- [ ] Rust unit tests for path resolution and the watch-event filter
- [ ] TypeScript `strict` mode across the frontend
- [ ] Crash/error surfacing for failed Tauri commands

### Performance
- [ ] Move the scroll loop off `scrollTop` onto a compositor-friendly
      `translate3d` transform (measurable win on Linux/WebKit)
- [ ] Offload tokenization / active-word tracking to a Web Worker for
      very large scripts (50k+ words)

### Reading experience
- [ ] Auto-pause at cue markers
- [ ] Themes / preset bundles (and bring back named, savable profiles)
- [ ] Background color / gradient options
- [ ] Line-height and letter-spacing controls

### Remote & mobile
- [ ] Polished phone remote web client (served from the app) with a QR
      code to the displayed `ip:port`
- [ ] Evaluate a native mobile companion using the new icon assets

### Extensibility
- [ ] A real plugin API to replace the bespoke MCP file tools — expose a
      single "run this in the prompter context" surface that third
      parties can build on
- [ ] Auto-update channel for released binaries

### Platform polish
- [ ] Better Wayland support (global shortcuts, click-through)
- [ ] High-DPI / per-monitor scaling refinements

---

## Versioning & releases

We follow [Semantic Versioning](https://semver.org/): **major** for
breaking changes, **minor** for backward-compatible features, **patch**
for fixes. Releases are cut by tagging a version, which triggers the
release workflow to build platform binaries.

## Contributing to the roadmap

Open a GitHub issue (tag `enhancement`) or start a Discussion to propose
or vote on features. See [`CONTRIBUTING.md`](CONTRIBUTING.md) to get a
dev environment running.

---

*This roadmap is a direction, not a promise — it shifts with feedback,
constraints, and available time.*

*Last updated: May 2026.*
