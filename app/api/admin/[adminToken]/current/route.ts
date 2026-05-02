import { NextResponse } from "next/server";

import { buildAdminSnapshot, findBracketByAdminToken, markBracketAsCurrentPublic } from "@/lib/workquiz/bracket";

export async function POST(
  _request: Request,
  context: { params: Promise<{ adminToken: string }> },
) {
  const { adminToken } = await context.params;
  const bracket = await findBracketByAdminToken(adminToken);

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  try {
    const updated = await markBracketAsCurrentPublic(adminToken);
    return NextResponse.json(await buildAdminSnapshot(updated, adminToken));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not mark bracket as current." },
      { status: 400 },
    );
  }
}
