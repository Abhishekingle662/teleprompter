import { useState, useRef, useEffect } from "react";
import { Settings } from "../types";

/** Measures average word width in pixels for the given font using Canvas 2D. */
function measureAvgWordWidth(fontFamily: string, fontSize: number): number {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return fontSize * 3;
    ctx.font = `${fontSize}px ${fontFamily}`;
    const samples = [
      "the", "and", "that", "have", "for", "not", "with", "you",
      "this", "but", "his", "from", "they", "say", "her", "she",
      "will", "one", "all", "would",
    ];
    const total = samples.reduce((sum, w) => sum + ctx.measureText(w + " ").width, 0);
    return total / samples.length;
  } catch {
    return fontSize * 3;
  }
}

interface UseScrollEngineOptions {
  isPlaying: boolean;
  isCountingDown: boolean;
  settings: Settings;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useScrollEngine({
  isPlaying,
  isCountingDown,
  settings,
  containerRef,
}: UseScrollEngineOptions) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  // rAF-based scroll — frame-accurate, no setInterval drift.
  useEffect(() => {
    if (isPlaying && !isCountingDown) {
      const avgWordWidth = measureAvgWordWidth(settings.font_family, settings.font_size);
      const pixelsPerSecond = (settings.wpm / 60) * avgWordWidth;

      const tick = (timestamp: number) => {
        if (lastFrameTimeRef.current === null) lastFrameTimeRef.current = timestamp;
        const delta = (timestamp - lastFrameTimeRef.current) / 1000;
        lastFrameTimeRef.current = timestamp;
        setScrollPosition((prev) => prev + pixelsPerSecond * delta);
        rafRef.current = requestAnimationFrame(tick);
      };

      lastFrameTimeRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameTimeRef.current = null;
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameTimeRef.current = null;
    };
  }, [isPlaying, isCountingDown, settings.wpm, settings.font_size, settings.font_family]);

  // Apply scroll position to DOM and track progress.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = scrollPosition;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll > 0) setScrollProgress((scrollPosition / maxScroll) * 100);
  }, [scrollPosition, containerRef]);

  return { scrollPosition, setScrollPosition, scrollProgress };
}
