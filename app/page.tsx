import { CreateBracketForm } from "@/components/CreateBracketForm";

export default function HomePage() {
  return (
    <main className="shell landing-shell">
      <section className="hero">
        <div className="hero-copy stack-lg">
          <span className="eyebrow">WorkQuiz</span>
          <h1>Turn random office debates into a real bracket night.</h1>
          <p className="hero-text">
            The admin pastes a list, seeds the bracket, and drops one link in Teams.
            Everyone else shows up to argue about candy bars, movie villains, or the
            greatest fast food fry with live scores and a proper tournament board.
          </p>
          <div className="hero-badges">
            <span>Single elimination</span>
            <span>WebSocket live board</span>
            <span>One vote per browser</span>
          </div>
        </div>
        <CreateBracketForm />
      </section>
    </main>
  );
}
