const LINES = [
  "Welcome to the show.",
  "Today we're going to talk",
  "about a small thing that",
  "changes a lot.",
  "",
  "It's a tool, but more",
  "importantly it's a habit.",
  "",
  "You open it, paste your script,",
  "and read while looking at the lens.",
];

export function PrompterMock() {
  const scrollLines = [...LINES, ...LINES];

  return (
    <div className="prompter-mock" aria-hidden="true">
      <div className="prompter-mock-chrome">
        <span className="prompter-mock-dot" />
        <span className="prompter-mock-label">Recording</span>
        <span className="prompter-mock-spacer" />
        <span className="prompter-mock-wpm">142 WPM</span>
      </div>

      <div className="prompter-mock-viewport">
        <div className="prompter-mock-scroll">
          {scrollLines.map((line, i) => (
            <p key={i} className={line ? "" : "prompter-mock-gap"}>
              {line || "\u00A0"}
            </p>
          ))}
        </div>
        <div className="prompter-mock-band" />
        <div className="prompter-mock-band-edge prompter-mock-band-edge--top" />
        <div className="prompter-mock-band-edge prompter-mock-band-edge--bottom" />
      </div>

      <div className="prompter-mock-transport">
        <span className="prompter-mock-playing">● Playing</span>
        <span>23%</span>
      </div>
    </div>
  );
}
