import { NextResponse } from "next/server";

import { getOrCreateBrowserToken } from "@/lib/workquiz/auth";
import { buildSnapshot, findBracketByPublicToken } from "@/lib/workquiz/bracket";

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await context.params;
  const browserToken = await getOrCreateBrowserToken();
  const bracket = findBracketByPublicToken(publicToken);

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  return NextResponse.json(buildSnapshot(bracket, { browserToken }));
}
