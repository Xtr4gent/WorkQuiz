import { NextResponse } from "next/server";

import { buildSnapshot, findBracketByAdminToken, restartBracket } from "@/lib/workquiz/bracket";
import { publish } from "@/lib/workquiz/realtime";
import { readStore, writeStore } from "@/lib/workquiz/store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ adminToken: string }> },
) {
  const { adminToken } = await context.params;
  const bracket = findBracketByAdminToken(adminToken);

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  const store = readStore();
  const mutable = store.brackets.find((entry) => entry.id === bracket.id);
  if (!mutable) {
    return NextResponse.json({ error: "Bracket not found." }, { status: 404 });
  }

  restartBracket(mutable);
  writeStore(store);
  publish(mutable.publicToken, { type: "restarted" });

  return NextResponse.json(buildSnapshot(mutable, { includeAdminUrl: true, adminToken }));
}
