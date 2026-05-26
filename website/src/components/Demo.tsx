import { useState } from "react";

/**
 * Demo media slot. Drop a compressed clip at website/public/demo.mp4 (ideally
 * < 25 MB) and it will play here; until then, an annotated mock stands in.
 * GitHub Pages serves the file under the configured base path. If the video is
 * missing, the <source> errors and we fall back to the mock automatically.
 */
export function Demo() {
  const [hasVideo, setHasVideo] = useState(true);
  const demoSrc = `${import.meta.env.BASE_URL}demo.mp4`;
  const poster = `${import.meta.env.BASE_URL}demo-poster.png`;

  return (
    <section className="demo container" aria-label="Demo">
      <div className="demo-frame">
        {hasVideo ? (
          <video
            className="demo-video"
            controls
            playsInline
            muted
            loop
            preload="metadata"
            poster={poster}
            onError={() => setHasVideo(false)}
          >
            <source src={demoSrc} type="video/mp4" onError={() => setHasVideo(false)} />
          </video>
        ) : (
          <div className="demo-fallback" aria-hidden="true">
            <pre>
{`┌────────────────────────────────────────────┐
│   Welcome to the show. Today we're going     │
│ ▒▒ to talk about a small thing that ▒▒       │  ← focus band
│   changes a lot.                             │
│                                              │
│  ● Playing — 23%              ⌥ Inspector ⏵  │
└────────────────────────────────────────────┘`}
            </pre>
            <span className="demo-note">Demo video coming soon</span>
          </div>
        )}
      </div>
    </section>
  );
}
