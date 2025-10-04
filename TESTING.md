# Testing Guide for Teleprompter

This document provides testing guidelines to verify that all features work correctly on your platform.

## Prerequisites for Testing

Before testing, ensure:
- Application is built successfully
- You have a test text file (use included `sample.txt`)
- You understand basic keyboard shortcuts

## Test Checklist

### 1. Installation & Launch ✓

**Test Steps:**
1. Install/run the application
2. Application window appears
3. Control panel is visible on the right
4. No error messages displayed

**Expected Result:**
- Borderless window with transparent background
- Control panel visible with all sections
- Text area empty and ready for input

---

### 2. Text Input ✓

#### Test 2a: Import File
**Steps:**
1. Click "Import File"
2. Select `sample.txt`
3. Observe text display

**Expected:**
- File picker opens
- Text loads and displays
- Text is white on transparent background

#### Test 2b: Paste Text
**Steps:**
1. Copy text to clipboard
2. Click in text area
3. Paste (Ctrl/Cmd+V)

**Expected:**
- Text appears in text area
- Display updates immediately
- All characters visible

#### Test 2c: Direct Entry
**Steps:**
1. Click in text area
2. Type some text
3. Observe display

**Expected:**
- Text appears as typed
- Display updates in real-time

---

### 3. Window Properties ✓

#### Test 3a: Transparency
**Steps:**
1. Move window over another application
2. Observe background

**Expected:**
- Background is transparent
- Can see through to windows beneath
- Text remains clearly visible

#### Test 3b: Always-on-Top
**Steps:**
1. Click on another application
2. Observe teleprompter window

**Expected:**
- Teleprompter stays visible
- Remains on top of other windows
- Doesn't get hidden

#### Test 3c: Borderless
**Steps:**
1. Observe window edges
2. Try to find title bar

**Expected:**
- No window decorations
- No title bar
- Clean edges

---

### 4. Playback Controls ✓

#### Test 4a: Play/Pause Button
**Steps:**
1. Load text
2. Click "Play"
3. Observe scrolling
4. Click "Pause"

**Expected:**
- Text scrolls smoothly when playing
- Scrolling stops when paused
- Button text updates

#### Test 4b: Global Hotkey
**Steps:**
1. Click on another application (teleprompter loses focus)
2. Press Ctrl/Cmd+Space
3. Observe teleprompter

**Expected:**
- Playback toggles even without focus
- Works from any application
- Immediate response

#### Test 4c: Reset Button
**Steps:**
1. Start playback and let it scroll
2. Click "Reset"
3. Observe position

**Expected:**
- Scroll position returns to top
- Text at original position
- Settings unchanged

---

### 5. Speed Control ✓

#### Test 5a: WPM Slider
**Steps:**
1. Set WPM to 100
2. Start playback and observe speed
3. Set WPM to 300
4. Observe speed change

**Expected:**
- Lower WPM = slower scrolling
- Higher WPM = faster scrolling
- Speed changes in real-time
- Smooth at all speeds

#### Test 5b: Speed Hotkeys
**Steps:**
1. Start playback
2. Press Ctrl/Cmd+Up several times
3. Observe speed increase
4. Press Ctrl/Cmd+Down several times
5. Observe speed decrease

**Expected:**
- Each press changes speed by 10 WPM
- Changes apply immediately
- Works without focusing window

---

### 6. Font Customization ✓

#### Test 6a: Font Family
**Steps:**
1. Try each font family option
2. Observe text display

**Expected:**
- Font changes immediately
- All fonts render correctly
- Text remains readable

#### Test 6b: Font Size
**Steps:**
1. Set size to 12px
2. Observe text
3. Set size to 200px
4. Observe text

**Expected:**
- Small text legible
- Large text fills screen
- Smooth transitions
- No layout breaking

---

### 7. Appearance ✓

#### Test 7a: Opacity
**Steps:**
1. Set opacity to 1.0 (fully opaque)
2. Observe text
3. Set opacity to 0.5
4. Observe text
5. Set opacity to 0.1
6. Observe text

**Expected:**
- Text becomes more/less transparent
- Window opacity changes accordingly
- Text always somewhat visible

#### Test 7b: Opacity Hotkeys
**Steps:**
1. Press Ctrl/Cmd+Shift+O multiple times
2. Press Ctrl/Cmd+Shift+P multiple times

**Expected:**
- Opacity decreases with O
- Opacity increases with P
- Changes are smooth
- Works without focus

#### Test 7c: Blur Effect
**Steps:**
1. Set blur to 0
2. Set blur to 5
3. Set blur to 10

**Expected:**
- 0 = sharp text
- Higher values = more blur
- Effect is smooth
- Performance remains good

#### Test 7d: Mirror Text
**Steps:**
1. Enable mirror checkbox
2. Observe text
3. Disable mirror
4. Observe text

**Expected:**
- Enabled = horizontally flipped
- Disabled = normal orientation
- Instant change
- All text mirrored

---

### 8. Margins ✓

**Test Steps:**
1. Set top margin to 200px
2. Set bottom margin to 100px
3. Set left margin to 150px
4. Set right margin to 150px
5. Start playback and observe

**Expected:**
- Text respects all margins
- Spacing visible on all sides
- Scrolling smooth within margins
- No text cutoff

---

### 9. Focus Band ✓

#### Test 9a: Enable/Disable
**Steps:**
1. Enable focus band
2. Observe display
3. Disable focus band
4. Observe display

**Expected:**
- Enabled = cyan band visible
- Disabled = band disappears
- Instant toggle

#### Test 9b: Position
**Steps:**
1. Enable focus band
2. Set position to 0%
3. Set position to 50%
4. Set position to 100%

**Expected:**
- Band moves vertically
- Position reflects percentage
- Smooth movement

#### Test 9c: Height
**Steps:**
1. Set height to 5%
2. Set height to 50%

**Expected:**
- Band height changes
- Proportional to viewport
- Remains visible

---

### 10. Click-Through ✓

#### Test 10a: Enable Click-Through
**Steps:**
1. Enable click-through
2. Try clicking the text area
3. Try clicking buttons

**Expected:**
- Clicks pass through text
- Cannot interact with window
- Window remains visible

#### Test 10b: Hold-to-Interact
**Steps:**
1. Ensure click-through is enabled
2. Hold Ctrl/Cmd
3. Click on controls
4. Release Ctrl/Cmd

**Expected:**
- Can interact while holding modifier
- Interaction works normally
- Returns to click-through on release

---

### 11. Countdown ✓

**Test Steps:**
1. Set countdown to 5 seconds
2. Click "Play"
3. Observe countdown
4. Wait for scrolling to start

**Expected:**
- Large countdown number appears
- Counts down from 5 to 0
- Scrolling starts after countdown
- Smooth transition

---

### 12. Control Visibility ✓

#### Test 12a: Hide Controls
**Steps:**
1. Click "Hide Controls"
2. Observe window

**Expected:**
- Control panel disappears
- Text area uses full window
- "Show Controls" button visible

#### Test 12b: Show Controls
**Steps:**
1. Click "Show Controls" button
2. Observe window

**Expected:**
- Control panel reappears
- All settings visible
- Position unchanged

#### Test 12c: Escape Key
**Steps:**
1. Hide controls
2. Press Escape
3. Press Escape again

**Expected:**
- First press shows controls
- Second press hides controls
- If playing, stops instead

---

### 13. Profile Management ✓

#### Test 13a: Save Profile
**Steps:**
1. Configure custom settings
2. Click "Save Profile"
3. Enter profile name "Test1"
4. Confirm

**Expected:**
- Profile saved
- Name appears in dropdown
- Settings stored

#### Test 13b: Load Profile
**Steps:**
1. Change some settings
2. Select "Test1" from dropdown
3. Observe settings

**Expected:**
- Settings revert to saved values
- All parameters restored
- Text unchanged

#### Test 13c: Multiple Profiles
**Steps:**
1. Save profile "Fast"
2. Save profile "Slow"
3. Load each profile

**Expected:**
- Multiple profiles saved
- Each profile loads correctly
- No conflicts

---

### 14. Session Restore ✓

#### Test 14a: Manual Save
**Steps:**
1. Load text and scroll halfway
2. Click "Save Session"
3. Close application
4. Reopen application

**Expected:**
- Text restored
- Scroll position restored
- Settings preserved

#### Test 14b: Auto Save
**Steps:**
1. Load text and let it scroll
2. Close application
3. Reopen immediately

**Expected:**
- Last state restored
- Text at last position
- Ready to continue

---

### 15. Platform-Specific Tests

#### Windows
- [ ] Transparency works
- [ ] Global shortcuts work
- [ ] Click-through works
- [ ] File picker works
- [ ] No performance issues

#### macOS
- [ ] Transparency works
- [ ] Global shortcuts work (after granting permissions)
- [ ] Click-through works
- [ ] File picker works
- [ ] Native look and feel

#### Linux (X11)
- [ ] Transparency works
- [ ] Global shortcuts work
- [ ] Click-through works
- [ ] File picker works
- [ ] Compositor compatibility

#### Linux (Wayland)
- [ ] Basic functionality works
- [ ] Note limitations
- [ ] Fallback behaviors work
- [ ] Consider X11 compatibility mode

---

## Performance Tests

### Smooth Scrolling
**Test:**
1. Load large text (5000+ words)
2. Set WPM to 300
3. Start playback
4. Observe for 2 minutes

**Expected:**
- Smooth scrolling throughout
- No stuttering or lag
- Consistent speed
- Low CPU usage

### Multiple Operations
**Test:**
1. Start playback
2. Change speed while playing
3. Adjust opacity while playing
4. Change font size while playing

**Expected:**
- All operations work simultaneously
- No lag or freeze
- Smooth transitions
- No crashes

---

## Edge Cases

### Empty Text
**Test:**
1. Don't load any text
2. Try playing

**Expected:**
- No error
- Nothing scrolls
- Controls still work

### Very Long Text
**Test:**
1. Load/paste 10,000+ words
2. Try all features

**Expected:**
- All features work
- Performance acceptable
- Scrolling smooth
- Memory usage reasonable

### Extreme Settings
**Test:**
1. Set font size to 200px
2. Set all margins to 300px
3. Try playback

**Expected:**
- Settings applied correctly
- No layout breaking
- Still usable

### Rapid Changes
**Test:**
1. Rapidly click play/pause
2. Rapidly change speed
3. Rapidly change opacity

**Expected:**
- No crashes
- Responds to all inputs
- Smooth operation
- No conflicts

---

## Bug Reporting

If you find issues during testing:

1. **Note the issue:**
   - What were you doing?
   - What happened?
   - What should have happened?

2. **Reproduction steps:**
   - List exact steps to reproduce
   - Include settings used
   - Note platform and version

3. **Environment:**
   - OS and version
   - Display/compositor info
   - Any error messages

4. **Submit:**
   - Open GitHub issue
   - Include all above information
   - Add screenshots if relevant

---

## Automated Testing

For developers, consider adding:
- Unit tests for React components
- Integration tests for Tauri commands
- E2E tests for critical workflows
- Performance benchmarks

See [CONTRIBUTING.md](CONTRIBUTING.md) for development testing guidelines.

---

**Happy Testing! 🧪**
