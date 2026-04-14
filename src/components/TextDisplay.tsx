import { forwardRef } from "react";
import { Settings } from "../types";

interface TextDisplayProps {
  text: string;
  settings: Settings;
  clickThrough: boolean;
  scrollMode: "continuous" | "karaoke";
  activeWordIndex: number;
}

export const TextDisplay = forwardRef<HTMLDivElement, TextDisplayProps>(
  ({ text, settings, clickThrough, scrollMode, activeWordIndex }, ref) => {
    const textStyle: React.CSSProperties = {
      fontFamily: settings.font_family,
      fontSize: `${settings.font_size}px`,
      filter: settings.blur > 0 ? `blur(${settings.blur}px)` : "none",
      transform: settings.mirror ? "scaleX(-1)" : "none",
      paddingTop: `${settings.margin_top}px`,
      paddingBottom: `${settings.margin_bottom}px`,
      paddingLeft: `${settings.margin_left}px`,
      paddingRight: `${settings.margin_right}px`,
      lineHeight: 1.5,
      whiteSpace: "pre-wrap",
      color: settings.text_color,
    };

    if (scrollMode === "karaoke") {
      return (
        <div
          className="text-container"
          ref={ref}
          style={{ pointerEvents: clickThrough ? "none" : "auto", userSelect: clickThrough ? "none" : "auto" }}
        >
          <div className="text-content" style={textStyle}>
            <KaraokeText text={text} activeWordIndex={activeWordIndex} />
          </div>
        </div>
      );
    }

    // Continuous mode — split on newlines, normalize \r\n
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    return (
      <div
        className="text-container"
        ref={ref}
        style={{ pointerEvents: clickThrough ? "none" : "auto", userSelect: clickThrough ? "none" : "auto" }}
      >
        <div className="text-content" style={textStyle}>
          {lines.map((line, index) => (
            <div key={`${index}-${line.slice(0, 20)}`} className="text-line">
              {line}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

TextDisplay.displayName = "TextDisplay";

// ── Karaoke word renderer ─────────────────────────────────────────────────────

interface KaraokeTextProps {
  text: string;
  activeWordIndex: number;
}

function KaraokeText({ text, activeWordIndex }: KaraokeTextProps) {
  // Tokenize into words, preserving whitespace between them.
  const tokens = text.split(/(\s+)/);
  let wordIndex = 0;

  return (
    <>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) {
          return <span key={i}>{token}</span>;
        }
        const thisWordIndex = wordIndex++;
        const isActive = thisWordIndex === activeWordIndex;
        const isPast = thisWordIndex < activeWordIndex;
        return (
          <span
            key={i}
            className={`karaoke-word${isActive ? " karaoke-word--active" : ""}${isPast ? " karaoke-word--past" : ""}`}
            data-word-index={thisWordIndex}
          >
            {token}
          </span>
        );
      })}
    </>
  );
}
