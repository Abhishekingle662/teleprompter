import { useEffect, useState } from "react";
import { ASSETS_BY_OS, RELEASE_NOTES_URL, VERSION } from "../data/release";
import { groupAssetsByOS, type AssetsByOS } from "../lib/os";

export const OWNER = "Abhishekingle662";
export const REPO = "teleprompter";
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
export const RELEASES_URL = RELEASE_NOTES_URL || `${REPO_URL}/releases`;

const API_LATEST = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

export interface LatestRelease {
  version: string | null;
  htmlUrl: string;
  assetsByOS: AssetsByOS;
  loading: boolean;
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

function mergeAssets(api: AssetsByOS | null): AssetsByOS {
  return {
    windows: api?.windows.length ? api.windows : ASSETS_BY_OS.windows,
    macos: api?.macos.length ? api.macos : ASSETS_BY_OS.macos,
    linux: api?.linux.length ? api.linux : ASSETS_BY_OS.linux,
  };
}

/**
 * Loads release info from the GitHub API when available, always falling back to
 * the static manifest so every platform shows working download links.
 */
export function useLatestRelease(): LatestRelease {
  const [state, setState] = useState<LatestRelease>({
    version: VERSION,
    htmlUrl: RELEASES_URL,
    assetsByOS: ASSETS_BY_OS,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(API_LATEST);
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);

        const data = (await res.json()) as GhRelease;
        if (data.draft) throw new Error("latest release is a draft");

        const apiAssets =
          data.assets.length > 0
            ? groupAssetsByOS(
                data.assets.map((a) => ({
                  name: a.name,
                  browser_download_url: a.browser_download_url,
                  size: a.size,
                })),
              )
            : null;

        if (!cancelled) {
          setState({
            version: data.tag_name,
            htmlUrl: RELEASES_URL,
            assetsByOS: mergeAssets(apiAssets),
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            version: VERSION,
            htmlUrl: RELEASES_URL,
            assetsByOS: ASSETS_BY_OS,
            loading: false,
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
