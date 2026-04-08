import { CreateBracketForm } from "@/components/CreateBracketForm";
import { findBracketByAdminToken, findBracketById } from "@/lib/workquiz/bracket";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; adminToken?: string }>;
}) {
  const params = await searchParams;
  const authorizedAdmin = params.adminToken ? findBracketByAdminToken(params.adminToken) : null;
  const templateBracket =
    authorizedAdmin && params.template ? findBracketById(params.template) : null;

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
        <CreateBracketForm
          initialTemplate={
            templateBracket
              ? {
                  title: templateBracket.title,
                  entrants: templateBracket.entrants.map((entrant) => entrant.name),
                  rosterMembers:
                    templateBracket.rosterMembers?.map((member) => member.name) ??
                    Array.from({ length: templateBracket.totalPlayers }, (_, index) => `Player ${index + 1}`),
                  seedingMode: templateBracket.seedingMode,
                  sourceTitle: templateBracket.title,
                }
              : null
          }
        />
      </section>
    </main>
  );
}
