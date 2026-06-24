import { useEffect, useState } from "react";
import { RELEASE_NOTES_URL, VERSION } from "../data/release";

export const OWNER = "Abhishekingle662";
export const REPO = "teleprompter";
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
export const RELEASES_URL = RELEASE_NOTES_URL;

const API_LATEST = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

export interface LatestRelease {
  version: string | null;
  htmlUrl: string;
  loading: boolean;
}

interface GhRelease {
  tag_name: string;
  draft: boolean;
}

/** Fetches the latest published tag from GitHub; version falls back to static. */
export function useLatestRelease(): LatestRelease {
  const [state, setState] = useState<LatestRelease>({
    version: VERSION,
    htmlUrl: RELEASES_URL,
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

        if (!cancelled) {
          setState({
            version: data.tag_name,
            htmlUrl: RELEASES_URL,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            version: VERSION,
            htmlUrl: RELEASES_URL,
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
