import { NextResponse } from "next/server";

import { buildAdminSnapshot, clearMatchupVote, findBracketByAdminToken } from "@/lib/workquiz/bracket";

export async function POST(
  request: Request,
  context: { params: Promise<{ adminToken: string }> },
) {
  const { adminToken } = await context.params;
  const bracket = await findBracketByAdminToken(adminToken);

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    matchupId?: string;
    rosterMemberId?: string;
  };

  if (!body.matchupId || !body.rosterMemberId) {
    return NextResponse.json({ error: "matchupId and rosterMemberId are required." }, { status: 400 });
  }

  try {
    const updated = await clearMatchupVote({
      adminToken,
      matchupId: body.matchupId,
      rosterMemberId: body.rosterMemberId,
    });

    return NextResponse.json(await buildAdminSnapshot(updated, adminToken));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not clear the vote." },
      { status: 400 },
    );
  }
}
