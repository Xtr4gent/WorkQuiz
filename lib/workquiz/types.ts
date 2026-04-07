export type SeedingMode = "manual" | "random";
export type BracketStatus = "draft" | "live" | "completed";
export type RoundStatus = "upcoming" | "live" | "closed";
export type MatchupStatus = "pending" | "live" | "closed";

export interface EntrantRecord {
  id: string;
  name: string;
  seed: number;
}

export interface VoteRecord {
  id: string;
  browserTokenHash: string;
  entrantId: string;
  createdAt: string;
}

export interface MatchupRecord {
  id: string;
  slot: number;
  entrantAId: string | null;
  entrantBId: string | null;
  winnerEntrantId: string | null;
  status: MatchupStatus;
  votes: VoteRecord[];
  updatedAt: string;
}

export interface RoundRecord {
  id: string;
  number: number;
  label: string;
  startsAt: string;
  endsAt: string;
  status: RoundStatus;
  matchups: MatchupRecord[];
}

export interface BracketRecord {
  id: string;
  title: string;
  slug: string;
  status: BracketStatus;
  publicToken: string;
  adminTokenHash: string;
  seedingMode: SeedingMode;
  createdAt: string;
  publishedAt: string;
  roundDurationHours: number;
  revoteDurationHours: number;
  entrants: EntrantRecord[];
  rounds: RoundRecord[];
}

export interface StoreShape {
  brackets: BracketRecord[];
}

export interface CreateBracketInput {
  title: string;
  seedingMode: SeedingMode;
  entrants: string[];
  startsAt: string;
  endsAt?: string;
  roundDurationHours?: number;
  revoteDurationHours?: number;
}

export interface BracketSnapshotEntrant {
  id: string;
  name: string;
  seed: number;
}

export interface BracketSnapshotVoteState {
  canVote: boolean;
  votedEntrantId: string | null;
}

export interface BracketSnapshotMatchup {
  id: string;
  slot: number;
  status: MatchupStatus;
  entrantA: BracketSnapshotEntrant | null;
  entrantB: BracketSnapshotEntrant | null;
  winnerEntrantId: string | null;
  votesA: number;
  votesB: number;
  totalVotes: number;
  voteState: BracketSnapshotVoteState;
}

export interface BracketSnapshotRound {
  id: string;
  number: number;
  label: string;
  startsAt: string;
  endsAt: string;
  status: RoundStatus;
  matchups: BracketSnapshotMatchup[];
}

export interface BracketSnapshot {
  id: string;
  title: string;
  slug: string;
  status: BracketStatus;
  publicToken: string;
  publicUrl: string;
  adminUrl?: string;
  seedingMode: SeedingMode;
  createdAt: string;
  publishedAt: string;
  roundDurationHours: number;
  entrants: BracketSnapshotEntrant[];
  rounds: BracketSnapshotRound[];
  currentRoundId: string | null;
  totalVotes: number;
}
