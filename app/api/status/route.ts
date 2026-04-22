import { NextResponse } from "next/server";

import { findCurrentPublicBracket } from "@/lib/workquiz/bracket";

export async function GET() {
  const bracket = findCurrentPublicBracket();

  return NextResponse.json(
    { live: bracket !== null && bracket !== undefined },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    },
  );
}
