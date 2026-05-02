import { NextResponse } from "next/server";

import { createBracket } from "@/lib/workquiz/bracket";
import { DEFAULT_ROUND_DURATION_HOURS } from "@/lib/workquiz/constants";
import { parseEntrantsFromText } from "@/lib/workquiz/utils";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    entrants?: string[];
    rosterMembers?: string[];
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
  const rosterMembers = body.rosterMembers?.length ? body.rosterMembers : [];

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (entrants.length < 2) {
    return NextResponse.json(
      { error: "Add at least two entrants to create a bracket." },
      { status: 400 },
    );
  }

  if (rosterMembers.length < 2) {
    return NextResponse.json(
      { error: "Add at least two roster members to create the bracket." },
      { status: 400 },
    );
  }

  if (new Set(rosterMembers.map((member) => member.toLowerCase())).size !== rosterMembers.length) {
    return NextResponse.json(
      { error: "Roster names must be unique." },
      { status: 400 },
    );
  }

  if (body.endsAt && new Date(body.endsAt).getTime() <= new Date(body.startsAt ?? "").getTime()) {
    return NextResponse.json(
      { error: "Round one end time must be later than the start time." },
      { status: 400 },
    );
  }

  const { adminToken } = await createBracket({
    title: body.title.trim(),
    entrants,
    rosterMembers,
    seededEntrants: body.seededEntrants,
    seedingMode: body.seedingMode ?? "manual",
    startsAt: body.startsAt ?? new Date().toISOString(),
    endsAt: body.endsAt,
    totalPlayers: rosterMembers.length,
    roundDurationHours: body.roundDurationHours ?? DEFAULT_ROUND_DURATION_HOURS,
  });

  return NextResponse.json({
    publicUrl: "/voting",
    adminUrl: `/admin?adminToken=${encodeURIComponent(adminToken)}`,
  });
}
