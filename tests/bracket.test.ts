import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceBracket,
  buildPreviewSnapshot,
  buildSnapshot,
  castVote,
  createBracket,
  restartBracket,
} from "@/lib/workquiz/bracket";
import { ensureStore, readStore, writeStore } from "@/lib/workquiz/store";

function resetStore() {
  ensureStore();
  writeStore({ brackets: [] });
}

test("createBracket builds the bracket and returns an admin token", () => {
  resetStore();
  const startsAt = new Date().toISOString();
  const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { bracket, adminToken } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix", "Kit Kat", "Aero"],
    startsAt,
    endsAt,
    totalPlayers: 20,
  });

  assert.equal(bracket.rounds.length, 2);
  assert.equal(bracket.rounds[0].matchups.length, 2);
  assert.ok(adminToken.length > 10);
  assert.ok(
    Math.abs(new Date(bracket.rounds[0].endsAt).getTime() - new Date(endsAt).getTime()) < 1000,
  );
  assert.equal(bracket.totalPlayers, 20);
});

test("castVote rejects duplicate votes from the same browser token", () => {
  resetStore();
  const { bracket } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix"],
    startsAt: new Date().toISOString(),
    totalPlayers: 20,
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
    totalPlayers: 20,
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
    totalPlayers: 20,
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
  assert.equal(snapshot.currentRoundUniqueVoters, 1);
  assert.equal(snapshot.totalPlayers, 20);
});

test("buildSnapshot points at the next upcoming round before voting opens", () => {
  resetStore();
  const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const { bracket } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix", "Kit Kat", "Aero", "Aero Mint", "Crunchie", "Coffee Crisp", "Smarties"],
    startsAt,
    endsAt,
    totalPlayers: 20,
  });

  const snapshot = buildSnapshot(bracket);

  assert.equal(snapshot.currentRoundId, snapshot.rounds[0].id);
  assert.equal(snapshot.rounds[0].label, "Quarterfinals");
  assert.equal(snapshot.rounds[1].label, "Semifinals");
  assert.equal(snapshot.rounds[2].label, "Finals");
});

test("restartBracket clears votes and sends the bracket back to round one", () => {
  resetStore();
  const startsAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { bracket } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix", "Kit Kat", "Aero"],
    startsAt,
    totalPlayers: 20,
    roundDurationHours: 1,
  });

  const openingMatchup = bracket.rounds[0].matchups[0];

  castVote({
    publicToken: bracket.publicToken,
    matchupId: openingMatchup.id,
    entrantId: openingMatchup.entrantAId!,
    browserToken: "browser-1",
  });

  advanceBracket(bracket, new Date(Date.now() + 2 * 60 * 60 * 1000));
  restartBracket(bracket);

  assert.equal(bracket.status, "live");
  assert.equal(bracket.rounds.length, 2);
  assert.equal(bracket.rounds[0].status, "live");
  assert.equal(bracket.rounds[1].status, "upcoming");
  assert.equal(bracket.rounds[0].matchups[0].votes.length, 0);
  assert.equal(bracket.rounds[0].matchups[0].winnerEntrantId, null);
  assert.equal(bracket.rounds[1].matchups[0].entrantAId, null);
});

test("buildPreviewSnapshot preserves a provided random preview seed order", () => {
  resetStore();
  const snapshot = buildPreviewSnapshot({
    title: "Chocolate Bar Showdown",
    entrants: ["Mars", "Twix", "Kit Kat", "Aero"],
    seededEntrants: ["Aero", "Twix", "Mars", "Kit Kat"],
    seedingMode: "random",
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    totalPlayers: 20,
  });

  assert.equal(snapshot.entrants[0].name, "Aero");
  assert.equal(snapshot.rounds[0].matchups[0].entrantA?.name, "Aero");
});

test("admin snapshot includes previous completed topics and winners", () => {
  resetStore();
  const { bracket: current } = createBracket({
    title: "Current Bracket",
    seedingMode: "manual",
    entrants: ["Mars", "Twix"],
    startsAt: new Date().toISOString(),
    totalPlayers: 20,
    roundDurationHours: 1,
  });

  const { bracket: previous, adminToken } = createBracket({
    title: "Previous Bracket",
    seedingMode: "manual",
    entrants: ["Kit Kat", "Aero"],
    startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    totalPlayers: 20,
    roundDurationHours: 1,
  });

  const store = readStore();
  const storedPrevious = store.brackets.find((entry) => entry.id === previous.id)!;
  storedPrevious.rounds[0].matchups[0].winnerEntrantId = storedPrevious.rounds[0].matchups[0].entrantAId;
  storedPrevious.rounds[0].matchups[0].status = "closed";
  storedPrevious.rounds[0].status = "closed";
  storedPrevious.status = "completed";
  writeStore(store);

  const snapshot = buildSnapshot(current, { includeAdminUrl: true, adminToken });

  assert.equal(snapshot.adminHistory?.length, 1);
  assert.equal(snapshot.adminHistory?.[0].title, "Previous Bracket");
  assert.equal(snapshot.adminHistory?.[0].winnerName, "Kit Kat");
});
