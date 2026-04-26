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
    <main className="bw-admin-app">
      <nav className="bw-admin-nav" aria-label="Admin">
        <div className="bw-nav-logo">
          Bored<span>@Work</span>
        </div>
        <span className="bw-nav-badge">Admin</span>
        <div className="bw-nav-tabs">
          <a className="bw-nav-tab" href="/admin-login">
            Live
          </a>
          <a className="bw-nav-tab active" href="/setup">
            + New Tournament
          </a>
          <a className="bw-nav-tab" href="/admin-login">
            History
          </a>
        </div>
      </nav>

      <div className="bw-admin-main">
        <aside className="bw-sidebar">
          <div className="bw-sidebar-label">Live Tournament</div>
          <a className="bw-sidebar-link" href="/admin-login">
            <span>Overview</span>
          </a>
          <a className="bw-sidebar-link" href="/admin-login">
            <span>Who&apos;s Voted</span>
          </a>
          <a className="bw-sidebar-link" href="/admin-login">
            <span>Live Results</span>
          </a>
          <a className="bw-sidebar-link" href="/admin-login">
            <span>Advance Round</span>
          </a>

          <div className="bw-sidebar-label">Setup</div>
          <a className="bw-sidebar-link active" href="/setup">
            New Tournament
          </a>
          <a className="bw-sidebar-link" href="/admin-login">
            Past Tournaments
          </a>
        </aside>

        <section className="bw-admin-content">
          <div className="bw-section-panel active">
            <div className="bw-panel-title">New Tournament</div>
            <p className="bw-panel-sub">Set up a fresh bracket. Once created, share the player link.</p>
            <CreateBracketForm
              variant="admin"
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
          </div>
        </section>
      </div>
    </main>
  );
}
