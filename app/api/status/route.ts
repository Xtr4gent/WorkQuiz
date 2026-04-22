import { NextResponse } from "next/server";

import {
  advanceReadyBrackets,
  buildSnapshot,
  findCurrentPublicBracket,
  listBracketHistory,
} from "@/lib/workquiz/bracket";

export const dynamic = "force-dynamic";

export async function GET() {
  advanceReadyBrackets(new Date());
  const bracket = findCurrentPublicBracket();
  const snapshot = bracket ? buildSnapshot(bracket) : null;
  const live = snapshot?.rounds.some((round) => round.status === "live") ?? false;

  return NextResponse.json(
    {
      live,
      hasCurrentBracket: bracket !== null,
      currentTitle: bracket?.title ?? null,
      currentUrl: "/current",
      adminUrl: "/admin-login",
      history: listBracketHistory(6).map((item) => ({
        topic: item.title,
        winner: item.winnerName,
        runners: item.entrantNames,
      })),
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    },
  );
}
