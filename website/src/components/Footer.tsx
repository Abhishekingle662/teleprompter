import { REPO_URL } from "../hooks/useLatestRelease";
import { VERSION } from "../data/release";

const LINKS = [
  { href: `${REPO_URL}/blob/main/README.md`, label: "Docs" },
  { href: `${REPO_URL}/blob/main/CHANGELOG.md`, label: "Changelog" },
  { href: `${REPO_URL}/blob/main/ROADMAP.md`, label: "Roadmap" },
  { href: `${REPO_URL}/tree/main/mcp-server`, label: "MCP server" },
  { href: `${REPO_URL}/blob/main/LICENSE`, label: "MIT License" },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Teleprompter</span>
          <span className="footer-version">{VERSION}</span>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </nav>

        <p className="footer-fine">
          Built with Tauri, React &amp; Vite. Not affiliated with any broadcast vendor.
        </p>
      </div>
    </footer>
  );
}
