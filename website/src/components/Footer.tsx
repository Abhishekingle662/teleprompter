import { REPO_URL } from "../hooks/useLatestRelease";
import { VERSION } from "../data/release";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span className="brand">▶ Teleprompter</span>
        <nav className="footer-links">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={`${REPO_URL}/blob/main/README.md`} target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href={`${REPO_URL}/blob/main/CHANGELOG.md`} target="_blank" rel="noreferrer">
            Changelog
          </a>
          <a href={`${REPO_URL}/blob/main/ROADMAP.md`} target="_blank" rel="noreferrer">
            Roadmap
          </a>
          <a href={`${REPO_URL}/tree/main/mcp-server`} target="_blank" rel="noreferrer">
            MCP server
          </a>
          <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
            MIT License
          </a>
        </nav>
        <span className="footer-fine">
          {VERSION} · Built with Tauri, React &amp; Vite. Not affiliated with any broadcast vendor.
        </span>
      </div>
    </footer>
  );
}
