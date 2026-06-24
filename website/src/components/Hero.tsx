import { OS_LABELS, type OS } from "../lib/os";
import { RELEASES_URL, type LatestRelease } from "../hooks/useLatestRelease";
import { SiteNav } from "./SiteNav";
import { PrompterMock } from "./PrompterMock";

interface Props {
  os: OS;
  release: LatestRelease;
}

export function Hero({ os, release }: Props) {
  const osLabel = os === "unknown" ? "GitHub" : OS_LABELS[os];

  return (
    <section className="hero">
      <SiteNav />

      <div className="container hero-grid">
        <div className="hero-content">
          <span className="pill">
            Free · Open source
            {release.version ? ` · ${release.version}` : ""}
          </span>

          <h1>
            Read your script.{" "}
            <span className="accent">Look at the lens.</span>
          </h1>

          <p className="lede">
            A borderless, transparent overlay that floats above your camera app or OBS.
            Clicks pass through to whatever is underneath — so you can scroll, pause,
            and nudge speed without breaking your recording flow.
          </p>

          <div className="hero-cta">
            <a className="btn btn-primary" href={RELEASES_URL} target="_blank" rel="noreferrer">
              Download for {osLabel}
              <span className="btn-sub">
                {release.version ?? "Latest"} · GitHub Releases
              </span>
            </a>
            <a className="btn btn-ghost" href="#download">
              All platforms
            </a>
          </div>

          <ul className="hero-tags">
            <li>Available on GitHub Releases</li>
            <li>Tauri + Rust</li>
            <li>Global hotkeys</li>
            <li>Phone remote</li>
          </ul>
        </div>

        <div className="hero-visual">
          <PrompterMock />
          <p className="hero-visual-caption">Transparent overlay over your camera feed</p>
        </div>
      </div>
    </section>
  );
}
