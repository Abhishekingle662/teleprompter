# Teleprompter

A cross-platform desktop teleprompter built with Tauri (Rust) + React/Vite.

## Features

- **Borderless, Transparent, Always-on-Top Overlay**: Perfect for on-screen prompting without obstructing your view
- **Click-Through Mode**: Toggle click-through with hold-to-interact (Ctrl/Cmd+click)
- **Text Import**: Import `.txt` or `.md` files or paste text directly
- **Continuous & Karaoke Scroll**: Smooth scrolling with customizable WPM (Words Per Minute) speed
- **Customization**:
  - Font family and size
  - Adjustable margins (top, bottom, left, right)
  - Text mirroring for teleprompter glass setups
  - Opacity and blur controls
  - Focus band highlighting
- **Countdown Timer**: Configurable countdown before playback starts
- **Global Hotkeys**:
  - `Ctrl/Cmd+Space`: Play/Pause
  - `Ctrl/Cmd+Up`: Increase speed
  - `Ctrl/Cmd+Down`: Decrease speed
  - `Ctrl/Cmd+Shift+O`: Decrease opacity
  - `Ctrl/Cmd+Shift+P`: Increase opacity
- **Profile Management**: Save and load different configurations
- **Session Restore**: Automatically restores your last session on startup
- **Cross-Platform**: Windows, macOS, and Linux (X11/Wayland)

## Prerequisites

### Development Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Tauri Prerequisites](https://tauri.app/start/prerequisites/) for your platform:
  - **Linux**: `webkit2gtk`, `libappindicator3`, and other system dependencies
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual Studio C++ build tools

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/Abhishekingle662/teleprompter.git
   cd teleprompter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run tauri dev
   ```

4. Build for production:
   ```bash
   npm run tauri build
   ```

## Usage

### Basic Workflow

1. **Import or Paste Text**:
   - Click "Import File" to load a `.txt` or `.md` file
   - Or paste your text directly in the text area

2. **Customize Settings**:
   - Adjust font size, family, and margins
   - Set your preferred reading speed (WPM)
   - Enable/disable focus band for highlighting
   - Toggle mirroring if using teleprompter glass

3. **Start Scrolling**:
   - Set a countdown timer if desired
   - Press "Play" or use `Ctrl/Cmd+Space` to start
   - Use global hotkeys to control playback while focused on other applications

4. **Save Your Setup**:
   - Save profiles for different use cases
   - Session automatically restores on next launch

### Click-Through Mode

Enable "Click-Through" to make the window non-interactive, allowing clicks to pass through to windows beneath. Hold `Ctrl/Cmd` while clicking to temporarily interact with the teleprompter.

### Focus Band

Enable the focus band to highlight a specific area of the screen where you want to focus your reading. Adjust the position and height to suit your preferences.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+Space` | Play/Pause |
| `Ctrl/Cmd+Up` | Increase speed (+10 WPM) |
| `Ctrl/Cmd+Down` | Decrease speed (-10 WPM) |
| `Ctrl/Cmd+Shift+O` | Decrease opacity |
| `Ctrl/Cmd+Shift+P` | Increase opacity |
| `Escape` | Stop playback or toggle controls |

## Platform-Specific Notes

### Linux

- **X11**: Full support for all features
- **Wayland**: Limited support; some window management features may not work as expected due to Wayland's security model

### macOS

- You may need to grant accessibility permissions for global hotkeys to work

### Windows

- The application should work out of the box on Windows 10/11

## Development

### Project Structure

```
teleprompter/
├── src/                 # React frontend
│   ├── App.tsx         # Main application component
│   ├── App.css         # Styles
│   └── main.tsx        # Entry point
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── lib.rs      # Tauri commands and state management
│   │   └── main.rs     # Application entry point
│   ├── capabilities/   # Tauri permissions
│   └── tauri.conf.json # Tauri configuration
└── package.json        # Node dependencies
```

### Available Scripts

- `npm run dev`: Start Vite development server
- `npm run build`: Build frontend for production
- `npm run tauri dev`: Run application in development mode
- `npm run tauri build`: Build application for production

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Framework for building desktop applications
- [React](https://react.dev/) - UI library
- [Vite](https://vite.dev/) - Build tool
