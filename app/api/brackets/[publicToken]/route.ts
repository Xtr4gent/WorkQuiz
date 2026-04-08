import { NextResponse } from "next/server";

import { buildSnapshot, findBracketByPublicToken } from "@/lib/workquiz/bracket";

export async function GET(
  request: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await context.params;
  const bracket = findBracketByPublicToken(publicToken);
  const rosterMemberId = new URL(request.url).searchParams.get("rosterMemberId") ?? undefined;

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  return NextResponse.json(buildSnapshot(bracket, { rosterMemberId }));
}
