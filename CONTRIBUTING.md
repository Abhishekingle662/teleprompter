# Contributing to Teleprompter

Thank you for your interest in contributing to the Teleprompter project! This guide will help you get started with development.

## Development Setup

### Prerequisites

1. **Node.js** (v20 or later)
   - Download from [nodejs.org](https://nodejs.org/)
   
2. **Rust** (latest stable)
   - Install from [rust-lang.org](https://www.rust-lang.org/tools/install)
   - Verify installation: `rustc --version`

3. **Platform-Specific Dependencies**

   #### Linux (Ubuntu/Debian)
   ```bash
   sudo apt update
   sudo apt install -y \
     libwebkit2gtk-4.0-dev \
     libwebkit2gtk-4.1-dev \
     build-essential \
     curl \
     wget \
     file \
     libssl-dev \
     libgtk-3-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev \
     patchelf
   ```

   #### macOS
   ```bash
   # Install Xcode Command Line Tools
   xcode-select --install
   ```

   #### Windows
   - Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10/11)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Abhishekingle662/teleprompter.git
   cd teleprompter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri dev
   ```
   This will:
   - Start the Vite development server
   - Build the Rust backend
   - Launch the application with hot-reload enabled

## Project Structure

```
teleprompter/
├── .github/workflows/      # CI (ci.yml) and release (release.yml)
├── src/                     # React frontend
│   ├── App.tsx             # Root component — wires everything together
│   ├── App.css             # Application styles
│   ├── main.tsx            # React entry point
│   ├── components/         # TopBar, TransportBar, Inspector,
│   │                       #   TextDisplay, FileManager,
│   │                       #   HotkeySettings, Dialogs
│   ├── hooks/              # useScrollEngine, useSettings
│   └── types/index.ts      # Shared types + DEFAULT_SETTINGS / HOTKEYS
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs          # All Tauri commands + WebSocket + watchers
│   │   └── main.rs         # Application entry point
│   ├── capabilities/       # Tauri permissions
│   ├── icons/              # App icons (desktop + Android/iOS assets)
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration (window, CSP, bundle)
├── mcp-server/             # Standalone MCP server (TypeScript, stdio)
│   ├── src/index.ts        # Server + tools
│   ├── src/index.test.ts   # vitest suite
│   └── Dockerfile          # Containerized stdio server
├── scripts/                # Sample scripts + ws-smoke.mjs remote check
├── public/                 # Static files
├── package.json            # Frontend deps and scripts
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```

## Development Workflow

### Making Changes

1. **Frontend Changes (React/TypeScript)**
   - Edit files in `src/`
   - Changes are hot-reloaded automatically
   - Check TypeScript errors: `npm run build`

2. **Backend Changes (Rust)**
   - Edit files in `src-tauri/src/`
   - Application restarts automatically when changes are detected
   - Check for errors: `cd src-tauri && cargo check`

3. **Configuration Changes**
   - Window settings: Edit `src-tauri/tauri.conf.json`
   - Permissions: Edit `src-tauri/capabilities/default.json`
   - Dependencies: Update `package.json` or `src-tauri/Cargo.toml`

### Testing

CI (`.github/workflows/ci.yml`) runs all of the following on every PR.
Run the relevant ones locally before pushing.

#### Frontend
```bash
npx tsc --noEmit     # type check
npm run build        # production Vite build (catches missing imports)
```

#### MCP server
```bash
cd mcp-server
npm install
npx tsc --noEmit     # type check
npm test             # vitest suite (path-escape, overwrite guard, …)
```

#### Rust backend
```bash
cd src-tauri
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

#### Full application
```bash
npm run tauri build  # builds the complete installable bundle
```

For the WebSocket remote specifically, `node scripts/ws-smoke.mjs
ws://<ip>:<port>` (use the address shown in the Inspector's Output tab)
fires each remote action against a running instance.

### Code Style

#### TypeScript/React
- Use functional components with hooks
- Follow existing naming conventions
- Add types for all props and state
- Keep components focused and single-purpose

#### Rust
- Follow Rust standard formatting (use `cargo fmt`)
- Run `cargo clippy` for linting
- Add error handling for all fallible operations
- Document public functions and types

## Adding New Features

### Frontend Features

1. **New UI Components**
   - Add a component under `src/components/` (keep `App.tsx` as the
     wiring layer, not a place for new markup)
   - Update `src/App.css` for styling
   - Use existing color scheme and design patterns

2. **New Settings**
   - Add the field to the `Settings` interface in `src/types/index.ts`
     and update `DEFAULT_SETTINGS`
   - Add UI controls in the relevant `Inspector` tab
     (`src/components/Inspector.tsx`)
   - Persistence is automatic via `useSettings` (debounced write to the
     `settings.json` store)

### Backend Features

1. **New Tauri Commands**
   - Add command function in `src-tauri/src/lib.rs`
   - Use `#[tauri::command]` attribute
   - Add to `invoke_handler!` macro
   - Document parameters and return types

2. **New Permissions**
   - Add required permissions to `src-tauri/capabilities/default.json`
   - Check Tauri documentation for available permissions

3. **New Dependencies**
   - Add to `src-tauri/Cargo.toml`
   - Run `cargo update` to update lock file

## Common Development Tasks

### Adding a Global Shortcut
1. Register in the frontend (`src/App.tsx`):
   ```typescript
   await register("CommandOrControl+X", () => {
     // Your action here
   });
   ```
2. Remember to unregister in cleanup

### Adding Window Management Features
1. Add Rust command in `src-tauri/src/lib.rs`:
   ```rust
   #[tauri::command]
   fn my_window_command(window: Window) -> Result<(), String> {
       // Your window manipulation
       Ok(())
   }
   ```
2. Add permission to `capabilities/default.json`
3. Call from frontend using `invoke("my_window_command")`

### Debugging

#### Frontend
- Open DevTools in the application (if enabled)
- Check browser console for errors
- Use React DevTools browser extension

#### Backend
- Check terminal output when running `npm run tauri dev`
- Add `println!` or `dbg!` statements in Rust code
- Use `env_logger` for structured logging

## Building for Distribution

### Development Build
```bash
npm run tauri build
```

### Production Build
```bash
# Set version in src-tauri/Cargo.toml and package.json
npm run tauri build -- --config src-tauri/tauri.conf.json
```

The built application will be in:
- **macOS**: `src-tauri/target/release/bundle/macos/`
- **Linux**: `src-tauri/target/release/bundle/deb/` or `appimage/`
- **Windows**: `src-tauri/target/release/bundle/msi/` or `nsis/`

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly on your platform
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request with:
   - Clear description of changes
   - Why the change is needed
   - Any testing you've done
   - Screenshots (if UI changes)

## Manual Smoke Test

Before opening a PR, run through this ~5 minute checklist on your
platform. CI covers types and lints but not behavior.

1. **Launch** — `npm run tauri dev`. Window opens borderless and
   transparent with the Inspector visible.
2. **Load a script** — Import `sample.txt`. Text appears in the
   display area.
3. **Play** — Press `Ctrl+Space`. Text scrolls smoothly; the WPM
   reading matches the slider.
4. **Hotkey adjust** — `Ctrl+Up` twice. WPM increases by 20.
5. **Mode switch** — Toggle to karaoke mode. Active word is
   highlighted and stays centered.
6. **Click-through** — Enable it, click in the text area, confirm the
   click reaches the window beneath. Press `Ctrl+I` to toggle off.
7. **Tray** — Right-click the tray icon, verify Play/Pause and
   Show/Hide menu items work; left-click toggles window visibility.
8. **MCP round-trip** (if configured) — From Claude/ChatGPT, call
   `write_script` with new content. On-screen text refreshes within
   ~1 s.
9. **Session restore** — Close the app while playing, reopen, confirm
   text and scroll position are restored.

If any step fails, note the OS, compositor (Linux), and exact step in
your PR description.

## Common Issues

**Build failures**
- *Linux* — install the platform deps listed under Prerequisites.
- *macOS* — `xcode-select --install`.
- *Windows* — install Visual Studio C++ Build Tools.

**Runtime issues**
- *Global shortcuts* — on macOS, grant Accessibility permission in
  System Settings. On Wayland, they may not work — use X11.
- *Transparent window* — Linux needs a running compositor.
- *Click-through* — limited on Wayland; X11 has full support.

## Resources

- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Rust Documentation](https://doc.rust-lang.org/)

## Questions?

Feel free to:
- Open an issue for bugs or feature requests
- Start a discussion for questions
- Reach out to maintainers

Happy coding! 🚀
