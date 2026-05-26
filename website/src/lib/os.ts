export type OS = "windows" | "macos" | "linux" | "unknown";

export const OS_LABELS: Record<OS, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  unknown: "your platform",
};

/** A single downloadable file from a GitHub release. */
export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

/**
 * Best-effort OS detection from the browser. `userAgentData` is preferred where
 * available (Chromium); falls back to the userAgent/platform strings elsewhere.
 * Android is deliberately excluded from "linux" since we don't ship for it.
 */
export function detectOS(): OS {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = (nav.userAgentData?.platform || navigator.platform || "").toLowerCase();
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("android")) return "unknown";
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  if (platform.includes("mac") || ua.includes("macintosh") || ua.includes("mac os")) return "macos";
  if (platform.includes("linux") || ua.includes("linux") || ua.includes("x11")) return "linux";
  return "unknown";
}

/** File extensions (lowercased) that map to each downloadable OS. */
const OS_EXTENSIONS: Record<Exclude<OS, "unknown">, string[]> = {
  windows: [".msi", ".exe"],
  macos: [".dmg", ".app.tar.gz"],
  linux: [".appimage", ".deb", ".rpm"],
};

/** Human label for a given asset, derived from its file extension. */
export function assetKindLabel(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".msi")) return "Windows Installer (.msi)";
  if (n.endsWith(".exe")) return "Windows Setup (.exe)";
  if (n.endsWith(".dmg")) return "macOS Disk Image (.dmg)";
  if (n.endsWith(".app.tar.gz")) return "macOS App (.tar.gz)";
  if (n.endsWith(".appimage")) return "Linux (AppImage)";
  if (n.endsWith(".deb")) return "Debian / Ubuntu (.deb)";
  if (n.endsWith(".rpm")) return "Fedora / RHEL (.rpm)";
  return name;
}

function matchesOS(name: string, os: Exclude<OS, "unknown">): boolean {
  const n = name.toLowerCase();
  return OS_EXTENSIONS[os].some((ext) => n.endsWith(ext));
}

export type AssetsByOS = Record<Exclude<OS, "unknown">, ReleaseAsset[]>;

/** Partition release assets into Windows / macOS / Linux buckets. */
export function groupAssetsByOS(assets: ReleaseAsset[]): AssetsByOS {
  return {
    windows: assets.filter((a) => matchesOS(a.name, "windows")),
    macos: assets.filter((a) => matchesOS(a.name, "macos")),
    linux: assets.filter((a) => matchesOS(a.name, "linux")),
  };
}

/** "12.4 MB" style size from a byte count. */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
