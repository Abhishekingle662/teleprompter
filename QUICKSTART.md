# Teleprompter Quick Start Guide

Get up and running with the Teleprompter in 5 minutes!

## Installation

### Option 1: Download Pre-built Binary (Recommended)
1. Go to the [Releases](https://github.com/Abhishekingle662/teleprompter/releases) page
2. Download the appropriate file for your platform:
   - **Windows**: `Teleprompter_x.x.x_x64_en-US.msi`
   - **macOS**: `Teleprompter_x.x.x_x64.dmg` or `Teleprompter_x.x.x_aarch64.dmg`
   - **Linux**: `teleprompter_x.x.x_amd64.deb` or `teleprompter_x.x.x_amd64.AppImage`
3. Install/run the application

### Option 2: Build from Source
```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Or build for production
npm run tauri build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed build instructions.

## First Launch

When you first open the Teleprompter:

1. **Control panel is visible** on the right side
2. **Text area is empty** - ready for your content
3. **Default settings** are loaded

## Basic Usage (5 Steps)

### Step 1: Add Your Text

**Option A: Import a file**
```
1. Click "Import File" button
2. Select a .txt or .md file
3. Text appears in the display
```

**Option B: Paste directly**
```
1. Click in the text area
2. Paste your script (Ctrl/Cmd+V)
3. Text updates automatically
```

**Option C: Use sample**
```
1. Import the included sample.txt
2. See how the teleprompter works
3. Replace with your content later
```

### Step 2: Adjust Settings

**Recommended settings for beginners:**
- Font Size: 48-72px (adjust to your screen/distance)
- WPM: 150-180 (adjust to your reading speed)
- Margins: Top 50px, Others 50px (comfortable viewing)

**Try these adjustments:**
```
- Slide font size until comfortable
- Test with a sentence to find ideal WPM
- Adjust margins to center text
```

### Step 3: Hide Controls

```
1. Click "Hide Controls" button
2. Full screen text display appears
3. To show controls again: Click "Show Controls" or press Escape
```

### Step 4: Set Countdown (Optional)

```
1. Enter countdown time (e.g., 3 seconds)
2. Gives you time to prepare
3. Counter appears before scrolling starts
```

### Step 5: Start Reading!

```
1. Press "Play" or use Ctrl/Cmd+Space
2. Text scrolls automatically
3. Press Pause when needed
4. Press Reset to start over
```

## Essential Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/Cmd+Space` | Play/Pause |
| `Escape` | Stop or Show/Hide Controls |
| `Ctrl/Cmd+Up` | Speed Up |
| `Ctrl/Cmd+Down` | Slow Down |

## Common Use Cases

### For Video Recording

1. **Position teleprompter near camera**
   - Drag window to desired location
   - Resize if needed

2. **Adjust for visibility**
   - Increase font size if far from screen
   - Set opacity to 0.8-0.9 for subtle overlay

3. **Enable click-through**
   - Click "Enable Click-Through"
   - Window becomes non-interactive
   - Hold Ctrl/Cmd to adjust settings

4. **Hide controls**
   - Press Escape or click "Hide Controls"
   - Full-screen text view
   - Status indicator shows progress

5. **Start recording and prompting**
   - Start your camera
   - Press Ctrl/Cmd+Space to begin
   - Read naturally

### For Live Presentations

1. **Load your script**
   - Import or paste your presentation text

2. **Practice run**
   - Click Play to test
   - Adjust speed to match your pace
   - Use Reset to try again

3. **Set comfortable margins**
   - Increase top margin if you look at top of screen
   - Adjust left/right for comfortable reading

4. **Use focus band (optional)**
   - Enable focus band
   - Set position to your eye level
   - Helps maintain reading line

5. **Present with confidence**
   - Hide controls for clean view
   - Use global hotkeys to control
   - Pause if you need to ad-lib

### For Teleprompter Glass Setup

1. **Enable text mirroring**
   - Check "Mirror Text" option
   - Text flips horizontally
   - Perfect for beamsplitter glass

2. **Maximize font size**
   - Large text for distance reading
   - 100-150px recommended

3. **Increase margins**
   - Center text in viewing area
   - Account for glass positioning

4. **Adjust opacity**
   - Increase to 1.0 for maximum readability
   - Adjust based on lighting

## Tips and Tricks

### Finding Your Ideal Speed

1. Import a paragraph you know
2. Start at 150 WPM
3. Read along and adjust:
   - Too fast? Press Ctrl/Cmd+Down
   - Too slow? Press Ctrl/Cmd+Up
4. Save your preferred speed in a profile

### Saving Time with Profiles

```
1. Configure all your favorite settings
2. Click "Save Profile"
3. Name it (e.g., "Video Recording", "Live Speech")
4. Next time, just load the profile!
```

### Using Session Restore

```
- App automatically saves your position
- Close and reopen anytime
- Pick up exactly where you left off
- No need to scroll manually
```

### Reading Naturally

- Don't focus on the scroll
- Let your eyes naturally follow
- Pause when needed (Ctrl/Cmd+Space)
- Adjust speed to your comfort

### Dealing with Long Scripts

- Break into sections (use multiple files)
- Use Reset between takes
- Save session after each section
- Take breaks to maintain focus

## Troubleshooting

### Text too small/large
→ Adjust font size slider (12-200px)

### Scrolling too fast/slow
→ Use Ctrl/Cmd+Up/Down or adjust WPM slider (10-500)

### Can't see controls
→ Press Escape or click "Show Controls" button (top right)

### Window behind other windows
→ Window should always be on top (check configuration)

### Global shortcuts not working
→ On macOS: Grant accessibility permissions in System Preferences

### Text not importing
→ Ensure file is .txt or .md format with readable permissions

## Advanced Features

Once comfortable with basics, explore:

- **Focus Band**: Highlights current reading area
- **Click-Through**: Non-intrusive overlay mode
- **Blur Effect**: Creative visual effect
- **Multiple Profiles**: Different setups for different scenarios
- **Custom Margins**: Fine-tune for your screen setup

## Getting Help

- **Documentation**: See [README.md](README.md) for full features
- **Issues**: [GitHub Issues](https://github.com/Abhishekingle662/teleprompter/issues)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

## Next Steps

1. ✓ Install and launch
2. ✓ Add your first script
3. ✓ Configure basic settings
4. ✓ Test with Play/Pause
5. ⭐ Save your first profile
6. 🎬 Use in your next video/presentation!

---

**Happy prompting! 🎬**

*For more detailed information, see the [README.md](README.md) file.*
