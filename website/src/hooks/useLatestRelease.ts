import { useEffect, useState } from "react";
import { ASSETS_BY_OS, RELEASE_NOTES_URL, VERSION } from "../data/release";
import { groupAssetsByOS, type AssetsByOS, type ReleaseAsset } from "../lib/os";

export const OWNER = "Abhishekingle662";
export const REPO = "teleprompter";
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
export const RELEASES_URL = RELEASE_NOTES_URL || `${REPO_URL}/releases`;

const API_LATEST = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

export interface LatestRelease {
  version: string | null;
  htmlUrl: string;
  assetsByOS: AssetsByOS | null;
  loading: boolean;
  error: boolean;
}

interface GhAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GhRelease {
  tag_name: string;
  draft: boolean;
  assets: GhAsset[];
}

/**
 * Fetches the latest published GitHub release at runtime so download buttons
 * always reflect what's on https://github.com/Abhishekingle662/teleprompter/releases
 * without baking asset URLs into the build. Falls back to static values if the
 * API is unreachable.
 */
export function useLatestRelease(): LatestRelease {
  const [state, setState] = useState<LatestRelease>({
    version: VERSION,
    htmlUrl: RELEASES_URL,
    assetsByOS: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(API_LATEST);
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);

        const data = (await res.json()) as GhRelease;
        if (data.draft) throw new Error("latest release is a draft");

        const assets: ReleaseAsset[] = data.assets.map((a) => ({
          name: a.name,
          browser_download_url: a.browser_download_url,
          size: a.size,
        }));

        const assetsByOS =
          assets.length > 0
            ? groupAssetsByOS(assets)
            : { windows: [], macos: [], linux: [] };

        if (!cancelled) {
          setState({
            version: data.tag_name,
            htmlUrl: RELEASES_URL,
            assetsByOS,
            loading: false,
            error: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            version: VERSION,
            htmlUrl: RELEASES_URL,
            assetsByOS: ASSETS_BY_OS,
            loading: false,
            error: true,
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
