import assert from "node:assert/strict";
import test from "node:test";

import { advanceBracket, buildSnapshot, castVote, createBracket } from "@/lib/workquiz/bracket";
import { ensureStore, writeStore } from "@/lib/workquiz/store";

function resetStore() {
  ensureStore();
  writeStore({ brackets: [] });
}

test("createBracket builds the bracket and returns an admin token", () => {
  resetStore();
  const { bracket, adminToken } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix", "Kit Kat", "Aero"],
    startsAt: new Date().toISOString(),
    roundDurationHours: 1,
  });

  assert.equal(bracket.rounds.length, 2);
  assert.equal(bracket.rounds[0].matchups.length, 2);
  assert.ok(adminToken.length > 10);
});

test("castVote rejects duplicate votes from the same browser token", () => {
  resetStore();
  const { bracket } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix"],
    startsAt: new Date().toISOString(),
    roundDurationHours: 1,
  });

  const matchup = bracket.rounds[0].matchups[0];

  castVote({
    publicToken: bracket.publicToken,
    matchupId: matchup.id,
    entrantId: matchup.entrantAId!,
    browserToken: "same-browser",
  });

  assert.throws(() =>
    castVote({
      publicToken: bracket.publicToken,
      matchupId: matchup.id,
      entrantId: matchup.entrantBId!,
      browserToken: "same-browser",
    }),
  );
});

test("advanceBracket picks the higher seed on non-final ties and creates a final revote", () => {
  resetStore();
  const startsAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { bracket } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix", "Kit Kat", "Aero"],
    startsAt,
    roundDurationHours: 1,
  });

  const semiA = bracket.rounds[0].matchups[0];
  const semiB = bracket.rounds[0].matchups[1];

  castVote({
    publicToken: bracket.publicToken,
    matchupId: semiA.id,
    entrantId: semiA.entrantAId!,
    browserToken: "one",
  });
  castVote({
    publicToken: bracket.publicToken,
    matchupId: semiA.id,
    entrantId: semiA.entrantBId!,
    browserToken: "two",
  });
  castVote({
    publicToken: bracket.publicToken,
    matchupId: semiB.id,
    entrantId: semiB.entrantAId!,
    browserToken: "three",
  });

  advanceBracket(bracket, new Date(Date.now() + 60 * 60 * 1000));

  const final = bracket.rounds[1].matchups[0];
  final.votes.push({
    id: "vote-1",
    browserTokenHash: "a",
    entrantId: final.entrantAId!,
    createdAt: new Date().toISOString(),
  });
  final.votes.push({
    id: "vote-2",
    browserTokenHash: "b",
    entrantId: final.entrantBId!,
    createdAt: new Date().toISOString(),
  });

  advanceBracket(bracket, new Date(Date.now() + 3 * 60 * 60 * 1000));

  assert.equal(bracket.rounds.at(-1)?.label, "Final Revote");
});

test("buildSnapshot knows when this browser has already voted", () => {
  resetStore();
  const { bracket } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix"],
    startsAt: new Date().toISOString(),
    roundDurationHours: 1,
  });

  const matchup = bracket.rounds[0].matchups[0];

  const afterVote = castVote({
    publicToken: bracket.publicToken,
    matchupId: matchup.id,
    entrantId: matchup.entrantAId!,
    browserToken: "browser-1",
  });

  const snapshot = buildSnapshot(afterVote, { browserToken: "browser-1" });
  assert.equal(snapshot.rounds[0].matchups[0].voteState.canVote, false);
});
