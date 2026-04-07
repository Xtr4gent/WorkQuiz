import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell not-found-shell">
      <section className="panel stack-md">
        <span className="eyebrow">Missing Bracket</span>
        <h1>This link is cooked.</h1>
        <p className="muted">
          Either the bracket has not been created in this environment yet or the URL is wrong.
        </p>
        <Link className="primary-button inline-button" href="/">
          Start a new bracket
        </Link>
      </section>
    </main>
  );
}
