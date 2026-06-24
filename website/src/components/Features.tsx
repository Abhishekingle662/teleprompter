interface Feature {
  icon: string;
  title: string;
  body: string;
  wide?: boolean;
}

const FEATURES: Feature[] = [
  {
    icon: "◻",
    title: "Transparent overlay",
    body: "Borderless, always-on-top, click-through. Read over your camera, OBS, or any window — hold Ctrl when you need to interact with the prompter itself.",
    wide: true,
  },
  {
    icon: "▶",
    title: "WPM-accurate scroll",
    body: "Continuous scrolling mapped to real words-per-minute via Canvas measureText. Karaoke mode highlights word by word.",
  },
  {
    icon: "⌨",
    title: "Global hotkeys",
    body: "Play, pause, nudge speed and font size from anywhere — shortcuts work without window focus, and every binding is remappable.",
  },
  {
    icon: "↻",
    title: "Live scripts & cues",
    body: "Import .txt/.md, paste, or edit in your editor and watch it refresh live. [CUE: label] markers with Ctrl+N / Ctrl+P navigation.",
  },
  {
    icon: "◎",
    title: "Phone remote",
    body: "Built-in WebSocket server on your LAN — play, pause, faster, slower, reset from any phone browser.",
  },
  {
    icon: "✦",
    title: "AI-assisted editing",
    body: "MCP server lets Claude or ChatGPT rewrite your script on the fly. The on-screen text updates within a second.",
    wide: true,
  },
];

export function Features() {
  return (
    <section id="features" className="section">
      <div className="container">
        <div className="section-head">
          <span className="section-eyebrow">Features</span>
          <h2 className="section-title">Built for recording, not just reading</h2>
          <p className="section-sub">
            Everything a creator needs in a sub-15 MB binary — free on Windows, macOS, and Linux.
          </p>
        </div>

        <div className="feature-bento">
          {FEATURES.map((f) => (
            <article
              className={`feature-card${f.wide ? " feature-card--wide" : ""}`}
              key={f.title}
            >
              <span className="feature-icon" aria-hidden="true">
                {f.icon}
              </span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
