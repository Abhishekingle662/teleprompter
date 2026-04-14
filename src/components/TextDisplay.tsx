import { forwardRef, useEffect, useRef, useState } from "react";
import { Settings } from "../types";

const CUE_RE = /^\[CUE:\s*(.+?)\]$/i;

/** Lines below this count render without virtualization. */
const VIRTUAL_THRESHOLD = 300;
/** Extra lines rendered above and below the visible window. */
const OVERSCAN = 25;

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

    if (lines.length <= VIRTUAL_THRESHOLD) {
      // Small script — render all lines directly.
      return (
        <div
          className="text-container"
          ref={ref}
          style={{ pointerEvents: clickThrough ? "none" : "auto", userSelect: clickThrough ? "none" : "auto" }}
        >
          <div className="text-content" style={textStyle}>
            {lines.map((line, index) => renderLine(line, index))}
          </div>
        </div>
      );
    }

    // Large script — use the virtual renderer.
    return (
      <VirtualTextDisplay
        ref={ref}
        lines={lines}
        textStyle={textStyle}
        clickThrough={clickThrough}
        fontSize={settings.font_size}
      />
    );
  }
);

TextDisplay.displayName = "TextDisplay";

// ── Line renderer (shared) ────────────────────────────────────────────────────

function renderLine(line: string, index: number) {
  const cueMatch = CUE_RE.exec(line.trim());
  if (cueMatch) {
    return (
      <div
        key={`${index}-cue`}
        className="cue-marker"
        data-cue-line={index}
      >
        ▶ {cueMatch[1]}
      </div>
    );
  }
  return (
    <div key={`${index}-${line.slice(0, 20)}`} className="text-line">
      {line}
    </div>
  );
}

// ── Virtual renderer ──────────────────────────────────────────────────────────

interface VirtualTextDisplayProps {
  lines: string[];
  textStyle: React.CSSProperties;
  clickThrough: boolean;
  fontSize: number;
}

const VirtualTextDisplay = forwardRef<HTMLDivElement, VirtualTextDisplayProps>(
  ({ lines, textStyle, clickThrough, fontSize }, ref) => {
    // Estimated height per line: font_size * line-height (1.5).
    const lineHeight = fontSize * 1.5;

    const [scrollTop, setScrollTop] = useState(0);
    const innerRef = useRef<HTMLDivElement>(null);

    // Sync the forwarded ref with our inner ref so the scroll engine can drive scrollTop.
    useEffect(() => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(innerRef.current);
      } else {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = innerRef.current;
      }
    });

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const onScroll = () => setScrollTop(el.scrollTop);
      el.addEventListener("scroll", onScroll, { passive: true });
      return () => el.removeEventListener("scroll", onScroll);
    }, []);

    // Compute the visible window with overscan.
    const containerHeight = innerRef.current?.clientHeight ?? 600;
    const firstVisible = Math.max(0, Math.floor(scrollTop / lineHeight) - OVERSCAN);
    const lastVisible = Math.min(
      lines.length - 1,
      Math.ceil((scrollTop + containerHeight) / lineHeight) + OVERSCAN
    );

    const paddingTop = firstVisible * lineHeight;
    const paddingBottom = (lines.length - 1 - lastVisible) * lineHeight;

    return (
      <div
        className="text-container"
        ref={innerRef}
        style={{ pointerEvents: clickThrough ? "none" : "auto", userSelect: clickThrough ? "none" : "auto" }}
      >
        <div className="text-content" style={textStyle}>
          {/* Top spacer */}
          {paddingTop > 0 && <div style={{ height: paddingTop }} aria-hidden />}

          {lines.slice(firstVisible, lastVisible + 1).map((line, i) =>
            renderLine(line, firstVisible + i)
          )}

          {/* Bottom spacer */}
          {paddingBottom > 0 && <div style={{ height: paddingBottom }} aria-hidden />}
        </div>
      </div>
    );
  }
);

VirtualTextDisplay.displayName = "VirtualTextDisplay";

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
