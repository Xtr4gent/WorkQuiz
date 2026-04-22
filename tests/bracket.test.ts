import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceBracket,
  buildPreviewSnapshot,
  buildSnapshot,
  castVote,
  clearMatchupVote,
  createBracket,
  disableBracket,
  findCurrentPublicBracket,
  listBracketHistory,
  markBracketAsCurrentPublic,
  restartBracket,
} from "@/lib/workquiz/bracket";
import {
  buildExpectedAdminSessionValue,
  hasValidAdminSessionValue,
  isAdminAuthConfigured,
  sanitizeAdminRedirectTarget,
} from "@/lib/workquiz/admin-auth";
import { ensureStore, readStore, writeStore } from "@/lib/workquiz/store";

const roster = ["Gabe", "Alex", "Jordan", "Sam"];

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
    rosterMembers: roster,
    startsAt,
    endsAt,
    totalPlayers: roster.length,
  });

  assert.equal(bracket.rounds.length, 2);
  assert.equal(bracket.rounds[0].matchups.length, 2);
  assert.ok(adminToken.length > 10);
  assert.equal(bracket.rosterMembers.length, roster.length);
  assert.equal(bracket.totalPlayers, roster.length);
});

test("castVote rejects duplicate votes from the same roster member in a matchup", () => {
  resetStore();
  const { bracket } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix"],
    rosterMembers: roster,
    startsAt: new Date().toISOString(),
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  const matchup = bracket.rounds[0].matchups[0];
  const voterId = bracket.rosterMembers[0].id;

  castVote({
    publicToken: bracket.publicToken,
    matchupId: matchup.id,
    entrantId: matchup.entrantAId!,
    rosterMemberId: voterId,
  });

  assert.throws(() =>
    castVote({
      publicToken: bracket.publicToken,
      matchupId: matchup.id,
      entrantId: matchup.entrantBId!,
      rosterMemberId: voterId,
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
    rosterMembers: roster,
    startsAt,
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  const semiA = bracket.rounds[0].matchups[0];
  const semiB = bracket.rounds[0].matchups[1];

  castVote({
    publicToken: bracket.publicToken,
    matchupId: semiA.id,
    entrantId: semiA.entrantAId!,
    rosterMemberId: bracket.rosterMembers[0].id,
  });
  castVote({
    publicToken: bracket.publicToken,
    matchupId: semiA.id,
    entrantId: semiA.entrantBId!,
    rosterMemberId: bracket.rosterMembers[1].id,
  });
  castVote({
    publicToken: bracket.publicToken,
    matchupId: semiB.id,
    entrantId: semiB.entrantAId!,
    rosterMemberId: bracket.rosterMembers[2].id,
  });

  advanceBracket(bracket, new Date(Date.now() + 60 * 60 * 1000));

  const final = bracket.rounds[1].matchups[0];
  final.votes.push({
    id: "vote-1",
    rosterMemberId: bracket.rosterMembers[0].id,
    entrantId: final.entrantAId!,
    createdAt: new Date().toISOString(),
  });
  final.votes.push({
    id: "vote-2",
    rosterMemberId: bracket.rosterMembers[1].id,
    entrantId: final.entrantBId!,
    createdAt: new Date().toISOString(),
  });

  advanceBracket(bracket, new Date(Date.now() + 3 * 60 * 60 * 1000));

  assert.equal(bracket.rounds.at(-1)?.label, "Final Revote");
});

test("buildSnapshot marks a roster member green only after finishing the whole current round", () => {
  resetStore();
  const { bracket } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix", "Kit Kat", "Aero"],
    rosterMembers: roster,
    startsAt: new Date().toISOString(),
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  const voterId = bracket.rosterMembers[0].id;

  let updated = castVote({
    publicToken: bracket.publicToken,
    matchupId: bracket.rounds[0].matchups[0].id,
    entrantId: bracket.rounds[0].matchups[0].entrantAId!,
    rosterMemberId: voterId,
  });

  let snapshot = buildSnapshot(updated, { rosterMemberId: voterId });
  assert.equal(snapshot.currentRoundUniqueVoters, 0);
  assert.equal(
    snapshot.currentRoundRosterStatuses.find((member) => member.rosterMemberId === voterId)?.hasVoted,
    false,
  );

  updated = castVote({
    publicToken: bracket.publicToken,
    matchupId: updated.rounds[0].matchups[1].id,
    entrantId: updated.rounds[0].matchups[1].entrantAId!,
    rosterMemberId: voterId,
  });

  snapshot = buildSnapshot(updated, { rosterMemberId: voterId });
  assert.equal(snapshot.currentRoundUniqueVoters, 1);
  assert.equal(snapshot.rounds[0].matchups[0].voteState.canVote, false);
  assert.equal(snapshot.selectedRosterMemberId, voterId);
});

test("buildSnapshot points at the next upcoming round before voting opens", () => {
  resetStore();
  const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const { bracket } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix", "Kit Kat", "Aero", "Aero Mint", "Crunchie", "Coffee Crisp", "Smarties"],
    rosterMembers: roster,
    startsAt,
    endsAt,
    totalPlayers: roster.length,
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
    rosterMembers: roster,
    startsAt,
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  const openingMatchup = bracket.rounds[0].matchups[0];

  castVote({
    publicToken: bracket.publicToken,
    matchupId: openingMatchup.id,
    entrantId: openingMatchup.entrantAId!,
    rosterMemberId: bracket.rosterMembers[0].id,
  });

  advanceBracket(bracket, new Date(Date.now() + 2 * 60 * 60 * 1000));
  restartBracket(bracket);

  assert.equal(bracket.status, "live");
  assert.equal(bracket.rounds.length, 2);
  assert.equal(bracket.rounds[0].status, "live");
  assert.equal(bracket.rounds[1].status, "upcoming");
  assert.equal(bracket.rounds[0].matchups[0].votes.length, 0);
  assert.equal(bracket.rounds[0].matchups[0].winnerEntrantId, null);
});

test("disableBracket makes the bracket unavailable for public use", () => {
  resetStore();
  const startsAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { bracket } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix"],
    rosterMembers: roster,
    startsAt,
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  disableBracket(bracket);
  writeStore({ brackets: [bracket] });
  const snapshot = buildSnapshot(bracket);

  assert.equal(snapshot.status, "disabled");
  assert.equal(snapshot.rounds[0].status, "closed");
  assert.equal(snapshot.rounds[0].matchups[0].status, "closed");
  assert.throws(() =>
    castVote({
      publicToken: bracket.publicToken,
      matchupId: bracket.rounds[0].matchups[0].id,
      entrantId: bracket.rounds[0].matchups[0].entrantAId!,
      rosterMemberId: bracket.rosterMembers[0].id,
    }),
  );
});

test("clearMatchupVote removes one person's vote from a specific matchup", () => {
  resetStore();
  const { bracket, adminToken } = createBracket({
    title: "Chocolate Bar Showdown",
    seedingMode: "manual",
    entrants: ["Mars", "Twix"],
    rosterMembers: roster,
    startsAt: new Date().toISOString(),
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  const matchup = bracket.rounds[0].matchups[0];
  const voterId = bracket.rosterMembers[0].id;

  castVote({
    publicToken: bracket.publicToken,
    matchupId: matchup.id,
    entrantId: matchup.entrantAId!,
    rosterMemberId: voterId,
  });

  const updated = clearMatchupVote({
    adminToken,
    matchupId: matchup.id,
    rosterMemberId: voterId,
  });
  const snapshot = buildSnapshot(updated, { includeAdminUrl: true, adminToken });

  assert.equal(snapshot.rounds[0].matchups[0].totalVotes, 0);
  assert.equal(snapshot.rounds[0].matchups[0].adminVotes?.length, 0);
});

test("markBracketAsCurrentPublic makes exactly one bracket the stable public tournament", () => {
  resetStore();
  const first = createBracket({
    title: "First Bracket",
    seedingMode: "manual",
    entrants: ["Mars", "Twix"],
    rosterMembers: roster,
    startsAt: new Date().toISOString(),
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  const second = createBracket({
    title: "Second Bracket",
    seedingMode: "manual",
    entrants: ["Kit Kat", "Aero"],
    rosterMembers: roster,
    startsAt: new Date().toISOString(),
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  let current = markBracketAsCurrentPublic(first.adminToken);
  assert.equal(current.title, "First Bracket");
  assert.equal(findCurrentPublicBracket()?.id, first.bracket.id);

  current = markBracketAsCurrentPublic(second.adminToken);
  assert.equal(current.title, "Second Bracket");

  const store = readStore();
  assert.equal(store.brackets.find((entry) => entry.id === first.bracket.id)?.isCurrentPublic, false);
  assert.equal(store.brackets.find((entry) => entry.id === second.bracket.id)?.isCurrentPublic, true);
  assert.equal(findCurrentPublicBracket()?.id, second.bracket.id);
});

test("buildPreviewSnapshot preserves a provided random preview seed order", () => {
  resetStore();
  const snapshot = buildPreviewSnapshot({
    title: "Chocolate Bar Showdown",
    entrants: ["Mars", "Twix", "Kit Kat", "Aero"],
    rosterMembers: roster,
    seededEntrants: ["Aero", "Twix", "Mars", "Kit Kat"],
    seedingMode: "random",
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    totalPlayers: roster.length,
  });

  assert.equal(snapshot.entrants[0].name, "Aero");
  assert.equal(snapshot.rounds[0].matchups[0].entrantA?.name, "Aero");
  assert.equal(snapshot.rosterMembers.length, roster.length);
});

test("admin snapshot includes previous completed topics and winners", () => {
  resetStore();
  const { bracket: current, adminToken } = createBracket({
    title: "Current Bracket",
    seedingMode: "manual",
    entrants: ["Mars", "Twix"],
    rosterMembers: roster,
    startsAt: new Date().toISOString(),
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  const { bracket: previous } = createBracket({
    title: "Previous Bracket",
    seedingMode: "manual",
    entrants: ["Kit Kat", "Aero"],
    rosterMembers: roster,
    startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    totalPlayers: roster.length,
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

test("listBracketHistory returns only real finished brackets in newest-first order", () => {
  resetStore();

  const { bracket: liveBracket } = createBracket({
    title: "Still Live",
    seedingMode: "manual",
    entrants: ["Mars", "Twix"],
    rosterMembers: roster,
    startsAt: new Date().toISOString(),
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  const { bracket: olderBracket } = createBracket({
    title: "Best Chocolate Bar",
    seedingMode: "manual",
    entrants: ["Kit Kat", "Aero"],
    rosterMembers: roster,
    startsAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  const { bracket: newerBracket } = createBracket({
    title: "Best Soda",
    seedingMode: "manual",
    entrants: ["Coke", "Pepsi"],
    rosterMembers: roster,
    startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    totalPlayers: roster.length,
    roundDurationHours: 1,
  });

  const store = readStore();
  const storedOlder = store.brackets.find((entry) => entry.id === olderBracket.id)!;
  storedOlder.rounds[0].matchups[0].winnerEntrantId = storedOlder.rounds[0].matchups[0].entrantAId;
  storedOlder.rounds[0].matchups[0].status = "closed";
  storedOlder.rounds[0].status = "closed";
  storedOlder.status = "completed";

  const storedNewer = store.brackets.find((entry) => entry.id === newerBracket.id)!;
  storedNewer.rounds[0].matchups[0].winnerEntrantId = storedNewer.rounds[0].matchups[0].entrantBId;
  storedNewer.rounds[0].matchups[0].status = "closed";
  storedNewer.rounds[0].status = "closed";
  storedNewer.status = "disabled";
  storedNewer.publishedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const storedLive = store.brackets.find((entry) => entry.id === liveBracket.id)!;
  storedLive.publishedAt = new Date().toISOString();
  writeStore(store);

  const history = listBracketHistory();

  assert.equal(history.length, 2);
  assert.equal(history[0].title, "Best Soda");
  assert.equal(history[0].winnerName, "Pepsi");
  assert.equal(history[1].title, "Best Chocolate Bar");
});

test("admin auth session token matches the configured env credentials", async () => {
  const previousUsername = process.env.WORKQUIZ_ADMIN_USERNAME;
  const previousPassword = process.env.WORKQUIZ_ADMIN_PASSWORD;

  process.env.WORKQUIZ_ADMIN_USERNAME = "admin";
  process.env.WORKQUIZ_ADMIN_PASSWORD = "swordfish";

  try {
    assert.equal(isAdminAuthConfigured(), true);
    const sessionValue = await buildExpectedAdminSessionValue();

    assert.ok(sessionValue);
    assert.equal(await hasValidAdminSessionValue(sessionValue), true);
    assert.equal(await hasValidAdminSessionValue("not-the-right-cookie"), false);
  } finally {
    if (previousUsername === undefined) {
      delete process.env.WORKQUIZ_ADMIN_USERNAME;
    } else {
      process.env.WORKQUIZ_ADMIN_USERNAME = previousUsername;
    }

    if (previousPassword === undefined) {
      delete process.env.WORKQUIZ_ADMIN_PASSWORD;
    } else {
      process.env.WORKQUIZ_ADMIN_PASSWORD = previousPassword;
    }
  }
});

test("sanitizeAdminRedirectTarget only allows safe in-app page routes", () => {
  assert.equal(sanitizeAdminRedirectTarget("/setup"), "/setup");
  assert.equal(sanitizeAdminRedirectTarget("/admin/token-123?tab=votes"), "/admin/token-123?tab=votes");
  assert.equal(sanitizeAdminRedirectTarget("https://evil.example/steal"), "/setup");
  assert.equal(sanitizeAdminRedirectTarget("//evil.example/steal"), "/setup");
  assert.equal(sanitizeAdminRedirectTarget("/api/admin/secret"), "/setup");
});
