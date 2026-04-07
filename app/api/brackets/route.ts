import { NextResponse } from "next/server";

import { createBracket } from "@/lib/workquiz/bracket";
import { DEFAULT_ROUND_DURATION_HOURS } from "@/lib/workquiz/constants";
import { parseEntrantsFromText } from "@/lib/workquiz/utils";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    entrants?: string[];
    entrantsText?: string;
    seedingMode?: "manual" | "random";
    startsAt?: string;
    roundDurationHours?: number;
  };

  const entrants = body.entrants?.length
    ? body.entrants
    : parseEntrantsFromText(body.entrantsText ?? "");

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (entrants.length < 2) {
    return NextResponse.json(
      { error: "Add at least two entrants to create a bracket." },
      { status: 400 },
    );
  }

  const { bracket, adminToken } = createBracket({
    title: body.title.trim(),
    entrants,
    seedingMode: body.seedingMode ?? "manual",
    startsAt: body.startsAt ?? new Date().toISOString(),
    roundDurationHours: body.roundDurationHours ?? DEFAULT_ROUND_DURATION_HOURS,
  });

  return NextResponse.json({
    publicUrl: `/b/${bracket.publicToken}`,
    adminUrl: `/admin/${adminToken}`,
  });
}
