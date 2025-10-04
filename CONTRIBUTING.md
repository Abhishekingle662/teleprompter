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
├── .github/
│   └── workflows/       # CI/CD workflows
├── src/                 # React frontend source
│   ├── App.tsx         # Main application component
│   ├── App.css         # Application styles
│   ├── main.tsx        # React entry point
│   └── assets/         # Static assets
├── src-tauri/          # Rust backend source
│   ├── src/
│   │   ├── lib.rs      # Main library with Tauri commands
│   │   └── main.rs     # Application entry point
│   ├── capabilities/   # Tauri permissions configuration
│   ├── icons/          # Application icons
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri configuration
├── public/             # Public static files
├── package.json        # Node.js dependencies and scripts
├── vite.config.ts      # Vite configuration
└── tsconfig.json       # TypeScript configuration
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

#### Frontend Testing
```bash
# Build the frontend
npm run build

# The built files will be in the dist/ directory
```

#### Full Application Testing
```bash
# Build the complete application
npm run tauri build

# The built application will be in src-tauri/target/release/
```

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
   - Add to `src/App.tsx` or create a new component file
   - Update `src/App.css` for styling
   - Use existing color scheme and design patterns

2. **New Settings**
   - Add to `Settings` interface in `src/App.tsx`
   - Update default values
   - Add UI controls in the control panel
   - Save/load through the store

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

## Common Issues

### Build Failures

**"webkit2gtk not found" (Linux)**
- Install missing system dependencies (see prerequisites)

**"xcrun: error" (macOS)**
- Install Xcode Command Line Tools

**"MSVC not found" (Windows)**
- Install Visual Studio C++ Build Tools

### Runtime Issues

**Global shortcuts not working**
- Check if permissions are granted (especially on macOS)
- Verify shortcuts aren't conflicting with system shortcuts

**Transparent window not working**
- Check if compositor is running (Linux)
- Verify window settings in `tauri.conf.json`

**Click-through not working**
- This feature may have limited support on Wayland
- Try X11 session on Linux

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
