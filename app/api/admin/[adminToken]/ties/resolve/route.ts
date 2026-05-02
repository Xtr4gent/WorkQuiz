import { NextResponse } from "next/server";

import { buildAdminSnapshot, resolveTieBreaker } from "@/lib/workquiz/bracket";

export async function POST(
  request: Request,
  context: { params: Promise<{ adminToken: string }> },
) {
  const { adminToken } = await context.params;
  const body = (await request.json()) as {
    matchupId?: string;
    winnerEntrantId?: string;
  };

  if (!body.matchupId || !body.winnerEntrantId) {
    return NextResponse.json(
      { error: "Matchup and winner are required." },
      { status: 400 },
    );
  }

  try {
    const bracket = await resolveTieBreaker({
      adminToken,
      matchupId: body.matchupId,
      winnerEntrantId: body.winnerEntrantId,
    });

    return NextResponse.json(await buildAdminSnapshot(bracket, adminToken));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not resolve tie breaker." },
      { status: error instanceof Error && error.message === "Bracket not found." ? 404 : 400 },
    );
  }
}
