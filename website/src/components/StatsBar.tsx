const STATS = [
  { value: "~12 MB", label: "Installer size" },
  { value: "< 1 s", label: "Cold start" },
  { value: "3", label: "Platforms" },
  { value: "MIT", label: "Open source" },
];

export function StatsBar() {
  return (
    <section className="stats-bar" aria-label="Highlights">
      <div className="container stats-bar-inner">
        {STATS.map((s) => (
          <div className="stat" key={s.label}>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
