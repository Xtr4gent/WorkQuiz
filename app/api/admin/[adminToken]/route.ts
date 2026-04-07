import { NextResponse } from "next/server";

import { buildSnapshot, findBracketByAdminToken } from "@/lib/workquiz/bracket";

export async function GET(
  _request: Request,
  context: { params: Promise<{ adminToken: string }> },
) {
  const { adminToken } = await context.params;
  const bracket = findBracketByAdminToken(adminToken);

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  return NextResponse.json(buildSnapshot(bracket, { includeAdminUrl: true, adminToken }));
}
