import { notFound } from "next/navigation";

import { BracketClient } from "@/components/BracketClient";
import { getOrCreateBrowserToken } from "@/lib/workquiz/auth";
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

  const browserToken = await getOrCreateBrowserToken();
  const snapshot = buildSnapshot(bracket, { browserToken });

  return (
    <main className="shell bracket-shell">
      <BracketClient initialSnapshot={snapshot} mode="public" token={publicToken} />
    </main>
  );
}
