"use client";

import { useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from "react";

import {
  BracketSnapshot,
  BracketSnapshotEntrant,
  BracketSnapshotMatchup,
} from "@/lib/workquiz/types";

type AdminSection = "live" | "roster" | "results" | "advance" | "links" | "history" | "danger";

const easternFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

function formatEasternDateTime(value: string) {
  return easternFormatter.format(new Date(value));
}

function formatCountdown(targetIso: string, nowTick: number) {
  const msLeft = new Date(targetIso).getTime() - nowTick;
  if (msLeft <= 0) {
    return "less than a minute";
  }

  const totalSeconds = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function percent(part: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function entrantLabel(entrant: BracketSnapshotEntrant | null) {
  return entrant ? entrant.name : "TBD";
}

function winnerName(snapshot: BracketSnapshot) {
  const finalRound = snapshot.rounds[snapshot.rounds.length - 1];
  const winnerId = finalRound?.matchups[0]?.winnerEntrantId;
  return snapshot.entrants.find((entrant) => entrant.id === winnerId)?.name ?? null;
}

function matchupTitle(matchup: BracketSnapshotMatchup) {
  return `${entrantLabel(matchup.entrantA)} vs ${entrantLabel(matchup.entrantB)}`;
}

function resultWidth(votes: number, total: number) {
  return `${percent(votes, total)}%`;
}

export function BracketClient({
  token,
  adminToken,
  initialSnapshot,
  mode,
}: {
  token: string;
  adminToken?: string;
  initialSnapshot: BracketSnapshot;
  mode: "public" | "admin";
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [pendingVotes, setPendingVotes] = useState<Record<string, string>>({});
  const [selectedRosterMemberId, setSelectedRosterMemberId] = useState<string | null>(
    initialSnapshot.selectedRosterMemberId ?? null,
  );
  const [adminSection, setAdminSection] = useState<AdminSection>("live");
  const hydrated = useHydrated();

  const refresh = useEffectEvent(async () => {
    const query =
      mode === "public"
        ? `?rosterMemberId=${encodeURIComponent(selectedRosterMemberId ?? "")}`
        : "";
    const url = mode === "admin" ? `/api/admin/${adminToken}` : `/api/brackets/${token}${query}`;
    const response = await fetch(url, { cache: "no-store" });
    const result = (await response.json()) as BracketSnapshot & { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not refresh the bracket.");
      return;
    }

    setSnapshot(result);
    setPendingVotes({});
  });

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${scheme}://${window.location.host}/ws?token=${token}`);

    ws.addEventListener("message", () => {
      void refresh();
    });

    ws.addEventListener("close", () => {
      interval = setInterval(() => {
        void refresh();
      }, 10000);
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      document.removeEventListener("visibilitychange", onVisible);
      ws.close();
    };
  }, [adminToken, mode, selectedRosterMemberId, token]);

  useEffect(() => {
    if (mode === "public") {
      void refresh();
    }
  }, [mode, selectedRosterMemberId]);

  const currentRound = useMemo(
    () => snapshot.rounds.find((round) => round.id === snapshot.currentRoundId) ?? null,
    [snapshot],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!currentRound) {
      return;
    }

    const deadline =
      currentRound.status === "live"
        ? new Date(currentRound.endsAt).getTime()
        : new Date(currentRound.startsAt).getTime();

    if (deadline > nowTick) {
      return;
    }

    void refresh();
  }, [currentRound, nowTick]);

  const displayPublicUrl = useMemo(() => {
    if (!hydrated) {
      return snapshot.publicUrl;
    }

    return new URL(snapshot.publicUrl, window.location.origin).toString();
  }, [hydrated, snapshot.publicUrl]);

  const displayAdminUrl = useMemo(() => {
    if (!snapshot.adminUrl) {
      return null;
    }

    if (!hydrated) {
      return snapshot.adminUrl;
    }

    return new URL(snapshot.adminUrl, window.location.origin).toString();
  }, [hydrated, snapshot.adminUrl]);

  const displayCurrentUrl = useMemo(() => {
    if (!hydrated) {
      return "/current";
    }

    return new URL("/current", window.location.origin).toString();
  }, [hydrated]);

  const reuseTemplateBase = useMemo(() => {
    if (!adminToken) {
      return null;
    }

    return `/setup?adminToken=${encodeURIComponent(adminToken)}`;
  }, [adminToken]);

  const currentRoundBanner = useMemo(() => {
    if (snapshot.status === "disabled") {
      return {
        title: "Bracket shut down",
        body: "The public link has been disabled and voting is no longer available.",
      };
    }

    if (!currentRound) {
      return {
        title: "Bracket complete",
        body: "The final round is over. Time to celebrate the winner.",
      };
    }

    if (currentRound.status === "live") {
      return {
        title: `${currentRound.label} is live`,
        body: `Voting closes in ${formatCountdown(currentRound.endsAt, nowTick)}.`,
      };
    }

    if (currentRound.status === "upcoming") {
      return {
        title: `${currentRound.label} has not opened yet`,
        body: hydrated
          ? `Voting opens in ${formatCountdown(currentRound.startsAt, nowTick)}.`
          : "Voting opens soon.",
      };
    }

    return {
      title: `${currentRound.label} is closed`,
      body: "Results are locked in while the bracket syncs the next stage.",
    };
  }, [currentRound, hydrated, nowTick, snapshot.status]);

  const selectedRosterMemberName = useMemo(
    () =>
      snapshot.rosterMembers.find((member) => member.id === selectedRosterMemberId)?.name ?? null,
    [selectedRosterMemberId, snapshot.rosterMembers],
  );

  const createNewBracketHref = useMemo(
    () => (adminToken ? `/setup?adminToken=${encodeURIComponent(adminToken)}` : "/setup"),
    [adminToken],
  );

  const activeMatchups = currentRound?.matchups.filter((matchup) => matchup.status === "live") ?? [];
  const primaryMatchup = activeMatchups[0] ?? currentRound?.matchups[0] ?? snapshot.rounds[0]?.matchups[0] ?? null;
  const turnout = percent(snapshot.currentRoundUniqueVoters, snapshot.totalPlayers);
  const pendingRosterCount = Math.max(snapshot.totalPlayers - snapshot.currentRoundUniqueVoters, 0);
  const champion = winnerName(snapshot);

  function handleRosterSelection(nextRosterMemberId: string | null) {
    setError(null);
    setPendingVotes({});
    setSelectedRosterMemberId(nextRosterMemberId);

    if (mode === "public") {
      void fetch(`/api/brackets/${token}/identity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterMemberId: nextRosterMemberId }),
      });
    }
  }

  async function vote(matchupId: string, entrantId: string) {
    setError(null);
    if (!selectedRosterMemberId) {
      setError("Choose your name before voting.");
      return;
    }
    const response = await fetch(`/api/brackets/${token}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchupId, entrantId, rosterMemberId: selectedRosterMemberId }),
    });
    const result = (await response.json()) as BracketSnapshot & { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Vote failed.");
      return;
    }

    setSnapshot(result);
    setPendingVotes((current) => {
      const next = { ...current };
      delete next[matchupId];
      return next;
    });
    setSelectedRosterMemberId(result.selectedRosterMemberId ?? selectedRosterMemberId);
  }

  async function advanceNow() {
    if (!adminToken) {
      return;
    }

    if (!window.confirm("Are you sure you want to advance to the next round early?")) {
      return;
    }

    const response = await fetch(`/api/admin/${adminToken}/advance`, { method: "POST" });
    const result = (await response.json()) as BracketSnapshot & { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not advance the round.");
      return;
    }

    setSnapshot(result);
  }

  async function restartNow() {
    if (!adminToken) {
      return;
    }

    if (!window.confirm("Are you sure you want to restart the bracket from round one?")) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/admin/${adminToken}/restart`, { method: "POST" });
    const result = (await response.json()) as BracketSnapshot & { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not restart the bracket.");
      return;
    }

    setSnapshot(result);
    setPendingVotes({});
  }

  async function shutDownNow() {
    if (!adminToken) {
      return;
    }

    if (!window.confirm("Are you sure you want to shut down this bracket and disable the public link?")) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/admin/${adminToken}/shutdown`, { method: "POST" });
    const result = (await response.json()) as BracketSnapshot & { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not shut down the bracket.");
      return;
    }

    setSnapshot(result);
    setPendingVotes({});
  }

  async function clearVote(matchupId: string, rosterMemberId: string, rosterMemberName: string) {
    if (!adminToken) {
      return;
    }

    if (!window.confirm(`Are you sure you want to clear ${rosterMemberName}'s vote for this matchup?`)) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/admin/${adminToken}/votes/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchupId, rosterMemberId }),
    });
    const result = (await response.json()) as BracketSnapshot & { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not clear the vote.");
      return;
    }

    setSnapshot(result);
  }

  async function makeCurrentPublicNow() {
    if (!adminToken) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/admin/${adminToken}/current`, { method: "POST" });
    const result = (await response.json()) as BracketSnapshot & { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not mark this bracket as current.");
      return;
    }

    setSnapshot(result);
  }

  function renderPublicVote(matchup: BracketSnapshotMatchup) {
    const selectedEntrantId = pendingVotes[matchup.id] ?? matchup.voteState.votedEntrantId;
    const canSubmitVote =
      matchup.voteState.canVote &&
      !!selectedRosterMemberId &&
      !!selectedEntrantId &&
      selectedEntrantId !== matchup.voteState.votedEntrantId;
    const canSeeVoteCounts =
      matchup.status !== "live" ||
      !matchup.voteState.canVote ||
      Boolean(matchup.voteState.votedEntrantId);
    const votePctA = percent(matchup.votesA, matchup.totalVotes);
    const votePctB = percent(matchup.votesB, matchup.totalVotes);

    return (
      <section className="bw-vote-section" key={matchup.id}>
        <div className="bw-vote-prompt">
          {matchup.voteState.votedEntrantId ? "Your vote is locked in" : "Pick your favourite"}
        </div>
        <div className="bw-vote-cards">
          {[matchup.entrantA, matchup.entrantB].map((entrant, index) => {
            const isSelected = selectedEntrantId === entrant?.id;
            const isVotedWinner = matchup.voteState.votedEntrantId === entrant?.id;
            const isVotedLoser = Boolean(matchup.voteState.votedEntrantId) && !isVotedWinner;

            return (
              <button
                className={`bw-vote-card ${isSelected ? "is-selected" : ""} ${
                  isVotedWinner ? "voted-win" : ""
                } ${isVotedLoser ? "voted-lose" : ""}`}
                disabled={!selectedRosterMemberId || !matchup.voteState.canVote || !entrant}
                key={entrant?.id ?? index}
                onClick={() =>
                  entrant &&
                  setPendingVotes((current) => ({
                    ...current,
                    [matchup.id]: entrant.id,
                  }))
                }
                type="button"
              >
                <span className="bw-vote-card-check">✓</span>
                <span className="bw-vote-card-name">{entrantLabel(entrant)}</span>
                <span className="bw-vote-card-hint">
                  {isSelected ? "Selected" : matchup.voteState.votedEntrantId ? "Vote recorded" : "Tap to select"}
                </span>
              </button>
            );
          })}
          <div className="bw-vote-vs">VS</div>
        </div>

        {matchup.voteState.canVote ? (
          <button
            className="bw-btn bw-btn-lime bw-confirm-vote vote-confirm-button"
            disabled={!canSubmitVote}
            onClick={() => selectedEntrantId && vote(matchup.id, selectedEntrantId)}
            type="button"
          >
            {selectedEntrantId ? "Vote for selected option" : "Select an option to vote"}
          </button>
        ) : null}

        <div className={`bw-vote-results ${canSeeVoteCounts ? "show" : ""}`}>
          <div className="bw-result-row">
            <div className="bw-result-label">
              <span className="bw-result-label-name">{entrantLabel(matchup.entrantA)}</span>
              <div className="bw-result-stats">
                <span className="bw-result-count">{matchup.votesA} votes</span>
                <span className="bw-result-pct">{votePctA}%</span>
              </div>
            </div>
            <div className="bw-result-bar-track">
              <div className="bw-result-bar-fill" style={{ width: `${votePctA}%` }} />
            </div>
          </div>
          <div className="bw-result-row">
            <div className="bw-result-label">
              <span className="bw-result-label-name">{entrantLabel(matchup.entrantB)}</span>
              <div className="bw-result-stats">
                <span className="bw-result-count">{matchup.votesB} votes</span>
                <span className="bw-result-pct">{votePctB}%</span>
              </div>
            </div>
            <div className="bw-result-bar-track">
              <div className="bw-result-bar-fill losing" style={{ width: `${votePctB}%` }} />
            </div>
          </div>
          <div className="bw-result-total">{matchup.totalVotes} total votes</div>
        </div>

        {!canSeeVoteCounts ? (
          <p className="bw-muted bw-result-lock">Results unlock after you vote.</p>
        ) : null}
      </section>
    );
  }

  function renderBracketBoard() {
    return (
      <div className="bw-bracket-wrap">
        <div className="bw-bracket-grid">
          {snapshot.rounds.map((round) => (
            <div className="bw-b-col" key={round.id}>
              <div className={`bw-b-col-header ${currentRound?.id === round.id ? "live" : ""}`}>
                {round.label}
              </div>
              <div className="bw-b-group">
                {round.matchups.map((matchup) => {
                  const winnerA = matchup.winnerEntrantId && matchup.entrantA?.id === matchup.winnerEntrantId;
                  const winnerB = matchup.winnerEntrantId && matchup.entrantB?.id === matchup.winnerEntrantId;
                  const canSeeVoteCounts =
                    mode === "admin" ||
                    matchup.status !== "live" ||
                    !matchup.voteState.canVote ||
                    Boolean(matchup.voteState.votedEntrantId);

                  return (
                    <div
                      className={`bw-b-match ${matchup.status === "live" ? "is-live" : ""}`}
                      key={matchup.id}
                    >
                      <div className={`bw-b-entry ${winnerA ? "winner" : winnerB ? "loser" : ""}`}>
                        <span className="bw-b-seed">{matchup.entrantA?.seed ?? ""}</span>
                        <span className="bw-b-name">{entrantLabel(matchup.entrantA)}</span>
                        {winnerA ? <span className="bw-b-win-dot" /> : null}
                        {matchup.status === "live" ? <span className="bw-b-live-dot" /> : null}
                        {canSeeVoteCounts ? <span className="bw-b-score">{matchup.votesA}</span> : null}
                      </div>
                      <div className={`bw-b-entry ${winnerB ? "winner" : winnerA ? "loser" : ""}`}>
                        <span className="bw-b-seed">{matchup.entrantB?.seed ?? ""}</span>
                        <span className="bw-b-name">{entrantLabel(matchup.entrantB)}</span>
                        {winnerB ? <span className="bw-b-win-dot" /> : null}
                        {matchup.status === "live" ? <span className="bw-b-live-dot" /> : null}
                        {canSeeVoteCounts ? <span className="bw-b-score">{matchup.votesB}</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="bw-b-col bw-b-champion">
            <div className="bw-b-col-header live">Champion</div>
            <div className="bw-b-champ-card">
              <div className="bw-b-champ-label">Champion</div>
              {champion ? <div className="bw-b-champ-name">{champion}</div> : <div className="bw-b-champ-tbd">TBD</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderResultBars(matchup: BracketSnapshotMatchup) {
    const aPct = percent(matchup.votesA, matchup.totalVotes);
    const bPct = percent(matchup.votesB, matchup.totalVotes);

    return (
      <>
        <div className="bw-matchup-result">
          <div className="bw-matchup-result-header">
            <span>{entrantLabel(matchup.entrantA)}</span>
            <div className="bw-matchup-result-stats">
              <span className="bw-res-count">{matchup.votesA} votes</span>
              <span className="bw-res-pct">{aPct}%</span>
            </div>
          </div>
          <div className="bw-bar-track">
            <div className="bw-bar-fill" style={{ width: resultWidth(matchup.votesA, matchup.totalVotes) }} />
          </div>
        </div>
        <div className="bw-matchup-result">
          <div className="bw-matchup-result-header">
            <span>{entrantLabel(matchup.entrantB)}</span>
            <div className="bw-matchup-result-stats">
              <span className="bw-res-count">{matchup.votesB} votes</span>
              <span className="bw-res-pct">{bPct}%</span>
            </div>
          </div>
          <div className="bw-bar-track">
            <div className="bw-bar-fill losing" style={{ width: resultWidth(matchup.votesB, matchup.totalVotes) }} />
          </div>
        </div>
      </>
    );
  }

  function renderAdminSection() {
    if (adminSection === "roster") {
      return (
        <section className="bw-section-panel active">
          <div className="bw-panel-title">Who&apos;s Voted</div>
          <p className="bw-panel-sub">
            {currentRound?.label ?? "Current round"} · {snapshot.currentRoundUniqueVoters} of {snapshot.totalPlayers} voted
          </p>
          <div className="bw-card">
            <div className="bw-card-header-row">
              <div className="bw-card-title">Roster Status</div>
              <div className="bw-tag-row">
                <span className="bw-tag bw-tag-lime">{snapshot.currentRoundUniqueVoters} voted</span>
                <span className="bw-tag bw-tag-coral">{pendingRosterCount} pending</span>
              </div>
            </div>
            <div className="bw-roster-grid">
              {snapshot.currentRoundRosterStatuses.map((member) => (
                <div
                  className={`bw-roster-chip ${member.hasVoted ? "voted" : "pending"}`}
                  key={member.rosterMemberId}
                >
                  <span className={`bw-chip-avatar ${member.hasVoted ? "voted-av" : "pending-av"}`}>
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="bw-chip-name">{member.name}</span>
                  <span className={`bw-chip-status ${member.hasVoted ? "done" : "waiting"}`}>
                    {member.hasVoted ? "Voted" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (adminSection === "results") {
      return (
        <section className="bw-section-panel active">
          <div className="bw-panel-title">Live Results</div>
          <p className="bw-panel-sub">All matchups · current round</p>
          {snapshot.rounds.map((round) => (
            <div className={round.id === currentRound?.id ? "bw-card" : "bw-card is-dimmed"} key={round.id}>
              <div className="bw-card-title">
                {round.label}
                <span className={`bw-tag ${round.status === "live" ? "bw-tag-lime" : "bw-tag-muted"}`}>
                  {round.status}
                </span>
              </div>
              {round.matchups.map((matchup) => (
                <div className="bw-admin-matchup-block" key={matchup.id}>
                  <div className="bw-matchup-name">{matchupTitle(matchup)}</div>
                  {renderResultBars(matchup)}
                  {matchup.adminVotes?.length ? (
                    <div className="bw-admin-vote-list">
                      {matchup.adminVotes.map((voteEntry) => (
                        <div
                          className="bw-admin-vote-item"
                          key={`${matchup.id}-${voteEntry.rosterMemberId}`}
                        >
                          <span>
                            {voteEntry.rosterMemberName} voted for {voteEntry.entrantName}
                          </span>
                          <button
                            className="bw-btn bw-btn-outline"
                            onClick={() =>
                              clearVote(
                                matchup.id,
                                voteEntry.rosterMemberId,
                                voteEntry.rosterMemberName,
                              )
                            }
                            type="button"
                          >
                            Clear vote
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </section>
      );
    }

    if (adminSection === "advance") {
      return (
        <section className="bw-section-panel active">
          <div className="bw-panel-title">Advance Round</div>
          <p className="bw-panel-sub">Close the current matchup and move the bracket forward.</p>
          <div className="bw-advance-panel">
            <div className="bw-advance-card">
              <div className="bw-advance-card-title">Auto-Advance Timer</div>
              <div className="bw-timer-display" suppressHydrationWarning>
                {currentRound?.status === "live" && hydrated
                  ? formatCountdown(currentRound.endsAt, nowTick)
                  : "Paused"}
              </div>
              <div className="bw-timer-sub">{currentRoundBanner.body}</div>
            </div>
            <div className="bw-advance-card">
              <div className="bw-advance-card-title">Manual Controls</div>
              <div className="bw-btn-row">
                <button className="bw-btn bw-btn-lime" onClick={advanceNow} type="button">
                  Advance to Next Round
                </button>
                <button className="bw-btn bw-btn-outline" onClick={restartNow} type="button">
                  Restart Bracket
                </button>
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (adminSection === "links") {
      return (
        <section className="bw-section-panel active">
          <div className="bw-panel-title">Tournament Links</div>
          <p className="bw-panel-sub">Current public link, private admin link, and public status controls.</p>
          <div className="bw-card">
            <div className="bw-btn-row">
              {!snapshot.isCurrentPublic && snapshot.status !== "disabled" ? (
                <button className="bw-btn bw-btn-lime" onClick={makeCurrentPublicNow} type="button">
                  Make Current Public Bracket
                </button>
              ) : null}
              {snapshot.status !== "disabled" ? (
                <button className="bw-btn bw-btn-danger" onClick={shutDownNow} type="button">
                  Shut Down Public Link
                </button>
              ) : null}
              <a className="bw-btn bw-btn-outline" href={createNewBracketHref}>
                New Tournament
              </a>
            </div>
            <div className="bw-link-stack">
              <div>
                <span>Stable public link</span>
                <code>{snapshot.isCurrentPublic ? displayCurrentUrl : "/current (not active yet)"}</code>
              </div>
              <div>
                <span>Public voting link</span>
                <code>{snapshot.status === "disabled" ? "Disabled" : displayPublicUrl}</code>
              </div>
              {displayAdminUrl ? (
                <div>
                  <span>Secret admin link</span>
                  <code>{displayAdminUrl}</code>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      );
    }

    if (adminSection === "history") {
      return (
        <section className="bw-section-panel active">
          <div className="bw-panel-title">Past Tournaments</div>
          <p className="bw-panel-sub">Every debate that has been settled.</p>
          {snapshot.adminHistory?.length ? (
            snapshot.adminHistory.map((item, index) => (
              <div className="bw-history-item" key={item.id}>
                <div>
                  <div className="bw-history-num">Tournament #{snapshot.adminHistory!.length - index}</div>
                  <div className="bw-history-topic">{item.title}</div>
                  <div className="bw-history-winner">Champion: {item.winnerName}</div>
                </div>
                <div className="bw-history-meta">
                  <div>{formatEasternDateTime(item.completedAt)}</div>
                  {reuseTemplateBase ? (
                    <a href={`${reuseTemplateBase}&template=${encodeURIComponent(item.id)}`}>
                      Reuse topic
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="bw-card">
              <div className="bw-card-title">No completed tournaments yet</div>
              <p className="bw-muted">Previous winners will show up here once you finish a bracket.</p>
            </div>
          )}
        </section>
      );
    }

    if (adminSection === "danger") {
      return (
        <section className="bw-section-panel active">
          <div className="bw-panel-title danger">Danger Zone</div>
          <p className="bw-panel-sub">These actions change the active tournament. Confirm prompts are required.</p>
          <div className="bw-danger-card">
            <div className="bw-danger-card-header">
              <div>
                <div className="bw-danger-card-title">Restart Bracket</div>
                <div className="bw-danger-card-desc">Wipes votes and sends the tournament back to round one.</div>
              </div>
              <button className="bw-btn bw-btn-danger" onClick={restartNow} type="button">
                Restart
              </button>
            </div>
          </div>
          <div className="bw-danger-card">
            <div className="bw-danger-card-header">
              <div>
                <div className="bw-danger-card-title">Force End Current Round</div>
                <div className="bw-danger-card-desc">Immediately closes voting with the current results.</div>
              </div>
              <button className="bw-btn bw-btn-danger" onClick={advanceNow} type="button">
                Force End
              </button>
            </div>
          </div>
          <div className="bw-danger-card">
            <div className="bw-danger-card-header">
              <div>
                <div className="bw-danger-card-title">Shut Down Public Link</div>
                <div className="bw-danger-card-desc">Disables public voting for this bracket.</div>
              </div>
              <button className="bw-btn bw-btn-danger-solid" onClick={shutDownNow} type="button">
                Shut Down
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="bw-section-panel active">
        <div className="bw-panel-title">Live Tournament</div>
        <p className="bw-panel-sub">
          {snapshot.title} · {currentRound ? `${currentRound.label}` : "Bracket complete"}
        </p>
        <div className="bw-stats-row">
          <div className="bw-stat-card">
            <div className="bw-stat-val lime">{snapshot.currentRoundUniqueVoters}</div>
            <div className="bw-stat-label">Votes cast</div>
          </div>
          <div className="bw-stat-card">
            <div className="bw-stat-val coral">{pendingRosterCount}</div>
            <div className="bw-stat-label">Yet to vote</div>
          </div>
          <div className="bw-stat-card">
            <div className="bw-stat-val">{turnout}%</div>
            <div className="bw-stat-label">Turnout</div>
          </div>
          <div className="bw-stat-card">
            <div className="bw-stat-val gold" suppressHydrationWarning>
              {currentRound?.status === "live" && hydrated
                ? formatCountdown(currentRound.endsAt, nowTick)
                : snapshot.status}
            </div>
            <div className="bw-stat-label">Time left</div>
          </div>
        </div>
        {primaryMatchup ? (
          <div className="bw-card">
            <div className="bw-card-title">Current Matchup</div>
            {renderResultBars(primaryMatchup)}
            <p className="bw-muted">
              {snapshot.currentRoundUniqueVoters} of {snapshot.totalPlayers} roster members have voted
            </p>
          </div>
        ) : null}
        <div className="bw-card">
          <div className="bw-card-title">Quick Actions</div>
          <div className="bw-btn-row">
            {!snapshot.isCurrentPublic && snapshot.status !== "disabled" ? (
              <button className="bw-btn bw-btn-lime" onClick={makeCurrentPublicNow} type="button">
                Make Current Public Bracket
              </button>
            ) : null}
            <button className="bw-btn bw-btn-lime" onClick={() => setAdminSection("advance")} type="button">
              Advance to Next Round
            </button>
            <button className="bw-btn bw-btn-outline" onClick={() => setAdminSection("roster")} type="button">
              View Who&apos;s Voted
            </button>
            <button className="bw-btn bw-btn-outline" onClick={() => setAdminSection("results")} type="button">
              Full Results
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (mode === "admin") {
    return (
      <div className="bw-admin-app">
        <nav className="bw-admin-nav" aria-label="Admin">
          <div className="bw-nav-logo">
            Bored<span>@Work</span>
          </div>
          <span className="bw-nav-badge">Admin</span>
          <div className="bw-nav-tabs">
            <button
              className={`bw-nav-tab ${adminSection === "live" ? "active" : ""}`}
              onClick={() => setAdminSection("live")}
              type="button"
            >
              Live
            </button>
            <a className="bw-nav-tab" href={createNewBracketHref}>
              + New Tournament
            </a>
            <button
              className={`bw-nav-tab ${adminSection === "history" ? "active" : ""}`}
              onClick={() => setAdminSection("history")}
              type="button"
            >
              History
            </button>
          </div>
        </nav>
        <div className="bw-admin-main">
          <aside className="bw-sidebar">
            <div className="bw-sidebar-label">Live Tournament</div>
            {[
              ["live", "Overview"],
              ["roster", "Who's Voted"],
              ["results", "Live Results"],
              ["advance", "Advance Round"],
              ["links", "Links"],
            ].map(([section, label]) => (
              <button
                className={`bw-sidebar-link ${adminSection === section ? "active" : ""}`}
                key={section}
                onClick={() => setAdminSection(section as AdminSection)}
                type="button"
              >
                <span>{label}</span>
                {section === "live" ? <span className="bw-sidebar-live-dot" /> : null}
              </button>
            ))}
            <div className="bw-sidebar-label">Setup</div>
            <a className="bw-sidebar-link" href={createNewBracketHref}>
              New Tournament
            </a>
            <button
              className={`bw-sidebar-link ${adminSection === "history" ? "active" : ""}`}
              onClick={() => setAdminSection("history")}
              type="button"
            >
              Past Tournaments
            </button>
            <div className="bw-sidebar-label">Danger</div>
            <button
              className={`bw-sidebar-link danger-link ${adminSection === "danger" ? "active" : ""}`}
              onClick={() => setAdminSection("danger")}
              type="button"
            >
              Danger Zone
            </button>
          </aside>
          <main className="bw-admin-content">
            {error ? <p className="bw-error-text">{error}</p> : null}
            {renderAdminSection()}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="bw-vote-app">
      {mode === "public" && !selectedRosterMemberId ? (
        <div className="bw-modal-backdrop" role="presentation">
          <section
            aria-labelledby="identity-modal-title"
            aria-modal="true"
            className="bw-modal"
            role="dialog"
          >
            <div className="bw-modal-title" id="identity-modal-title">
              Who are you?
            </div>
            <p className="bw-modal-sub">Pick your name to cast your vote. One vote per person.</p>
            <div className="bw-modal-roster">
              {snapshot.rosterMembers.map((member) => (
                <button
                  className="bw-roster-btn"
                  key={member.id}
                  onClick={() => handleRosterSelection(member.id)}
                  type="button"
                >
                  {member.name}
                </button>
              ))}
            </div>
            <p className="bw-modal-footnote">Not on the list? Talk to the admin.</p>
          </section>
        </div>
      ) : null}

      <nav className="bw-public-nav" aria-label="Tournament">
        <div className="bw-nav-logo">
          Bored<span>@Work</span>
        </div>
        <div className="bw-nav-topic">{snapshot.title}</div>
        <button className="bw-nav-identity" onClick={() => handleRosterSelection(null)} type="button">
          <span className="bw-nav-avatar">{selectedRosterMemberName?.slice(0, 1) ?? "?"}</span>
          <span>{selectedRosterMemberName ?? "Choose name"}</span>
        </button>
      </nav>

      <main className="bw-page">
        <header className="bw-topic-header">
          <div className="bw-topic-round-badge">
            <span className="bw-round-dot" />
            {currentRound ? currentRound.label : "Final results"}
          </div>
          <h1 className="bw-topic-title">{snapshot.title}</h1>
          <p className="bw-topic-meta">
            {snapshot.entrants.length} contenders · {snapshot.currentRoundUniqueVoters} / {snapshot.totalPlayers} voted
          </p>
          <p className="bw-topic-meta" suppressHydrationWarning>
            {hydrated ? currentRoundBanner.body : "Syncing round timing..."}
          </p>
        </header>

        {error ? <p className="bw-error-text">{error}</p> : null}

        {activeMatchups.length ? (
          activeMatchups.map((matchup) => renderPublicVote(matchup))
        ) : (
          <section className="bw-vote-section">
            <div className="bw-vote-prompt">{currentRoundBanner.title}</div>
            <p className="bw-muted bw-empty-message">{currentRoundBanner.body}</p>
          </section>
        )}

        <div className="bw-section-divider">
          <div className="bw-section-divider-line" />
          <div className="bw-section-divider-label">Full Bracket</div>
          <div className="bw-section-divider-line" />
        </div>

        {renderBracketBoard()}
      </main>
    </div>
  );
}
