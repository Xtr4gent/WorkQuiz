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
