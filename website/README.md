# Teleprompter website

The public landing + download page for the Teleprompter app, served at
**https://abhishekingle662.github.io/teleprompter/** via GitHub Pages.

It's a self-contained Vite + React + TypeScript app, independent of the desktop
app's build (the root `vite.config.ts` is Tauri-tuned and outputs to `/dist`).

## Develop

```bash
cd website
npm install
npm run dev          # local dev server
npm run build        # typecheck + production build to website/dist
npm run preview      # serve the production build locally
```

## Version & downloads (private repo)

The code repo is **private**, so the GitHub Releases API and release-asset URLs
return **404 to anonymous visitors**. The site therefore does **not** query the
API at runtime — it reads a static, build-time manifest at
**`src/data/release.ts`**, so the version/tag and project info stay reachable to
everyone. `src/lib/os.ts` maps each asset to an OS by extension
(`.msi`/`.exe` → Windows, `.dmg`/`.app.tar.gz` → macOS,
`.AppImage`/`.deb`/`.rpm` → Linux); the visitor's OS card is highlighted.

**To enable working download buttons:**
1. Host the installers somewhere **public** — a separate public GitHub repo's
   Release, or object storage (R2/S3/B2). The code repo can stay private.
2. In `src/data/release.ts`, set `DOWNLOAD_BASE` (and verify the filenames) or
   paste full per-file `url`s, set `RELEASE_NOTES_URL` to a public page, and bump
   `VERSION` each release.

Until URLs are set, the Download section shows the version and a "coming soon /
see releases" note instead of broken links — nothing 404s.

> If/when the repo (or a dedicated releases repo) is public, you can switch back
> to live API fetching — see the note in `src/hooks/useLatestRelease.ts`.

## Deploy (Vercel)

Deployed on Vercel, which builds from the (private) GitHub repo and serves the
result publicly — no paid plan needed, unlike GitHub Pages for private repos.

**One-time setup in the Vercel dashboard** (Add New → Project → import the repo):

- **Root Directory:** `website` ← important, the app lives in a subfolder
- Framework preset: **Vite** (auto-detected)
- Build command: `npm run build` · Output directory: `dist` (auto-detected)

Vercel then auto-deploys every push (production for `main`, preview URLs for
branches/PRs). After the first deploy, update the `og:url`/`og:image` domain in
`index.html` to the real Vercel (or custom) domain.

## Adding the demo video

Drop a compressed clip (ideally < 25 MB) at `website/public/demo.mp4` (and
optionally `demo-poster.png`). It renders in the hero demo slot automatically;
until then an annotated ASCII mock stands in. A social-preview image at
`website/public/og.png` (1200×630) enables the link preview card.

## Base path

`vite.config.ts` sets `base: "/"` because Vercel serves at the domain root.
(GitHub Pages project sites need `/teleprompter/` instead — not used here.)
