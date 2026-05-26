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

const OS_ICON: Record<Exclude<OS, "unknown">, string> = {
  windows: "🪟",
  macos: "🍎",
  linux: "🐧",
};

function OsCard({
  os,
  detected,
  assets,
  loading,
}: {
  os: Exclude<OS, "unknown">;
  detected: boolean;
  assets: ReleaseAsset[] | null;
  loading: boolean;
}) {
  return (
    <div className={`dl-card${detected ? " dl-card--detected" : ""}`}>
      {detected && <span className="dl-badge">Detected</span>}
      <span className="dl-os-icon" aria-hidden="true">
        {OS_ICON[os]}
      </span>
      <h3>{OS_LABELS[os]}</h3>

      {loading ? (
        <p className="dl-muted">Loading…</p>
      ) : assets && assets.length > 0 ? (
        <ul className="dl-assets">
          {assets.map((a) => (
            <li key={a.name}>
              <a className="btn btn-small" href={a.browser_download_url}>
                {assetKindLabel(a.name)}
                {a.size ? <span className="dl-size">{formatBytes(a.size)}</span> : null}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dl-muted">
          Coming soon for {OS_LABELS[os]}.{" "}
          <a href={RELEASES_URL} target="_blank" rel="noreferrer">
            See releases
          </a>
          .
        </p>
      )}
    </div>
  );
}

export function DownloadSection({ os, release }: Props) {
  return (
    <section id="download" className="section section--download container">
      <h2 className="section-title">Download</h2>
      <p className="section-sub">
        {release.version ? (
          <>
            Latest release <strong>{release.version}</strong> · free &amp; open source (MIT)
          </>
        ) : release.error ? (
          <>
            Couldn&apos;t reach GitHub — grab the latest build from the{" "}
            <a href={RELEASES_URL} target="_blank" rel="noreferrer">
              releases page
            </a>
            .
          </>
        ) : (
          <>Fetching the latest release…</>
        )}
      </p>

      <div className="dl-grid">
        {DOWNLOAD_OSES.map((o) => (
          <OsCard
            key={o}
            os={o}
            detected={o === os}
            assets={release.assetsByOS ? release.assetsByOS[o] : null}
            loading={release.loading}
          />
        ))}
      </div>

      <p className="dl-foot">
        <a href={RELEASES_URL} target="_blank" rel="noreferrer">
          All releases &amp; changelog →
        </a>
      </p>
    </section>
  );
}
