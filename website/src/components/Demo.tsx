const DEMO_VIDEO_ID = "jgPhAReH34Y";
const DEMO_EMBED_URL = `https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}`;
const DEMO_WATCH_URL = `https://youtu.be/${DEMO_VIDEO_ID}`;

export function Demo() {
  return (
    <section id="demo" className="section section--demo">
      <div className="container">
        <div className="section-head">
          <span className="section-eyebrow">Demo</span>
          <h2 className="section-title">See it in action</h2>
          <p className="section-sub">
            Park the overlay over your camera or streaming setup and read while looking down the lens.
          </p>
        </div>

        <div className="demo-frame">
          <iframe
            className="demo-embed"
            src={DEMO_EMBED_URL}
            title="Teleprompter demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>

        <p className="demo-foot">
          <a href={DEMO_WATCH_URL} target="_blank" rel="noreferrer">
            Watch on YouTube →
          </a>
        </p>
      </div>
    </section>
  );
}
