"use client";

import { useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from "react";

import { BracketSnapshot } from "@/lib/workquiz/types";

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

function roundStatusLabel(startsAt: string, endsAt: string, status: string) {
  if (status === "live") {
    return `Live until ${formatEasternDateTime(endsAt)}`;
  }

  if (status === "upcoming") {
    return `Starts ${formatEasternDateTime(startsAt)}`;
  }

  return `Closed ${formatEasternDateTime(endsAt)}`;
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
  const [connectionState, setConnectionState] = useState<"live" | "retrying">("retrying");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [pendingVotes, setPendingVotes] = useState<Record<string, string>>({});
  const [selectedRosterMemberId, setSelectedRosterMemberId] = useState<string | null>(
    initialSnapshot.selectedRosterMemberId ?? null,
  );
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

    ws.addEventListener("open", () => {
      setConnectionState("live");
    });

    ws.addEventListener("message", () => {
      void refresh();
    });

    ws.addEventListener("close", () => {
      setConnectionState("retrying");
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

  const reuseTemplateBase = useMemo(() => {
    if (!adminToken) {
      return null;
    }

    return `/?adminToken=${encodeURIComponent(adminToken)}`;
  }, [adminToken]);

  const currentRoundBanner = useMemo(() => {
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
  }, [currentRound, hydrated, nowTick]);

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

  return (
    <div className="stack-lg">
      {mode === "public" && !selectedRosterMemberId ? (
        <div className="identity-modal-backdrop" role="presentation">
          <section
            aria-labelledby="identity-modal-title"
            aria-modal="true"
            className="identity-modal panel stack-md"
            role="dialog"
          >
            <div className="stack-sm">
              <span className="eyebrow">Who Are You?</span>
              <h2 id="identity-modal-title">Choose your name to enter the bracket.</h2>
              <p className="muted">
                Pick your name once and we&apos;ll remember it on this browser next time.
              </p>
            </div>
            <label className="field">
              <span className="sr-only">Select your name</span>
              <select
                autoFocus
                className="identity-select identity-modal-select"
                value={selectedRosterMemberId ?? ""}
                onChange={(event) => handleRosterSelection(event.target.value || null)}
              >
                <option value="">Choose your name</option>
                {snapshot.rosterMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>
      ) : null}

      {mode === "admin" ? (
        <section className="panel board-header">
          <div className="stack-sm">
            <span className="eyebrow">Admin Control</span>
            <h1>{snapshot.title}</h1>
            <p className="muted">
              {snapshot.status === "completed"
                ? "The champion has been crowned."
                : "Real-time bracket drama for the office chat."}
            </p>
          </div>
          <div className="metrics">
            <div>
              <span>Total votes</span>
              <strong>{snapshot.totalVotes}</strong>
            </div>
            <div>
              <span>Connection</span>
              <strong>{connectionState === "live" ? "WebSocket live" : "Polling backup"}</strong>
            </div>
          </div>
        </section>
      ) : (
        <section className="public-summary-grid">
          <div className="panel public-vote-stat">
            <span className="eyebrow">Participation</span>
            <strong>
              {snapshot.currentRoundUniqueVoters} / {snapshot.totalPlayers} voted
            </strong>
          </div>
          <div className="panel identity-panel stack-sm">
            <span className="eyebrow">Who Are You?</span>
            <label className="field">
              <span className="sr-only">Select your name</span>
              <select
                className="identity-select"
                value={selectedRosterMemberId ?? ""}
                onChange={(event) => handleRosterSelection(event.target.value || null)}
              >
                <option value="">Choose your name</option>
                {snapshot.rosterMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      <section className="panel status-banner">
        <div className="stack-sm">
          <span className="eyebrow">{mode === "admin" ? "Round Timing" : "Current Round"}</span>
          <h2>{currentRoundBanner.title}</h2>
          <p className="muted">{currentRoundBanner.body}</p>
          {mode === "admin" ? <p className="muted">All times shown in Eastern Time.</p> : null}
        </div>
      </section>

      {mode === "admin" ? (
        <section className="panel stack-sm">
          <div className="inline-row">
            <h2>Admin links</h2>
            <div className="admin-actions">
              <button className="secondary-button" onClick={advanceNow} type="button">
                Force advance now
              </button>
              <button className="danger-button" onClick={restartNow} type="button">
                Restart bracket
              </button>
            </div>
          </div>
          <div className="link-stack">
            <div>
              <span className="muted">Public voting link</span>
              <code>{displayPublicUrl}</code>
            </div>
            {displayAdminUrl ? (
              <div>
                <span className="muted">Secret admin link</span>
                <code>{displayAdminUrl}</code>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {mode === "admin" ? (
        <section className="panel stack-sm">
          <div className="inline-row">
            <h2>Previous topics</h2>
            <span className="muted">Only admins see this history.</span>
          </div>
          {snapshot.adminHistory?.length ? (
            <div className="history-list">
              {snapshot.adminHistory.map((item) => (
                <div className="history-item" key={item.id}>
                  <div className="stack-sm">
                    <strong>{item.title}</strong>
                    <span className="muted">
                      Winner: {item.winnerName} • {formatEasternDateTime(item.completedAt)}
                    </span>
                  </div>
                  {reuseTemplateBase ? (
                    <a
                      className="secondary-button"
                      href={`${reuseTemplateBase}&template=${encodeURIComponent(item.id)}`}
                    >
                      Reuse this topic
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Previous winners will show up here once you finish a bracket.</p>
          )}
        </section>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      {mode === "public" ? (
        <section className="panel stack-sm">
          <div className="inline-row">
            <h2>Voted?</h2>
            <span className="muted">Green means done for this round. Red means still pending.</span>
          </div>
          <div className="roster-board">
            {snapshot.currentRoundRosterStatuses.map((member) => (
              <div
                className={`roster-chip ${member.hasVoted ? "voted" : "pending"} ${
                  member.rosterMemberId === selectedRosterMemberId ? "current-person" : ""
                }`}
                key={member.rosterMemberId}
              >
                <span>{member.name}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="round-grid">
        {snapshot.rounds.map((round) => (
          <article className={`round-panel ${currentRound?.id === round.id ? "current" : ""}`} key={round.id}>
            <div className="round-title">
              <div>
                <span className="eyebrow">Stage {round.number}</span>
                <h2>{round.label}</h2>
              </div>
              <span className="muted" suppressHydrationWarning>
                {hydrated
                  ? roundStatusLabel(round.startsAt, round.endsAt, round.status)
                  : "Syncing round timing..."}
              </span>
            </div>

            <div className="matchup-list">
              {round.matchups.map((matchup) => {
                const winnerA = matchup.winnerEntrantId && matchup.entrantA?.id === matchup.winnerEntrantId;
                const winnerB = matchup.winnerEntrantId && matchup.entrantB?.id === matchup.winnerEntrantId;
                const selectedEntrantId = pendingVotes[matchup.id] ?? matchup.voteState.votedEntrantId;
                const canSubmitVote =
                  matchup.voteState.canVote &&
                  !!selectedRosterMemberId &&
                  !!selectedEntrantId &&
                  selectedEntrantId !== matchup.voteState.votedEntrantId;
                return (
                  <div className="matchup-card" key={matchup.id}>
                    <button
                      className={`entrant-button ${winnerA ? "winner" : ""} ${
                        selectedEntrantId === matchup.entrantA?.id ? "selected" : ""
                      }`}
                      disabled={!selectedRosterMemberId || !matchup.voteState.canVote || !matchup.entrantA}
                      onClick={() =>
                        matchup.entrantA &&
                        setPendingVotes((current) => ({
                          ...current,
                          [matchup.id]: matchup.entrantA!.id,
                        }))
                      }
                      type="button"
                    >
                      <span>
                        {matchup.entrantA ? `#${matchup.entrantA.seed} ${matchup.entrantA.name}` : "BYE"}
                      </span>
                      <strong>{matchup.votesA}</strong>
                    </button>
                    <button
                      className={`entrant-button ${winnerB ? "winner" : ""} ${
                        selectedEntrantId === matchup.entrantB?.id ? "selected" : ""
                      }`}
                      disabled={!selectedRosterMemberId || !matchup.voteState.canVote || !matchup.entrantB}
                      onClick={() =>
                        matchup.entrantB &&
                        setPendingVotes((current) => ({
                          ...current,
                          [matchup.id]: matchup.entrantB!.id,
                        }))
                      }
                      type="button"
                    >
                      <span>
                        {matchup.entrantB ? `#${matchup.entrantB.seed} ${matchup.entrantB.name}` : "BYE"}
                      </span>
                      <strong>{matchup.votesB}</strong>
                    </button>

                    {mode === "public" && matchup.voteState.canVote ? (
                      <button
                        className="inline-button vote-confirm-button"
                        disabled={!canSubmitVote}
                        onClick={() => selectedEntrantId && vote(matchup.id, selectedEntrantId)}
                        type="button"
                      >
                        {selectedEntrantId ? "Vote for selected option" : "Select an option to vote"}
                      </button>
                    ) : null}

                    {mode === "public" && !selectedRosterMemberId ? (
                      <p className="muted">Choose your name above to unlock voting.</p>
                    ) : null}

                    <div className="matchup-meta">
                      <span>{matchup.totalVotes} total votes</span>
                      {matchup.voteState.votedEntrantId ? <span>Your vote is locked in</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
