interface Feature {
  icon: string;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: "🪟",
    title: "Transparent overlay",
    body: "Borderless, always-on-top, click-through. Read over your camera, OBS, or any window — clicks pass through to what's underneath.",
  },
  {
    icon: "⏱️",
    title: "WPM-accurate scroll",
    body: "Continuous scrolling whose speed maps to real words-per-minute, measured per font. Plus a karaoke mode that highlights word by word.",
  },
  {
    icon: "⌨️",
    title: "Global hotkeys",
    body: "Play, pause, nudge speed and font size from anywhere — the shortcuts work without window focus, and every binding is remappable.",
  },
  {
    icon: "📝",
    title: "Live scripts & cues",
    body: "Import .txt/.md, paste, or edit a file in your editor and watch it refresh live. Drop [CUE: label] markers and jump between them.",
  },
  {
    icon: "📱",
    title: "Phone remote",
    body: "A built-in WebSocket server lets a phone on the same Wi-Fi drive playback — play, pause, faster, slower, reset.",
  },
  {
    icon: "🤖",
    title: "AI-assisted editing",
    body: "An MCP server lets Claude or any MCP host rewrite your script on the fly — the on-screen text updates within a second.",
  },
];

export function Features() {
  return (
    <section id="features" className="section container">
      <h2 className="section-title">Everything you need to read to camera</h2>
      <p className="section-sub">
        Free and open source, on Windows, macOS, and Linux — in a sub-15 MB binary.
      </p>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <span className="feature-icon" aria-hidden="true">
              {f.icon}
            </span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
