import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell landing-shell">
      <section className="hero">
        <div className="hero-copy stack-lg">
          <span className="eyebrow">WorkQuiz</span>
          <h1>Turn random office debates into a real bracket night.</h1>
          <p className="hero-text">
            This is now the clean public front door. Players should use the live tournament
            link, and admins should head straight to setup when it is time to build the next bracket.
          </p>
          <div className="hero-badges">
            <span>Stable live link</span>
            <span>Separate setup surface</span>
            <span>Cleaner public flow</span>
          </div>
          <div className="hero-badges">
            <Link className="pill active" href="/current">
              View current tournament
            </Link>
            <Link className="pill" href="/setup">
              Open setup
            </Link>
          </div>
        </div>
        <section className="panel stack-lg">
          <div className="stack-sm">
            <span className="eyebrow">How It Works</span>
            <h2>Two clean surfaces now.</h2>
            <p className="muted">
              Public viewers go to the stable live route. You do your setup work on the dedicated admin setup page.
            </p>
          </div>
          <div className="link-stack">
            <div>
              <span className="muted">Player-facing live route</span>
              <code>/current</code>
            </div>
            <div>
              <span className="muted">Admin setup route</span>
              <code>/setup</code>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
