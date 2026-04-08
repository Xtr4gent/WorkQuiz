export type SeedingMode = "manual" | "random";
export type BracketStatus = "draft" | "live" | "completed";
export type RoundStatus = "upcoming" | "live" | "closed";
export type MatchupStatus = "pending" | "live" | "closed";

export interface EntrantRecord {
  id: string;
  name: string;
  seed: number;
}

export interface RosterMemberRecord {
  id: string;
  name: string;
}

export interface VoteRecord {
  id: string;
  rosterMemberId: string;
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
  totalPlayers: number;
  roundDurationHours: number;
  revoteDurationHours: number;
  entrants: EntrantRecord[];
  rosterMembers: RosterMemberRecord[];
  rounds: RoundRecord[];
}

export interface StoreShape {
  brackets: BracketRecord[];
}

export interface CreateBracketInput {
  title: string;
  seedingMode: SeedingMode;
  entrants: string[];
  rosterMembers: string[];
  seededEntrants?: string[];
  startsAt: string;
  endsAt?: string;
  totalPlayers: number;
  roundDurationHours?: number;
  revoteDurationHours?: number;
}

export interface AdminHistoryItem {
  id: string;
  title: string;
  winnerName: string;
  completedAt: string;
  entrantNames: string[];
  rosterMemberNames: string[];
  seedingMode: SeedingMode;
}

export interface BracketSnapshotEntrant {
  id: string;
  name: string;
  seed: number;
}

export interface BracketSnapshotRosterMember {
  id: string;
  name: string;
}

export interface BracketSnapshotVoteState {
  canVote: boolean;
  votedEntrantId: string | null;
}

export interface BracketSnapshotRosterStatus {
  rosterMemberId: string;
  name: string;
  hasVoted: boolean;
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
  totalPlayers: number;
  roundDurationHours: number;
  entrants: BracketSnapshotEntrant[];
  rosterMembers: BracketSnapshotRosterMember[];
  rounds: BracketSnapshotRound[];
  currentRoundId: string | null;
  currentRoundUniqueVoters: number;
  totalVotes: number;
  selectedRosterMemberId?: string | null;
  currentRoundRosterStatuses: BracketSnapshotRosterStatus[];
  adminHistory?: AdminHistoryItem[];
}
