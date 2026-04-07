import { NextResponse } from "next/server";

import { buildPreviewSnapshot } from "@/lib/workquiz/bracket";
import { DEFAULT_ROUND_DURATION_HOURS } from "@/lib/workquiz/constants";
import { parseEntrantsFromText } from "@/lib/workquiz/utils";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    entrants?: string[];
    seededEntrants?: string[];
    entrantsText?: string;
    seedingMode?: "manual" | "random";
    startsAt?: string;
    endsAt?: string;
    totalPlayers?: number;
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
      { error: "Add at least two entrants to preview the bracket." },
      { status: 400 },
    );
  }

  if (body.endsAt && new Date(body.endsAt).getTime() <= new Date(body.startsAt ?? "").getTime()) {
    return NextResponse.json(
      { error: "Round one end time must be later than the start time." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(body.totalPlayers) || (body.totalPlayers ?? 0) < 2) {
    return NextResponse.json(
      { error: "Total players must be a whole number greater than 1." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    buildPreviewSnapshot({
      title: body.title.trim(),
      entrants,
      seededEntrants: body.seededEntrants,
      seedingMode: body.seedingMode ?? "manual",
      startsAt: body.startsAt ?? new Date().toISOString(),
      endsAt: body.endsAt,
      totalPlayers: Number(body.totalPlayers),
      roundDurationHours: body.roundDurationHours ?? DEFAULT_ROUND_DURATION_HOURS,
    }),
  );
}
