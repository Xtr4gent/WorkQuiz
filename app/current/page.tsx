import { BracketClient } from "@/components/BracketClient";
import { getRememberedRosterMemberId } from "@/lib/workquiz/auth";
import { buildSnapshot, findCurrentPublicBracket } from "@/lib/workquiz/bracket";

export const dynamic = "force-dynamic";

export default async function CurrentBracketPage() {
  const bracket = findCurrentPublicBracket();

  if (!bracket) {
    return (
      <main className="shell not-found-shell">
        <section className="panel stack-md">
          <span className="eyebrow">No Live Tournament</span>
          <h1>No tournament is live right now.</h1>
          <p className="muted">
            Check back when the next bracket is marked as the current public tournament.
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
      <BracketClient initialSnapshot={snapshot} mode="public" token={bracket.publicToken} />
    </main>
  );
}
