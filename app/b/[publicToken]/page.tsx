import { notFound } from "next/navigation";

import { BracketClient } from "@/components/BracketClient";
import { getRememberedRosterMemberId } from "@/lib/workquiz/auth";
import { buildSnapshot, findBracketByPublicToken } from "@/lib/workquiz/bracket";

export default async function PublicBracketPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  const bracket = findBracketByPublicToken(publicToken);

  if (!bracket) {
    notFound();
  }

  if (bracket.status === "disabled") {
    return (
      <main className="shell not-found-shell">
        <section className="panel stack-md">
          <span className="eyebrow">Bracket Closed</span>
          <h1>This bracket is no longer available.</h1>
          <p className="muted">
            The organizer shut this one down, so this public link does not accept votes anymore.
          </p>
        </section>
      </main>
    );
  }

  const rememberedRosterMemberId = await getRememberedRosterMemberId();
  const rosterMemberId = bracket.rosterMembers.some((member) => member.id === rememberedRosterMemberId)
    ? rememberedRosterMemberId ?? undefined
    : undefined;
  const snapshot = buildSnapshot(bracket, { rosterMemberId });

  return (
    <main className="shell bracket-shell">
      <BracketClient initialSnapshot={snapshot} mode="public" token={publicToken} />
    </main>
  );
}
