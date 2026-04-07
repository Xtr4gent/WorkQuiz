"use client";

import { useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from "react";

import { BracketSnapshot } from "@/lib/workquiz/types";

function roundStatusLabel(startsAt: string, endsAt: string, status: string) {
  if (status === "live") {
    return `Live until ${new Date(endsAt).toLocaleString()}`;
  }

  if (status === "upcoming") {
    return `Starts ${new Date(startsAt).toLocaleString()}`;
  }

  return `Closed ${new Date(endsAt).toLocaleString()}`;
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
    return `${days}d ${hours}h ${minutes}m`;
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
  const hydrated = useHydrated();

  const refresh = useEffectEvent(async () => {
    const url = mode === "admin" ? `/api/admin/${adminToken}` : `/api/brackets/${token}`;
    const response = await fetch(url, { cache: "no-store" });
    const result = (await response.json()) as BracketSnapshot & { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not refresh the bracket.");
      return;
    }

    setSnapshot(result);
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
  }, [adminToken, mode, token]);

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

  const currentRoundBanner = useMemo(() => {
    if (!currentRound) {
      return {
        title: "Bracket complete",
        body: "The final round is over. Time to celebrate the winner.",
      };
    }

    if (currentRound.status === "live") {
      return {
        title: `Round ${currentRound.number} is live`,
        body: `Voting closes in ${formatCountdown(currentRound.endsAt, nowTick)}.`,
      };
    }

    if (currentRound.status === "upcoming") {
      return {
        title: `Round ${currentRound.number} has not opened yet`,
        body: `Voting opens ${hydrated ? new Date(currentRound.startsAt).toLocaleString() : "soon"}.`,
      };
    }

    return {
      title: `Round ${currentRound.number} is closed`,
      body: "Results are locked in while the bracket syncs the next stage.",
    };
  }, [currentRound, hydrated, nowTick]);

  async function vote(matchupId: string, entrantId: string) {
    setError(null);
    const response = await fetch(`/api/brackets/${token}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchupId, entrantId }),
    });
    const result = (await response.json()) as BracketSnapshot & { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Vote failed.");
      return;
    }

    setSnapshot(result);
  }

  async function advanceNow() {
    if (!adminToken) {
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

  return (
    <div className="stack-lg">
      <section className="panel board-header">
        <div className="stack-sm">
          <span className="eyebrow">{mode === "admin" ? "Admin Control" : "Live Bracket"}</span>
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

      <section className="panel status-banner">
        <div className="stack-sm">
          <span className="eyebrow">{mode === "admin" ? "Round Timing" : "Current Round"}</span>
          <h2>{currentRoundBanner.title}</h2>
          <p className="muted">{currentRoundBanner.body}</p>
        </div>
      </section>

      {mode === "admin" ? (
        <section className="panel stack-sm">
          <div className="inline-row">
            <h2>Admin links</h2>
            <button className="secondary-button" onClick={advanceNow} type="button">
              Force advance now
            </button>
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

      {error ? <p className="error-text">{error}</p> : null}

      <section className="round-grid">
        {snapshot.rounds.map((round) => (
          <article className={`round-panel ${currentRound?.id === round.id ? "current" : ""}`} key={round.id}>
            <div className="round-title">
              <div>
                <span className="eyebrow">{round.label}</span>
                <h2>Round {round.number}</h2>
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
                return (
                  <div className="matchup-card" key={matchup.id}>
                    <button
                      className={`entrant-button ${winnerA ? "winner" : ""}`}
                      disabled={!matchup.voteState.canVote || !matchup.entrantA}
                      onClick={() => matchup.entrantA && vote(matchup.id, matchup.entrantA.id)}
                      type="button"
                    >
                      <span>
                        {matchup.entrantA ? `#${matchup.entrantA.seed} ${matchup.entrantA.name}` : "BYE"}
                      </span>
                      <strong>{matchup.votesA}</strong>
                    </button>
                    <button
                      className={`entrant-button ${winnerB ? "winner" : ""}`}
                      disabled={!matchup.voteState.canVote || !matchup.entrantB}
                      onClick={() => matchup.entrantB && vote(matchup.id, matchup.entrantB.id)}
                      type="button"
                    >
                      <span>
                        {matchup.entrantB ? `#${matchup.entrantB.seed} ${matchup.entrantB.name}` : "BYE"}
                      </span>
                      <strong>{matchup.votesB}</strong>
                    </button>

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
