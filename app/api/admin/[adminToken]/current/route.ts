import { NextResponse } from "next/server";

import { buildSnapshot, findBracketByAdminToken, markBracketAsCurrentPublic } from "@/lib/workquiz/bracket";

export async function POST(
  _request: Request,
  context: { params: Promise<{ adminToken: string }> },
) {
  const { adminToken } = await context.params;
  const bracket = findBracketByAdminToken(adminToken);

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  try {
    const updated = markBracketAsCurrentPublic(adminToken);
    return NextResponse.json(buildSnapshot(updated, { includeAdminUrl: true, adminToken }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not mark bracket as current." },
      { status: 400 },
    );
  }
}
