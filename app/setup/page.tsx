import { CreateBracketForm } from "@/components/CreateBracketForm";
import { findBracketByAdminToken, findBracketById } from "@/lib/workquiz/bracket";

export default async function SetupPage({
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
          <span className="eyebrow">WorkQuiz Setup</span>
          <h1>Set up the next office showdown.</h1>
          <p className="hero-text">
            Build the bracket, preview the board, and publish the next debate without
            digging through a public-facing player page.
          </p>
          <div className="hero-badges">
            <span>Admin setup surface</span>
            <span>Live preview</span>
            <span>Current-link control</span>
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
