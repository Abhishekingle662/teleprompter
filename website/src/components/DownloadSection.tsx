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
    <article className={`dl-card${detected ? " dl-card--detected" : ""}`}>
      {detected && <span className="dl-badge">Your platform</span>}
      <h3>{OS_LABELS[os]}</h3>

      {loading ? (
        <p className="dl-muted">Loading…</p>
      ) : assets && assets.length > 0 ? (
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
      ) : (
        <p className="dl-muted">
          Coming soon.{" "}
          <a href={RELEASES_URL} target="_blank" rel="noreferrer">
            See releases
          </a>
        </p>
      )}
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
        </div>

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
      </div>
    </section>
  );
}
