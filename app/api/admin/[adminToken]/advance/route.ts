import { NextResponse } from "next/server";

import { advanceBracket, buildSnapshot, findBracketByAdminToken } from "@/lib/workquiz/bracket";
import { publish } from "@/lib/workquiz/realtime";
import { readStore, writeStore } from "@/lib/workquiz/store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ adminToken: string }> },
) {
  const { adminToken } = await context.params;
  const bracket = findBracketByAdminToken(adminToken);

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  const store = readStore();
  const mutable = store.brackets.find((entry) => entry.id === bracket.id);
  if (!mutable) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  const liveRound = mutable.rounds.find((round) => round.status === "live");
  const nextMoment = liveRound ? new Date(new Date(liveRound.endsAt).getTime() + 1000) : new Date();
  advanceBracket(mutable, nextMoment);
  writeStore(store);
  publish(mutable.publicToken, { type: "advanced" });

  return NextResponse.json(buildSnapshot(mutable, { includeAdminUrl: true, adminToken }));
}
