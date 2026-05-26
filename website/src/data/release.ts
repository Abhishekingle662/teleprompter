import type { AssetsByOS, ReleaseAsset } from "../lib/os";

/**
 * Static release manifest — the website's source of truth for the version and
 * downloads. Baked in at build time ON PURPOSE: the code repo is PRIVATE, so the
 * GitHub Releases API and release-asset URLs require authentication and return
 * 404 to anonymous visitors. A static manifest keeps the version, tag, and
 * project info reachable to everyone without exposing the repo.
 *
 * To enable working download buttons, host the installers at a PUBLICLY
 * reachable location and either set DOWNLOAD_BASE (if all files share one base
 * URL) or paste full per-file URLs. Good public hosts:
 *   - a separate PUBLIC GitHub repo's Release (the code stays private)
 *   - object storage (Cloudflare R2, S3, Backblaze B2, …)
 * While no URLs are set, the Download section shows the version plus a
 * "build from source" note instead of broken links — nothing 404s.
 */

/** Displayed everywhere as the current version/tag. Always reachable (static). */
export const VERSION = "v0.3.0";

/**
 * Public base URL for installer downloads, must end with "/". Leave "" until the
 * binaries are hosted publicly. Example:
 *   "https://github.com/<you>/teleprompter-releases/releases/download/v0.3.0/"
 */
export const DOWNLOAD_BASE = "";

/** Public release-notes / changelog link. A private-repo URL 404s for visitors. */
export const RELEASE_NOTES_URL = "";

/**
 * Filenames as produced by the Tauri release build (verify against your actual
 * published assets — arch suffixes vary). `url` overrides DOWNLOAD_BASE + name
 * when set, so you can point individual files anywhere.
 */
interface ManifestFile {
  name: string;
  size?: number; // bytes; omit/0 to hide the size label
  url?: string; // full public URL; falls back to DOWNLOAD_BASE + name
}

const FILES: Record<keyof AssetsByOS, ManifestFile[]> = {
  windows: [{ name: "Teleprompter_0.3.0_x64_en-US.msi" }],
  macos: [
    { name: "Teleprompter_0.3.0_aarch64.dmg" },
    { name: "Teleprompter_0.3.0_x64.dmg" },
  ],
  linux: [
    { name: "Teleprompter_0.3.0_amd64.AppImage" },
    { name: "Teleprompter_0.3.0_amd64.deb" },
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
