import { NextResponse } from "next/server";

import {
  advanceReadyBrackets,
  buildSnapshot,
  findCurrentPublicBracket,
  listBracketHistory,
} from "@/lib/workquiz/bracket";
import { DEFAULT_LANDING_HISTORY } from "@/lib/workquiz/landing-history";

export const dynamic = "force-dynamic";

export async function GET() {
  await advanceReadyBrackets(new Date());
  const bracket = await findCurrentPublicBracket();
  const snapshot = bracket ? buildSnapshot(bracket) : null;
  const live = snapshot?.rounds.some((round) => round.status === "live") ?? false;
  const history = (await listBracketHistory(6)).map((item) => ({
    topic: item.title,
    winner: item.winnerName,
    tournamentDate: item.tournamentDate,
    runners: item.entrantNames,
  }));

  return NextResponse.json(
    {
      live,
      hasCurrentBracket: bracket !== null,
      currentTitle: bracket?.title ?? null,
      currentUrl: "/voting",
      adminUrl: "/admin",
      history: history.length > 0 ? history : DEFAULT_LANDING_HISTORY,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    },
  );
}
