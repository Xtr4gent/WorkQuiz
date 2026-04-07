import { NextResponse } from "next/server";

import { getOrCreateBrowserToken } from "@/lib/workquiz/auth";
import { buildSnapshot, castVote } from "@/lib/workquiz/bracket";

export async function POST(
  request: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await context.params;
  const body = (await request.json()) as { matchupId?: string; entrantId?: string };

  if (!body.matchupId || !body.entrantId) {
    return NextResponse.json(
      { error: "matchupId and entrantId are required." },
      { status: 400 },
    );
  }

  try {
    const browserToken = await getOrCreateBrowserToken();
    const bracket = castVote({
      publicToken,
      matchupId: body.matchupId,
      entrantId: body.entrantId,
      browserToken,
    });

    return NextResponse.json(buildSnapshot(bracket, { browserToken }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vote failed." },
      { status: 400 },
    );
  }
}
