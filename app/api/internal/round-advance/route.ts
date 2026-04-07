import { NextResponse } from "next/server";

import { advanceReadyBrackets } from "@/lib/workquiz/bracket";
import { INTERNAL_SCHEDULER_HEADER } from "@/lib/workquiz/constants";

export async function POST(request: Request) {
  const expected = process.env.WORKQUIZ_CRON_SECRET ?? "dev-cron-secret";
  const actual = request.headers.get(INTERNAL_SCHEDULER_HEADER);

  if (actual !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const brackets = advanceReadyBrackets();
  return NextResponse.json({ ok: true, brackets: brackets.length });
}
