interface Step {
  num: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    title: "Native window control",
    body: "A Tauri/Rust shell owns transparency, click-through, always-on-top, and multi-monitor — plus a file watcher that reloads your script when it changes on disk.",
  },
  {
    num: "02",
    title: "The scroll engine",
    body: "React in the OS-native webview runs a 60 fps requestAnimationFrame loop, derives reading speed from the font, and draws the focus band overlay.",
  },
  {
    num: "03",
    title: "AI through a file",
    body: "A separate MCP server writes scripts/current.txt; the watcher fires and the screen refreshes. No protocol between the model and the UI — just a file on disk.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="section section--alt">
      <div className="container">
        <div className="section-head">
          <span className="section-eyebrow">Architecture</span>
          <h2 className="section-title">Three pieces, each doing one job well</h2>
          <p className="section-sub">
            Tauri instead of Electron — native WebView, ~12 MB installer, sub-second startup.
          </p>
        </div>

        <ol className="steps">
          {STEPS.map((s) => (
            <li className="step-card" key={s.num}>
              <span className="step-num">{s.num}</span>
              <div className="step-body">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
