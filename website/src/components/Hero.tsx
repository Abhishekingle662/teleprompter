import { OS_LABELS, formatBytes, type OS } from "../lib/os";
import { type LatestRelease } from "../hooks/useLatestRelease";
import { SiteNav } from "./SiteNav";
import { PrompterMock } from "./PrompterMock";

interface Props {
  os: OS;
  release: LatestRelease;
}

function primaryAsset(os: OS, release: LatestRelease) {
  if (os === "unknown" || !release.assetsByOS) return null;
  return release.assetsByOS[os][0] ?? null;
}

export function Hero({ os, release }: Props) {
  const asset = primaryAsset(os, release);

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
            {asset ? (
              <a className="btn btn-primary" href={asset.browser_download_url}>
                Download for {OS_LABELS[os]}
                <span className="btn-sub">
                  {release.version}
                  {asset.size ? ` · ${formatBytes(asset.size)}` : ""}
                </span>
              </a>
            ) : (
              <a className="btn btn-primary" href="#download">
                Get the app
                <span className="btn-sub">Windows · macOS · Linux</span>
              </a>
            )}
            <a className="btn btn-ghost" href="#features">
              See features
            </a>
          </div>

          <ul className="hero-tags">
            <li>Tauri + Rust</li>
            <li>Global hotkeys</li>
            <li>Phone remote</li>
            <li>AI script editing</li>
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
