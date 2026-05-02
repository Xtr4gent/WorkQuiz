import { updateStore } from "@/lib/workquiz/store";
import { RoundRecord } from "@/lib/workquiz/types";

const CLAIM_STALE_AFTER_MS = 10 * 60 * 1000;

interface RoundStartPingEvent {
  bracketId: string;
  bracketTitle: string;
  publicToken: string;
  roundId: string;
  roundLabel: string;
  roundNumber: number;
  claimedAt: string;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldClaimRound(round: RoundRecord, nowMs: number) {
  if (round.status !== "live" || round.roundStartPingedAt) {
    return false;
  }

  if (!round.roundStartPingClaimedAt) {
    return true;
  }

  return nowMs - new Date(round.roundStartPingClaimedAt).getTime() > CLAIM_STALE_AFTER_MS;
}

async function pingRoundStart(url: string, retries = 3, retryDelayMs = 5000) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        return true;
      }
    } catch {
      // Retry below. Failed pings should not break voting or round advancement.
    }

    if (attempt < retries) {
      await delay(retryDelayMs);
    }
  }

  return false;
}

async function claimPendingRoundStartPings() {
  const claimedAt = new Date().toISOString();
  const nowMs = Date.now();
  const events: RoundStartPingEvent[] = [];

  await updateStore((store) => {
    for (const bracket of store.brackets) {
      if (!bracket.isCurrentPublic || bracket.status === "disabled") {
        continue;
      }

      for (const round of bracket.rounds) {
        if (!shouldClaimRound(round, nowMs)) {
          continue;
        }

        round.roundStartPingClaimedAt = claimedAt;
        events.push({
          bracketId: bracket.id,
          bracketTitle: bracket.title,
          publicToken: bracket.publicToken,
          roundId: round.id,
          roundLabel: round.label,
          roundNumber: round.number,
          claimedAt,
        });
      }
    }

    return store;
  });

  return events;
}

async function recordRoundStartPingResult(event: RoundStartPingEvent, succeeded: boolean) {
  const completedAt = new Date().toISOString();

  await updateStore((store) => {
    const bracket = store.brackets.find((entry) => entry.id === event.bracketId);
    const round = bracket?.rounds.find((entry) => entry.id === event.roundId);

    if (!round || round.roundStartPingClaimedAt !== event.claimedAt) {
      return store;
    }

    if (succeeded) {
      round.roundStartPingedAt = completedAt;
    }

    delete round.roundStartPingClaimedAt;
    return store;
  });
}

export async function pingPendingRoundStarts() {
  const roundStartPingUrl = process.env.WORKQUIZ_ROUND_START_PING_URL;
  if (!roundStartPingUrl) {
    return;
  }

  const events = await claimPendingRoundStartPings();

  for (const event of events) {
    const succeeded = await pingRoundStart(roundStartPingUrl);
    await recordRoundStartPingResult(event, succeeded);

    if (!succeeded) {
      console.warn(
        `Round-start ping failed for ${event.bracketTitle} ${event.roundLabel} (${event.publicToken}).`,
      );
    }
  }
}

export function schedulePendingRoundStartPings() {
  if (!process.env.WORKQUIZ_ROUND_START_PING_URL) {
    return;
  }

  void pingPendingRoundStarts().catch((error) => {
    console.error("Round-start ping failed.", error);
  });
}
