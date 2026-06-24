import type { AssetsByOS, ReleaseAsset } from "../lib/os";

/**
 * Static release manifest — baked in at build time so anonymous visitors get
 * working links without hitting the GitHub API on every page load.
 *
 * Releases: https://github.com/Abhishekingle662/teleprompter/releases
 */

/** Displayed everywhere as the current version/tag. */
export const VERSION = "v0.3.0";

/** Public releases index (changelog / "All releases" links). */
export const RELEASE_NOTES_URL = "https://github.com/Abhishekingle662/teleprompter/releases";

/** Base URL for installer downloads from the latest published tag. */
export const DOWNLOAD_BASE =
  "https://github.com/Abhishekingle662/teleprompter/releases/download/v0.3.0/";

interface ManifestFile {
  name: string;
  size?: number;
  url?: string;
}

const FILES: Record<keyof AssetsByOS, ManifestFile[]> = {
  windows: [
    { name: "Teleprompter_0.3.0_x64_en-US.msi", size: 4018176 },
    { name: "Teleprompter_0.3.0_x64-setup.exe", size: 2600140 },
  ],
  macos: [
    { name: "Teleprompter_0.3.0_aarch64.dmg", size: 4068321 },
    { name: "Teleprompter_aarch64.app.tar.gz", size: 3979165 },
  ],
  linux: [
    { name: "Teleprompter_0.3.0_amd64.AppImage", size: 79714808 },
    { name: "Teleprompter_0.3.0_amd64.deb", size: 5296714 },
    { name: "Teleprompter-0.3.0-1.x86_64.rpm", size: 5297739 },
  ],
};

function toAssets(files: ManifestFile[]): ReleaseAsset[] {
  return files
    .map((f) => {
      const url = f.url ?? (DOWNLOAD_BASE ? DOWNLOAD_BASE + f.name : "");
      return url ? { name: f.name, browser_download_url: url, size: f.size ?? 0 } : null;
    })
    .filter((a): a is ReleaseAsset => a !== null);
}

export const ASSETS_BY_OS: AssetsByOS = {
  windows: toAssets(FILES.windows),
  macos: toAssets(FILES.macos),
  linux: toAssets(FILES.linux),
};
