import { useState } from "react";
import { REPO_URL } from "../hooks/useLatestRelease";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Demo" },
  { href: "#how", label: "How it works" },
  { href: "#download", label: "Download" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-nav">
      <div className="container site-nav-inner">
        <a className="brand" href="#">
          <span className="brand-mark" aria-hidden="true" />
          Teleprompter
        </a>

        <nav className="site-nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="nav-github">
            GitHub
          </a>
        </nav>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <nav className="site-nav-mobile" aria-label="Mobile">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      )}
    </header>
  );
}
