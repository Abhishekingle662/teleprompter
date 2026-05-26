import { ASSETS_BY_OS, RELEASE_NOTES_URL, VERSION } from "../data/release";
import type { AssetsByOS } from "../lib/os";

export const OWNER = "Abhishekingle662";
export const REPO = "teleprompter";
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
// Prefer a public notes link; fall back to the repo's releases page (which is
// only reachable by collaborators while the repo is private).
export const RELEASES_URL = RELEASE_NOTES_URL || `${REPO_URL}/releases`;

export interface LatestRelease {
  /** The current version/tag, e.g. "v0.3.0". Baked in, so always present. */
  version: string | null;
  /** Where "release notes / all releases" links point. */
  htmlUrl: string;
  assetsByOS: AssetsByOS | null;
  loading: boolean;
  error: boolean;
}

/**
 * Returns the release info from the static manifest in {@link file://../data/release.ts}.
 * It used to query the GitHub Releases API, but that 404s for a PRIVATE repo, so
 * the data is now baked at build time — the version and downloads stay reachable
 * to anonymous visitors. To switch back to live API fetching (only viable once
 * the repo/releases are public), restore a fetch to
 * `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`.
 */
export function useLatestRelease(): LatestRelease {
  return {
    version: VERSION,
    htmlUrl: RELEASES_URL,
    assetsByOS: ASSETS_BY_OS,
    loading: false,
    error: false,
  };
}
