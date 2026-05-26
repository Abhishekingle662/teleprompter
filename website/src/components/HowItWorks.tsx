interface Step {
  num: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    num: "Rust core",
    title: "Native window control",
    body: "A Tauri/Rust shell owns the things a browser can't reach — transparency, click-through, always-on-top, multi-monitor — and watches your script file for changes.",
  },
  {
    num: "Web UI",
    title: "The scroll engine",
    body: "A React renderer in the OS-native webview runs a 60 fps requestAnimationFrame loop, derives reading speed from the font, and draws the focus band.",
  },
  {
    num: "MCP",
    title: "AI through a file",
    body: "A separate MCP server writes your script file; the watcher fires and the screen refreshes. No protocol between the model and the UI — just a file on disk.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="section container">
      <h2 className="section-title">How it works</h2>
      <p className="section-sub">
        Three small pieces, each doing the one job it's best placed to do.
      </p>
      <div className="steps">
        {STEPS.map((s) => (
          <div className="step-card" key={s.num}>
            <span className="step-num">{s.num}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
