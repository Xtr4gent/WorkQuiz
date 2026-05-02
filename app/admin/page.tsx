import Link from "next/link";

import { BracketClient } from "@/components/BracketClient";
import { CreateBracketForm } from "@/components/CreateBracketForm";
import { buildAdminSnapshot, findBracketByAdminToken, findBracketById } from "@/lib/workquiz/bracket";

export const dynamic = "force-dynamic";

function AdminCreatePortal({
  initialTemplate,
}: {
  initialTemplate?: {
    title: string;
    entrants: string[];
    rosterMembers: string[];
    seedingMode: "manual" | "random";
    sourceTitle?: string;
  } | null;
}) {
  return (
    <main className="bw-admin-app">
      <nav className="bw-admin-nav" aria-label="Admin">
        <div className="bw-nav-logo">
          Bored<span>@Work</span>
        </div>
        <span className="bw-nav-badge">Admin</span>
        <div className="bw-nav-tabs">
          <Link className="bw-nav-tab" href="/admin">
            Live
          </Link>
          <Link className="bw-nav-tab active" href="/admin">
            + New Tournament
          </Link>
          <Link className="bw-nav-tab" href="/admin">
            History
          </Link>
        </div>
      </nav>

      <div className="bw-admin-main">
        <aside className="bw-sidebar">
          <div className="bw-sidebar-label">Live Tournament</div>
          <Link className="bw-sidebar-link" href="/admin">
            <span>Overview</span>
          </Link>
          <Link className="bw-sidebar-link" href="/admin">
            <span>Who&apos;s Voted</span>
          </Link>
          <Link className="bw-sidebar-link" href="/admin">
            <span>Live Results</span>
          </Link>
          <Link className="bw-sidebar-link" href="/admin">
            <span>Advance Round</span>
          </Link>

          <div className="bw-sidebar-label">Setup</div>
          <Link className="bw-sidebar-link active" href="/admin">
            New Tournament
          </Link>
          <Link className="bw-sidebar-link" href="/admin">
            Past Tournaments
          </Link>
        </aside>

        <section className="bw-admin-content">
          <div className="bw-section-panel active">
            <div className="bw-panel-title">New Tournament</div>
            <p className="bw-panel-sub">Set up a fresh bracket. Once created, share the player link.</p>
            <CreateBracketForm variant="admin" initialTemplate={initialTemplate} />
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ adminToken?: string; template?: string }>;
}) {
  const params = await searchParams;
  const authorizedAdmin = params.adminToken ? await findBracketByAdminToken(params.adminToken) : null;
  const templateBracket =
    authorizedAdmin && params.template ? await findBracketById(params.template) : null;

  if (params.adminToken && authorizedAdmin && !params.template) {
    const snapshot = await buildAdminSnapshot(authorizedAdmin, params.adminToken);

    return (
      <BracketClient
        adminToken={params.adminToken}
        initialSnapshot={snapshot}
        mode="admin"
        token={authorizedAdmin.publicToken}
      />
    );
  }

  return (
    <AdminCreatePortal
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
  );
}
