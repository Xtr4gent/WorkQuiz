import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/workquiz/admin-auth";
import { setRememberedRosterMemberId } from "@/lib/workquiz/auth";
import { findBracketByPublicToken } from "@/lib/workquiz/bracket";

export async function POST(
  request: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await context.params;
  const bracket = await findBracketByPublicToken(publicToken);

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  if ((bracket.kind ?? "public") === "test" && !(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { rosterMemberId?: string | null };
  const rosterMemberId = body.rosterMemberId ?? null;

  if (rosterMemberId && !bracket.rosterMembers.some((member) => member.id === rosterMemberId)) {
    return NextResponse.json({ error: "Roster member not found." }, { status: 400 });
  }

  await setRememberedRosterMemberId(rosterMemberId);
  return NextResponse.json({ ok: true });
}
