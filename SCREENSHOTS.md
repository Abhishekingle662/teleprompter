# Teleprompter Screenshots & Usage Guide

## Overview

The Teleprompter application provides a professional, feature-rich interface for displaying scrolling text. Since this is a development environment without a GUI, here's a detailed description of what you'll see when running the application:

## Main Interface

### Control Panel (Right Side)
The control panel appears on the right side of the window with a semi-transparent dark background. It contains:

1. **Text Section**
   - "Import File" button to load .txt or .md files
   - Large text area for pasting or editing your script

2. **Playback Controls**
   - Play/Pause button with keyboard shortcut indicator
   - Reset button to return to the beginning
   - Countdown timer input (0-10 seconds)
   - Scroll mode selector (Continuous/Karaoke)

3. **Speed Control**
   - WPM (Words Per Minute) slider (10-500)
   - Real-time display of current speed

4. **Font Settings**
   - Font family dropdown (Arial, Times New Roman, Courier New, Georgia, Verdana)
   - Font size slider (12-200px)

5. **Appearance Options**
   - Opacity slider (0.1-1.0)
   - Blur effect slider (0-10px)
   - Mirror text checkbox

6. **Margins**
   - Individual sliders for top, bottom, left, and right margins (0-300px)

7. **Focus Band**
   - Enable/disable checkbox
   - Position slider (0-100%)
   - Height slider (5-50%)

8. **Window Controls**
   - Enable/Disable Click-Through button
   - Hide Controls button
   - Save Session button

9. **Profile Management**
   - Save Profile button
   - Profile selector dropdown

### Display Area (Left/Center)
- Transparent background allowing you to see through to windows beneath
- White text displayed with your configured settings
- Optional focus band overlay (semi-transparent highlight)
- Text scrolls smoothly when playing

### Status Indicators (When Controls Hidden)
- Top-left: Playback status ("● Playing - XX%")
- Top-right: "Show Controls" button

### Countdown Overlay
- Full-screen semi-transparent overlay when countdown is active
- Large animated countdown number in the center

## Key Features in Action

### Transparent Overlay
The window has no borders and is transparent, making it ideal for:
- Overlay on video recording software
- Use with physical teleprompter hardware
- Minimal distraction during presentations

### Click-Through Mode
When enabled:
- Clicks pass through the window to applications beneath
- Hold Ctrl/Cmd while clicking to temporarily interact with controls
- Perfect for streaming/recording scenarios

### Focus Band
When enabled, displays a highlighted band across the screen:
- Helps maintain focus on the current reading line
- Adjustable position and height
- Semi-transparent cyan highlight

### Smooth Scrolling
Text scrolls continuously based on WPM setting:
- Calculated pixel-per-second rate based on font size and WPM
- 60fps smooth animation
- Instant response to speed changes

### Keyboard Shortcuts
All major functions accessible via global hotkeys:
- Work even when other applications are focused
- Ideal for hands-free operation during presentations

## Color Scheme
- Background: Transparent
- Control Panel: Dark (#000000 @ 90% opacity) with backdrop blur
- Text: White (#ffffff)
- Accents: Cyan (#61dafb)
- Buttons: Cyan with hover effects

## Responsive Design
- Control panel: Fixed 350px width, scrollable
- Text area: Responsive to window size
- All controls scale appropriately

## Platform Differences

### Windows
- Full transparency support
- All window management features work

### macOS
- Full transparency support
- May require accessibility permissions for global hotkeys
- Native window management

### Linux (X11)
- Full feature support
- Transparent window compositing

### Linux (Wayland)
- Limited window management due to Wayland security model
- Transparency may vary by compositor
- Some features may require X11 compatibility layer

## Notes for Developers
When running the application:
1. First time: Control panel is visible
2. Hide controls to see full teleprompter view
3. Press Escape or click "Show Controls" to access settings
4. Import sample.txt to test with pre-written content
