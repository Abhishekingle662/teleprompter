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

## Installation & Setup

### Prerequisites

Before you begin, make sure you have the following installed:

1. **Node.js** (v18 or later)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **Rust** (latest stable)
   - Install from [rustup.rs](https://rustup.rs/)
   - On Windows: Run the installer and follow prompts
   - Verify installation: `rustc --version`

3. **Platform-Specific Tools**:
   
   **Windows:**
   - Microsoft Visual Studio C++ Build Tools
   - Download from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/)
   - Select "Desktop development with C++" workload
   
   **macOS:**
   - Xcode Command Line Tools: `xcode-select --install`
   
   **Linux:**
   ```bash
   # Debian/Ubuntu
   sudo apt update
   sudo apt install libwebkit2gtk-4.1-dev \
     build-essential \
     curl \
     wget \
     file \
     libxdo-dev \
     libssl-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev
   
   # Fedora
   sudo dnf install webkit2gtk4.1-devel \
     openssl-devel \
     curl \
     wget \
     file \
     libappindicator-gtk3-devel \
     librsvg2-devel
   
   # Arch
   sudo pacman -S webkit2gtk-4.1 \
     base-devel \
     curl \
     wget \
     file \
     openssl \
     appmenu-gtk-module \
     gtk3 \
     libappindicator-gtk3 \
     librsvg
   ```

### Building from Source

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Abhishekingle662/teleprompter.git
   cd teleprompter
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode** (for testing):
   ```bash
   npm run tauri dev
   ```
   This will compile the app and open it in a window. Changes to the code will auto-reload.

4. **Build the production app:**
   ```bash
   npm run tauri build
   ```
   
   This creates optimized executables in `src-tauri/target/release/bundle/`:
   
   - **Windows**: `teleprompter.exe` in `nsis/` or `msi/` folder
   - **macOS**: `teleprompter.app` in `dmg/` or `macos/` folder  
   - **Linux**: `.deb`, `.AppImage`, or `.rpm` in respective folders

5. **Install the built app:**
   
   **Windows:**
   - Run the installer from `src-tauri/target/release/bundle/nsis/`
   - Or extract and run the portable `.exe`
   
   **macOS:**
   - Open the `.dmg` file and drag to Applications
   - Or double-click the `.app` file
   
   **Linux:**
   ```bash
   # Debian/Ubuntu (.deb)
   sudo dpkg -i src-tauri/target/release/bundle/deb/teleprompter_*.deb
   
   # Fedora/RHEL (.rpm)
   sudo rpm -i src-tauri/target/release/bundle/rpm/teleprompter-*.rpm
   
   # AppImage (no installation needed)
   chmod +x src-tauri/target/release/bundle/appimage/teleprompter_*.AppImage
   ./src-tauri/target/release/bundle/appimage/teleprompter_*.AppImage
   ```

## How to Use

### Getting Started

1. **Launch the Application**
   - Open the Teleprompter app from your applications menu or desktop

2. **First-Time Setup**
   - The app opens with a transparent, borderless window overlay
   - You'll see a control panel on the right side of the screen

### Loading Your Text

**Option 1: Import a File**
- Click the **"Import File"** button
- Select a `.txt` or `.md` file from your computer
- The text will appear in the scrollable area

**Option 2: Paste Text Directly**
- Click in the text area at the bottom of the controls
- Type or paste your text (Ctrl+V / Cmd+V)
- Your text is automatically saved

### Configuring Settings

**Speed Control:**
- Adjust **"Speed (WPM)"** slider to set reading speed
- 120-180 WPM is typical for comfortable reading
- Use keyboard shortcuts: Ctrl/Cmd+Up/Down to adjust while reading

**Visual Customization:**
- **Font Size**: Make text larger or smaller
- **Font Family**: Choose between Sans-serif, Serif, or Monospace
- **Text Color**: Use the color picker or adjust with Ctrl/Cmd+[/]
- **Margins**: Adjust Top, Bottom, Left, Right margins to position text

**Advanced Features:**
- **Mirror Text**: Enable for teleprompter glass setups
- **Blur Background**: Add blur effect behind text
- **Focus Band**: Highlight a specific reading area
- **Click-Through Mode**: Make window non-interactive (see below)

### Starting Your Teleprompter

1. **Set Countdown** (optional):
   - Enter seconds in "Countdown" field
   - Gives you time to get ready before text starts scrolling

2. **Start Scrolling**:
   - Click the **"Play"** button, or
   - Press **Ctrl/Cmd+Space**

3. **Control Playback**:
   - **Pause**: Click "Pause" or press Ctrl/Cmd+Space again
   - **Stop**: Press **Escape** key
   - **Speed up/down**: Ctrl/Cmd+Up/Down arrows

### Using Click-Through Mode

Click-through mode makes the teleprompter transparent to mouse clicks:

1. **Enable Click-Through**:
   - Check the "Click-Through" checkbox in controls

2. **When to Use**:
   - You can now click "through" the teleprompter to interact with apps behind it
   - Perfect for recording videos or presentations

3. **Accessing Controls**:
   - Press **Ctrl/Cmd+I** to toggle click-through OFF temporarily
   - Adjust settings, then press **Ctrl/Cmd+I** again to re-enable
   - Or press **Escape** to show/hide the control panel

### Saving Profiles

Create profiles for different use cases (e.g., "Video Recording", "Live Speech"):

1. Configure your preferred settings
2. Enter a name in "Profile Name" field
3. Click **"Save Profile"**
4. Load anytime from the dropdown menu

### Session Restore

- Your last text and scroll position are automatically saved
- When you reopen the app, it resumes where you left off

## Keyboard Shortcuts

Global shortcuts work even when the app isn't focused:

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+Space` | Play/Pause |
| `Ctrl/Cmd+Up` | Increase speed (+10 WPM) |
| `Ctrl/Cmd+Down` | Decrease speed (-10 WPM) |
| `Ctrl/Cmd+[` | Darken text color |
| `Ctrl/Cmd+]` | Lighten text color |
| `Ctrl/Cmd+I` | Toggle click-through (when enabled, use this to interact with controls) |
| `Escape` | Stop playback or toggle controls |

## Troubleshooting

### "Cannot read properties of undefined" Errors

If you see console errors like `Cannot read properties of undefined (reading 'transformCallback')`:
- Make sure you're running the app with `npm run tauri dev` (not `npm run dev`)
- The app requires the Tauri runtime to function properly

### App Won't Start / Build Fails

**Windows:**
- Ensure Visual Studio C++ Build Tools are installed
- Try running as Administrator if you get permission errors

**macOS:**
- Install Xcode Command Line Tools: `xcode-select --install`
- Grant accessibility permissions in System Preferences for global shortcuts

**Linux:**
- Install all required system libraries (see Prerequisites)
- On Wayland, some features may be limited - try X11 if possible

### Global Shortcuts Not Working

**macOS:**
- Go to System Preferences → Security & Privacy → Accessibility
- Grant permission to the Teleprompter app

**Linux:**
- Ensure you have the required permissions
- On Wayland, global shortcuts may not work - use X11

**Windows:**
- Shortcuts should work by default
- Check that no other app is using the same shortcuts

### Click-Through Mode Issues

- If you can't interact with controls: Press **Ctrl/Cmd+I** to toggle click-through off
- Press **Escape** to show the control panel
- Disable "Click-Through" checkbox if you want permanent mouse access

### Text Color/Opacity Issues

- If text appears too dark or invisible:
  - Use the color picker to select a brighter color
  - Press Ctrl/Cmd+] to lighten the text
  - Check that background blur isn't obscuring the text

### Performance Issues

- Reduce blur intensity if scrolling is slow
- Use a simpler font family
- Decrease font size for better performance

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

- `npm run dev`: Start Vite development server (browser only - Tauri APIs won't work)
- `npm run build`: Build frontend for production
- `npm run tauri dev`: Run application in development mode (recomcargomended)
- `npm run tauri build`: Build application for production

## Troubleshooting

### "Cannot read properties of undefined" Errors

If you see errors like:
```
Cannot read properties of undefined (reading 'transformCallback')
Cannot read properties of undefined (reading 'invoke')
```

**Solution**: You're running the app in a browser instead of the Tauri app. The Tauri APIs are only available when running the actual desktop application.

**Fix**: Use `npm run tauri dev` instead of `npm run dev`

The Tauri plugins (global shortcuts, file system, store, etc.) only work in the native application context, not in a browser.

### Global Shortcuts Not Working on macOS

On macOS, you may need to grant accessibility permissions:
1. Go to System Preferences > Security & Privacy > Privacy > Accessibility
2. Add your terminal application or the Teleprompter app to the list
3. Restart the application

### Wayland Support

On Linux with Wayland, some features like window positioning and click-through may not work properly due to Wayland's security model. Consider using X11 for full functionality.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Framework for building desktop applications
- [React](https://react.dev/) - UI library
- [Vite](https://vite.dev/) - Build tool
