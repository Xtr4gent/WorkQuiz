import { nanoid } from "nanoid";

import {
  DEFAULT_REVOTE_DURATION_HOURS,
  DEFAULT_ROUND_DURATION_HOURS,
} from "@/lib/workquiz/constants";
import { publish } from "@/lib/workquiz/realtime";
import { readStore, updateStore, writeStore } from "@/lib/workquiz/store";
import {
  BracketRecord,
  BracketSnapshot,
  CreateBracketInput,
  EntrantRecord,
  MatchupRecord,
  RoundRecord,
} from "@/lib/workquiz/types";
import {
  addHours,
  buildSeedOrder,
  hashValue,
  isoDate,
  nextPowerOfTwo,
  shuffle,
  slugify,
} from "@/lib/workquiz/utils";

function parseSchedule(startsAt: string, roundDurationHours: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const roundStart = index === 0 ? isoDate(startsAt) : addHours(startsAt, roundDurationHours * index);
    return {
      startsAt: roundStart,
      endsAt: addHours(roundStart, roundDurationHours),
    };
  });
}

function labelForRound(roundNumber: number, totalRounds: number) {
  const roundsRemaining = totalRounds - roundNumber + 1;

  if (roundsRemaining === 1) {
    return "Finals";
  }

  if (roundsRemaining === 2) {
    return "Semifinals";
  }

  if (roundsRemaining === 3) {
    return "Quarterfinals";
  }

  return `Round ${roundNumber}`;
}

function buildRoundsForBracket(bracket: BracketRecord, startsAt: string, roundDurationHours: number) {
  const bracketSize = nextPowerOfTwo(bracket.entrants.length);
  const totalRounds = Math.log2(bracketSize);
  const roundSchedule = parseSchedule(startsAt, roundDurationHours, totalRounds);
  const seedOrder = buildSeedOrder(bracketSize);
  const seedToEntrant = new Map(bracket.entrants.map((entrant) => [entrant.seed, entrant]));

  const rounds: RoundRecord[] = Array.from({ length: totalRounds }, (_, index) => ({
    id: nanoid(),
    number: index + 1,
    label: labelForRound(index + 1, totalRounds),
    startsAt: roundSchedule[index].startsAt,
    endsAt: roundSchedule[index].endsAt,
    status:
      index === 0 && new Date(roundSchedule[index].startsAt).getTime() <= Date.now()
        ? "live"
        : "upcoming",
    matchups: [],
  }));

  rounds[0].matchups = Array.from({ length: bracketSize / 2 }, (_, index) => {
    const seedA = seedOrder[index * 2];
    const seedB = seedOrder[index * 2 + 1];

    return {
      id: nanoid(),
      slot: index + 1,
      entrantAId: seedToEntrant.get(seedA)?.id ?? null,
      entrantBId: seedToEntrant.get(seedB)?.id ?? null,
      winnerEntrantId: null,
      status: rounds[0].status === "live" ? "live" : "pending",
      votes: [],
      updatedAt: new Date().toISOString(),
    };
  });

  for (let roundIndex = 1; roundIndex < totalRounds; roundIndex += 1) {
    rounds[roundIndex].matchups = Array.from(
      { length: rounds[roundIndex - 1].matchups.length / 2 },
      (_, index) => ({
        id: nanoid(),
        slot: index + 1,
        entrantAId: null,
        entrantBId: null,
        winnerEntrantId: null,
        status: "pending",
        votes: [],
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  resolveAutomaticWinners({ ...bracket, rounds });
  return rounds;
}

function deriveRoundDurationHours(input: CreateBracketInput) {
  if (input.endsAt) {
    const start = new Date(input.startsAt).getTime();
    const end = new Date(input.endsAt).getTime();
    const durationHours = (end - start) / (1000 * 60 * 60);

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      throw new Error("Round one end time must be later than the start time.");
    }

    return durationHours;
  }

  return input.roundDurationHours || DEFAULT_ROUND_DURATION_HOURS;
}

function entrantMap(bracket: BracketRecord) {
  return new Map(bracket.entrants.map((entrant) => [entrant.id, entrant]));
}

function voteCounts(matchup: MatchupRecord) {
  return matchup.votes.reduce<Record<string, number>>((counts, vote) => {
    counts[vote.entrantId] = (counts[vote.entrantId] ?? 0) + 1;
    return counts;
  }, {});
}

function compareVotes(matchup: MatchupRecord) {
  const counts = voteCounts(matchup);
  const votesA = matchup.entrantAId ? counts[matchup.entrantAId] ?? 0 : 0;
  const votesB = matchup.entrantBId ? counts[matchup.entrantBId] ?? 0 : 0;

  return {
    votesA,
    votesB,
  };
}

function setNextRoundParticipant(bracket: BracketRecord, roundIndex: number, matchupSlot: number, entrantId: string) {
  const nextRound = bracket.rounds[roundIndex + 1];
  if (!nextRound) {
    return;
  }

  const nextMatchup = nextRound.matchups[Math.floor((matchupSlot - 1) / 2)];
  if (!nextMatchup) {
    return;
  }

  if ((matchupSlot - 1) % 2 === 0) {
    nextMatchup.entrantAId = entrantId;
  } else {
    nextMatchup.entrantBId = entrantId;
  }
}

export function resolveAutomaticWinners(bracket: BracketRecord) {
  for (let roundIndex = 0; roundIndex < bracket.rounds.length; roundIndex += 1) {
    for (const matchup of bracket.rounds[roundIndex].matchups) {
      if (matchup.winnerEntrantId) {
        continue;
      }

      if (matchup.entrantAId && !matchup.entrantBId) {
        matchup.winnerEntrantId = matchup.entrantAId;
        matchup.status = "closed";
        setNextRoundParticipant(bracket, roundIndex, matchup.slot, matchup.entrantAId);
      } else if (matchup.entrantBId && !matchup.entrantAId) {
        matchup.winnerEntrantId = matchup.entrantBId;
        matchup.status = "closed";
        setNextRoundParticipant(bracket, roundIndex, matchup.slot, matchup.entrantBId);
      }
    }
  }
}

export function createBracket(input: CreateBracketInput) {
  const sourceEntrants = input.seedingMode === "random" ? shuffle(input.entrants) : input.entrants;
  const roundDurationHours = deriveRoundDurationHours(input);
  const entrants = sourceEntrants.map<EntrantRecord>((name, index) => ({
    id: nanoid(),
    name,
    seed: index + 1,
  }));

  const adminToken = nanoid(32);
  const bracket: BracketRecord = {
    id: nanoid(),
    title: input.title.trim(),
    slug: slugify(input.title) || `bracket-${nanoid(6)}`,
    status: "live",
    publicToken: nanoid(16),
    adminTokenHash: hashValue(adminToken),
    seedingMode: input.seedingMode,
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    totalPlayers: input.totalPlayers,
    roundDurationHours,
    revoteDurationHours: input.revoteDurationHours || DEFAULT_REVOTE_DURATION_HOURS,
    entrants,
    rounds: [],
  };

  bracket.rounds = buildRoundsForBracket(bracket, input.startsAt, roundDurationHours);

  updateStore((store) => ({
    ...store,
    brackets: [...store.brackets, bracket],
  }));

  publish(bracket.publicToken, { type: "created" });

  return { bracket, adminToken };
}

function winnerFromSeed(bracket: BracketRecord, matchup: MatchupRecord) {
  const entrants = entrantMap(bracket);

  if (!matchup.entrantAId || !matchup.entrantBId) {
    return matchup.entrantAId ?? matchup.entrantBId;
  }

  const { votesA, votesB } = compareVotes(matchup);
  if (votesA === votesB) {
    const entrantA = entrants.get(matchup.entrantAId);
    const entrantB = entrants.get(matchup.entrantBId);
    if (!entrantA || !entrantB) {
      throw new Error("Entrant missing.");
    }

    return entrantA.seed < entrantB.seed ? entrantA.id : entrantB.id;
  }

  return votesA > votesB ? matchup.entrantAId : matchup.entrantBId;
}

export function advanceBracket(bracket: BracketRecord, now = new Date()) {
  for (let roundIndex = 0; roundIndex < bracket.rounds.length; roundIndex += 1) {
    const round = bracket.rounds[roundIndex];

    if (round.status !== "live") {
      if (round.status === "upcoming" && new Date(round.startsAt).getTime() <= now.getTime()) {
        round.status = "live";
        for (const matchup of round.matchups) {
          if (matchup.entrantAId && matchup.entrantBId && matchup.status === "pending") {
            matchup.status = "live";
          }
        }
      }
      continue;
    }

    if (new Date(round.endsAt).getTime() > now.getTime()) {
      continue;
    }

    round.status = "closed";
    let finalsRevote = false;

    for (const matchup of round.matchups) {
      if (matchup.winnerEntrantId) {
        matchup.status = "closed";
        continue;
      }

      const { votesA, votesB } = compareVotes(matchup);
      const isFinalRound = roundIndex === bracket.rounds.length - 1;

      if (isFinalRound && matchup.entrantAId && matchup.entrantBId && votesA === votesB) {
        finalsRevote = true;
        bracket.rounds.push({
          id: nanoid(),
          number: bracket.rounds.length + 1,
          label: "Final Revote",
          startsAt: now.toISOString(),
          endsAt: addHours(now, bracket.revoteDurationHours),
          status: "live",
          matchups: [
            {
              id: nanoid(),
              slot: 1,
              entrantAId: matchup.entrantAId,
              entrantBId: matchup.entrantBId,
              winnerEntrantId: null,
              status: "live",
              votes: [],
              updatedAt: now.toISOString(),
            },
          ],
        });
        matchup.status = "closed";
        continue;
      }

      const winnerEntrantId = winnerFromSeed(bracket, matchup);
      matchup.winnerEntrantId = winnerEntrantId;
      matchup.status = "closed";

      if (winnerEntrantId) {
        setNextRoundParticipant(bracket, roundIndex, matchup.slot, winnerEntrantId);
      }
    }

    if (finalsRevote) {
      continue;
    }

    const nextRound = bracket.rounds[roundIndex + 1];
    if (nextRound) {
      nextRound.status = "live";
      for (const matchup of nextRound.matchups) {
        if (matchup.entrantAId && matchup.entrantBId && matchup.status === "pending") {
          matchup.status = "live";
        }
      }
      resolveAutomaticWinners(bracket);
    } else {
      bracket.status = "completed";
    }
  }

  if (bracket.rounds.every((round) => round.status === "closed")) {
    bracket.status = "completed";
  }
}

export function advanceReadyBrackets(now = new Date()) {
  const store = readStore();
  let changed = false;

  for (const bracket of store.brackets) {
    const before = JSON.stringify(bracket);
    advanceBracket(bracket, now);
    if (before !== JSON.stringify(bracket)) {
      changed = true;
      publish(bracket.publicToken, { type: "advanced" });
    }
  }

  if (changed) {
    writeStore(store);
  }

  return store.brackets;
}

export function findBracketByPublicToken(publicToken: string) {
  return readStore().brackets.find((bracket) => bracket.publicToken === publicToken) ?? null;
}

export function findBracketByAdminToken(adminToken: string) {
  const tokenHash = hashValue(adminToken);
  return readStore().brackets.find((bracket) => bracket.adminTokenHash === tokenHash) ?? null;
}

export function castVote(params: {
  publicToken: string;
  matchupId: string;
  entrantId: string;
  browserToken: string;
}) {
  const browserTokenHash = hashValue(params.browserToken);

  updateStore((store) => {
    const bracket = store.brackets.find((entry) => entry.publicToken === params.publicToken);
    if (!bracket) {
      throw new Error("Bracket not found.");
    }

    advanceBracket(bracket, new Date());
    const liveRound = bracket.rounds.find((round) => round.status === "live");
    if (!liveRound) {
      throw new Error("There is no live round right now.");
    }

    const matchup = liveRound.matchups.find((entry) => entry.id === params.matchupId);
    if (!matchup || matchup.status !== "live") {
      throw new Error("This matchup is not open for voting.");
    }

    if (!([matchup.entrantAId, matchup.entrantBId] as Array<string | null>).includes(params.entrantId)) {
      throw new Error("Invalid entrant.");
    }

    const existingVote = matchup.votes.find((vote) => vote.browserTokenHash === browserTokenHash);
    if (existingVote) {
      throw new Error("This browser already voted in this matchup.");
    }

    matchup.votes.push({
      id: nanoid(),
      browserTokenHash,
      entrantId: params.entrantId,
      createdAt: new Date().toISOString(),
    });
    matchup.updatedAt = new Date().toISOString();

    return store;
  });

  const updated = findBracketByPublicToken(params.publicToken);
  if (!updated) {
    throw new Error("Vote failed.");
  }

  publish(updated.publicToken, { type: "vote" });
  return updated;
}

export function restartBracket(bracket: BracketRecord) {
  const baseStartsAt = bracket.rounds[0]?.startsAt ?? new Date().toISOString();
  bracket.status = "live";
  bracket.rounds = buildRoundsForBracket(bracket, baseStartsAt, bracket.roundDurationHours);
}

export function buildSnapshot(
  bracket: BracketRecord,
  options?: { browserToken?: string; includeAdminUrl?: boolean; adminToken?: string },
): BracketSnapshot {
  advanceBracket(bracket, new Date());
  const entrants = entrantMap(bracket);
  const browserTokenHash = options?.browserToken ? hashValue(options.browserToken) : null;
  const currentRoundRecord =
    bracket.rounds.find((round) => round.status === "live") ??
    bracket.rounds.find((round) => round.status === "upcoming") ??
    null;

  const rounds = bracket.rounds.map((round) => ({
    id: round.id,
    number: round.number,
    label: round.label,
    startsAt: round.startsAt,
    endsAt: round.endsAt,
    status: round.status,
    matchups: round.matchups.map((matchup) => {
      const counts = voteCounts(matchup);
      const votesA = matchup.entrantAId ? counts[matchup.entrantAId] ?? 0 : 0;
      const votesB = matchup.entrantBId ? counts[matchup.entrantBId] ?? 0 : 0;
      const voted = browserTokenHash
        ? matchup.votes.find((vote) => vote.browserTokenHash === browserTokenHash)
        : null;

      return {
        id: matchup.id,
        slot: matchup.slot,
        status: matchup.status,
        entrantA: matchup.entrantAId ? entrants.get(matchup.entrantAId) ?? null : null,
        entrantB: matchup.entrantBId ? entrants.get(matchup.entrantBId) ?? null : null,
        winnerEntrantId: matchup.winnerEntrantId,
        votesA,
        votesB,
        totalVotes: votesA + votesB,
        voteState: {
          canVote: round.status === "live" && matchup.status === "live" && !voted,
          votedEntrantId: voted?.entrantId ?? null,
        },
      };
    }),
  }));

  const totalVotes = rounds.reduce(
    (sum, round) => sum + round.matchups.reduce((roundSum, matchup) => roundSum + matchup.totalVotes, 0),
    0,
  );
  const currentRoundUniqueVoters = currentRoundRecord
    ? new Set(
        currentRoundRecord.matchups.flatMap((matchup) =>
          matchup.votes.map((vote) => vote.browserTokenHash),
        ),
      ).size
    : 0;

  return {
    id: bracket.id,
    title: bracket.title,
    slug: bracket.slug,
    status: bracket.status,
    publicToken: bracket.publicToken,
    publicUrl: `/b/${bracket.publicToken}`,
    adminUrl:
      options?.includeAdminUrl && options.adminToken
        ? `/admin/${options.adminToken}`
        : undefined,
    seedingMode: bracket.seedingMode,
    createdAt: bracket.createdAt,
    publishedAt: bracket.publishedAt,
    totalPlayers: bracket.totalPlayers ?? bracket.entrants.length,
    roundDurationHours: bracket.roundDurationHours,
    entrants: bracket.entrants,
    rounds,
    currentRoundId: currentRoundRecord?.id ?? null,
    currentRoundUniqueVoters,
    totalVotes,
  };
}
