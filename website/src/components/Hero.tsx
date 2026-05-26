import { OS_LABELS, formatBytes, type OS } from "../lib/os";
import { REPO_URL, type LatestRelease } from "../hooks/useLatestRelease";

interface Props {
  os: OS;
  release: LatestRelease;
}

/**
 * Picks the single best asset to feature for the detected OS (first match wins —
 * .msi over .exe, .dmg over .tar.gz, .AppImage over .deb/.rpm).
 */
function primaryAsset(os: OS, release: LatestRelease) {
  if (os === "unknown" || !release.assetsByOS) return null;
  return release.assetsByOS[os][0] ?? null;
}

export function Hero({ os, release }: Props) {
  const asset = primaryAsset(os, release);

  return (
    <header className="hero">
      <nav className="nav container">
        <span className="brand">▶ Teleprompter</span>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#download">Download</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </nav>

      <div className="hero-body container">
        <span className="pill">
          Free · Open source · ~12 MB{release.version ? ` · ${release.version}` : ""}
        </span>
        <h1>
          A teleprompter that floats <span className="accent">on top of everything.</span>
        </h1>
        <p className="lede">
          A borderless, transparent, always-on-top overlay. Park it over your camera app or OBS and
          read a scrolling script while looking down the lens — your clicks pass straight through to
          the app underneath. Built with Tauri, so it starts in under a second.
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
            <a className="btn btn-primary" href={release.htmlUrl} target="_blank" rel="noreferrer">
              {release.loading ? "Loading downloads…" : "Get the latest release"}
              <span className="btn-sub">
                {os === "unknown" ? "Choose your platform" : `for ${OS_LABELS[os]}`}
              </span>
            </a>
          )}
          <a className="btn btn-ghost" href="#download">
            All platforms
          </a>
        </div>
      </div>
    </header>
  );
}
