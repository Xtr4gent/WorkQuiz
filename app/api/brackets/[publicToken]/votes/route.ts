import { NextResponse } from "next/server";

import { buildSnapshot, castVote } from "@/lib/workquiz/bracket";

export async function POST(
  request: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await context.params;
  const body = (await request.json()) as {
    matchupId?: string;
    entrantId?: string;
    rosterMemberId?: string;
  };

  if (!body.matchupId || !body.entrantId || !body.rosterMemberId) {
    return NextResponse.json(
      { error: "matchupId, entrantId, and rosterMemberId are required." },
      { status: 400 },
    );
  }

  try {
    const bracket = castVote({
      publicToken,
      matchupId: body.matchupId,
      entrantId: body.entrantId,
      rosterMemberId: body.rosterMemberId,
    });

    return NextResponse.json(buildSnapshot(bracket, { rosterMemberId: body.rosterMemberId }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vote failed." },
      { status: 400 },
    );
  }
}
