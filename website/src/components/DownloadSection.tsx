import {
  OS_LABELS,
  assetKindLabel,
  formatBytes,
  type OS,
  type ReleaseAsset,
} from "../lib/os";
import { RELEASES_URL, type LatestRelease } from "../hooks/useLatestRelease";

interface Props {
  os: OS;
  release: LatestRelease;
}

const DOWNLOAD_OSES: Exclude<OS, "unknown">[] = ["windows", "macos", "linux"];

const PLATFORM_FORMATS: Record<Exclude<OS, "unknown">, string> = {
  windows: ".msi · .exe",
  macos: ".dmg · .app.tar.gz",
  linux: "AppImage · .deb · .rpm",
};

function OsCard({
  os,
  detected,
  assets,
  loading,
}: {
  os: Exclude<OS, "unknown">;
  detected: boolean;
  assets: ReleaseAsset[];
  loading: boolean;
}) {
  return (
    <article className={`dl-card${detected ? " dl-card--detected" : ""}`}>
      {detected && <span className="dl-badge">Your platform</span>}
      <h3>{OS_LABELS[os]}</h3>

      <p className="dl-status">
        <span className="dl-status-dot" aria-hidden="true" />
        Available on GitHub Releases
      </p>
      <p className="dl-formats">{PLATFORM_FORMATS[os]}</p>

      {loading ? (
        <p className="dl-muted">Loading downloads…</p>
      ) : (
        <ul className="dl-assets">
          {assets.map((a) => (
            <li key={a.name}>
              <a className="dl-link" href={a.browser_download_url}>
                <span>{assetKindLabel(a.name)}</span>
                {a.size ? <span className="dl-size">{formatBytes(a.size)}</span> : null}
              </a>
            </li>
          ))}
        </ul>
      )}

      <a className="dl-github-link" href={RELEASES_URL} target="_blank" rel="noreferrer">
        View on GitHub Releases →
      </a>
    </article>
  );
}

export function DownloadSection({ os, release }: Props) {
  return (
    <section id="download" className="section section--download">
      <div className="container">
        <div className="section-head">
          <span className="section-eyebrow">Download</span>
          <h2 className="section-title">Get Teleprompter</h2>
          <p className="section-sub">
            {release.loading ? (
              <>Checking GitHub Releases…</>
            ) : (
              <>
                <strong>{release.version}</strong> builds for Windows, macOS, and Linux are on{" "}
                <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                  GitHub Releases
                </a>
                . Free &amp; open source (MIT).
              </>
            )}
          </p>
        </div>

        <div className="dl-grid">
          {DOWNLOAD_OSES.map((o) => (
            <OsCard
              key={o}
              os={o}
              detected={o === os}
              assets={release.assetsByOS[o]}
              loading={release.loading}
            />
          ))}
        </div>

        <p className="dl-foot">
          <a className="btn btn-primary" href={RELEASES_URL} target="_blank" rel="noreferrer">
            Open GitHub Releases
            <span className="btn-sub">{release.version ?? "Latest"} · all platforms</span>
          </a>
        </p>
      </div>
    </section>
  );
}
