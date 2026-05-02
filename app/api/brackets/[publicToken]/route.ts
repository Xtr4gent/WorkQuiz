import { NextResponse } from "next/server";

import { getRememberedRosterMemberId } from "@/lib/workquiz/auth";
import { buildSnapshot, findBracketByPublicToken } from "@/lib/workquiz/bracket";

export async function GET(
  request: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await context.params;
  const bracket = await findBracketByPublicToken(publicToken);

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  if (bracket.status === "disabled") {
    return NextResponse.json({ error: "Bracket not available." }, { status: 404 });
  }

  const searchParams = new URL(request.url).searchParams;
  const requestedRosterMemberId = searchParams.get("rosterMemberId");
  const rememberedRosterMemberId = searchParams.has("rosterMemberId")
    ? requestedRosterMemberId
    : await getRememberedRosterMemberId();
  const rosterMemberId = bracket.rosterMembers.some((member) => member.id === rememberedRosterMemberId)
    ? rememberedRosterMemberId ?? undefined
    : undefined;

  return NextResponse.json(buildSnapshot(bracket, { rosterMemberId }));
}
