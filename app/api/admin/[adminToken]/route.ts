import { NextResponse } from "next/server";

import { buildAdminSnapshot, findBracketByAdminToken } from "@/lib/workquiz/bracket";

export async function GET(
  _request: Request,
  context: { params: Promise<{ adminToken: string }> },
) {
  const { adminToken } = await context.params;
  const bracket = await findBracketByAdminToken(adminToken);

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  return NextResponse.json(await buildAdminSnapshot(bracket, adminToken));
}
