import { NextResponse } from "next/server";

import { buildSnapshot, castVote, findBracketByPublicToken } from "@/lib/workquiz/bracket";

export async function POST(
  request: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await context.params;
  const bracket = await findBracketByPublicToken(publicToken);
  const body = (await request.json()) as {
    matchupId?: string;
    entrantId?: string;
    rosterMemberId?: string;
  };

  if (!bracket || bracket.status === "disabled") {
    return NextResponse.json({ error: "Bracket not available." }, { status: 404 });
  }

  if (!body.matchupId || !body.entrantId || !body.rosterMemberId) {
    return NextResponse.json(
      { error: "matchupId, entrantId, and rosterMemberId are required." },
      { status: 400 },
    );
  }

  try {
    const updatedBracket = await castVote({
      publicToken,
      matchupId: body.matchupId,
      entrantId: body.entrantId,
      rosterMemberId: body.rosterMemberId,
    });

    return NextResponse.json(buildSnapshot(updatedBracket, { rosterMemberId: body.rosterMemberId }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vote failed." },
      { status: 400 },
    );
  }
}
