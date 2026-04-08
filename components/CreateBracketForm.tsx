"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BracketSnapshot, SeedingMode } from "@/lib/workquiz/types";
import { parseEntrantsFromText } from "@/lib/workquiz/utils";

const roundDurationHours = 24 * 7;

function toLocalDateTimeValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().slice(0, 16);
}

function move(items: string[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function shufflePreview(items: string[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function CreateBracketForm({
  initialTemplate,
}: {
  initialTemplate?: {
    title: string;
    entrants: string[];
    rosterMembers: string[];
    seedingMode: SeedingMode;
    sourceTitle?: string;
  } | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTemplate?.title ?? "Best Chocolate Bar");
  const [entrantsText, setEntrantsText] = useState(
    initialTemplate?.entrants.join("\n") ??
      "Mars\nKit Kat\nCoffee Crisp\nReese's\nTwix\nSnickers\nOh Henry!\nAero",
  );
  const [rosterText, setRosterText] = useState(
    initialTemplate?.rosterMembers.join("\n") ??
      "Gabe\nAlex\nJordan\nSam\nPriya\nMaya\nLuca\nTaylor",
  );
  const [seedingMode, setSeedingMode] = useState<SeedingMode>(initialTemplate?.seedingMode ?? "manual");
  const [startsAt, setStartsAt] = useState(() =>
    toLocalDateTimeValue(new Date(Date.now() + 30 * 60 * 1000)),
  );
  const [endsAt, setEndsAt] = useState(() =>
    toLocalDateTimeValue(new Date(Date.now() + (30 + roundDurationHours * 60) * 60 * 1000)),
  );
  const [previewSeededEntrants, setPreviewSeededEntrants] = useState<string[]>(() =>
    initialTemplate?.seedingMode === "random"
      ? shufflePreview(initialTemplate.entrants)
      : initialTemplate?.entrants ?? parseEntrantsFromText(entrantsText),
  );
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSnapshot, setPreviewSnapshot] = useState<BracketSnapshot | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const entrants = useMemo(() => parseEntrantsFromText(entrantsText), [entrantsText]);
  const rosterMembers = useMemo(() => parseEntrantsFromText(rosterText), [rosterText]);
  const previewIsValid = useMemo(() => {
    const startsAtIso = new Date(startsAt).toISOString();
    const endsAtIso = new Date(endsAt).toISOString();

    return (
      !!title.trim() &&
      entrants.length >= 2 &&
      rosterMembers.length >= 2 &&
      !Number.isNaN(new Date(startsAtIso).getTime()) &&
      !Number.isNaN(new Date(endsAtIso).getTime()) &&
      new Date(endsAtIso).getTime() > new Date(startsAtIso).getTime() &&
      new Set(rosterMembers.map((member) => member.toLowerCase())).size === rosterMembers.length
    );
  }, [endsAt, entrants.length, rosterMembers, startsAt, title]);

  useEffect(() => {
    if (!previewIsValid) {
      return;
    }

    const startsAtIso = new Date(startsAt).toISOString();
    const endsAtIso = new Date(endsAt).toISOString();

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsPreviewLoading(true);
      const response = await fetch("/api/brackets/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          entrants,
          rosterMembers,
          seededEntrants: previewSeededEntrants,
          seedingMode,
          startsAt: startsAtIso,
          endsAt: endsAtIso,
        }),
        signal: controller.signal,
      }).catch(() => null);

      if (!response) {
        setIsPreviewLoading(false);
        return;
      }

      const result = (await response.json()) as BracketSnapshot & { error?: string };
      if (!response.ok) {
        setPreviewSnapshot(null);
        setPreviewError(result.error ?? "Could not render the preview yet.");
        setIsPreviewLoading(false);
        return;
      }

      setPreviewSnapshot(result);
      setPreviewError(null);
      setIsPreviewLoading(false);
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [endsAt, entrants, previewIsValid, previewSeededEntrants, rosterMembers, seedingMode, startsAt, title]);

  function updateEntrants(next: string[]) {
    setEntrantsText(next.join("\n"));
    setPreviewSeededEntrants(seedingMode === "random" ? shufflePreview(next) : next);
  }

  function reshufflePreview() {
    setPreviewSeededEntrants(shufflePreview(entrants));
  }

  function handleEntrantsTextChange(value: string) {
    setEntrantsText(value);
    const nextEntrants = parseEntrantsFromText(value);
    setPreviewSeededEntrants(seedingMode === "random" ? shufflePreview(nextEntrants) : nextEntrants);
  }

  function handleRosterTextChange(value: string) {
    setRosterText(value);
  }

  function handleSeedingModeChange(nextMode: SeedingMode) {
    setSeedingMode(nextMode);
    setPreviewSeededEntrants(nextMode === "random" ? shufflePreview(entrants) : entrants);
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    const payload = {
      title: String(formData.get("title") ?? ""),
      entrants,
      rosterMembers,
      seededEntrants: previewSeededEntrants,
      seedingMode,
      startsAt: new Date(String(formData.get("startsAt"))).toISOString(),
      endsAt: new Date(String(formData.get("endsAt"))).toISOString(),
    };

    if (new Date(payload.endsAt).getTime() <= new Date(payload.startsAt).getTime()) {
      setError("Round one end time must be later than the start time.");
      return;
    }

    if (payload.rosterMembers.length < 2) {
      setError("Add at least two roster members.");
      return;
    }

    if (new Set(payload.rosterMembers.map((member) => member.toLowerCase())).size !== payload.rosterMembers.length) {
      setError("Roster names must be unique.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string; adminUrl?: string };

      if (!response.ok || !result.adminUrl) {
        setError(result.error ?? "Could not create the bracket.");
        return;
      }

      router.push(result.adminUrl);
    });
  }

  return (
    <form action={handleSubmit} className="panel stack-lg">
      <div className="stack-sm">
        <span className="eyebrow">Start A Bracket</span>
        <h2>Make the next office showdown in under ten minutes.</h2>
        <p className="muted">
          Paste the entrants, set the round one start, and preview the full board before
          anything goes live.
        </p>
        {initialTemplate?.sourceTitle ? (
          <p className="muted">Loaded from previous topic: {initialTemplate.sourceTitle}</p>
        ) : null}
      </div>

      <label className="field">
        <span>Bracket title</span>
        <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>

      <label className="field">
        <span>Round one opens</span>
        <input
          type="datetime-local"
          name="startsAt"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Round one closes</span>
        <input
          type="datetime-local"
          name="endsAt"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Entrants, one per line</span>
        <textarea
          rows={10}
          value={entrantsText}
          onChange={(event) => handleEntrantsTextChange(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Team roster, one person per line</span>
        <textarea
          rows={8}
          value={rosterText}
          onChange={(event) => handleRosterTextChange(event.target.value)}
        />
      </label>

      <div className="seed-mode">
        <button
          className={seedingMode === "manual" ? "pill active" : "pill"}
          onClick={() => handleSeedingModeChange("manual")}
          type="button"
        >
          Manual seeding
        </button>
        <button
          className={seedingMode === "random" ? "pill active" : "pill"}
          onClick={() => handleSeedingModeChange("random")}
          type="button"
        >
          Random draw
        </button>
        {seedingMode === "random" ? (
          <button className="pill" onClick={reshufflePreview} type="button">
            Reshuffle preview
          </button>
        ) : null}
      </div>

      {seedingMode === "manual" ? (
        <div className="stack-sm">
          <div className="inline-row">
            <h3>Seed preview</h3>
            <span className="muted">Up and down is enough for V1. Fast beats fancy.</span>
          </div>
          <div className="seed-list">
            {entrants.map((entrant, index) => (
              <div className="seed-item" key={`${entrant}-${index}`}>
                <strong>#{index + 1}</strong>
                <span>{entrant}</span>
                <div className="seed-actions">
                  <button
                    disabled={index === 0}
                    onClick={() => updateEntrants(move(entrants, index, Math.max(0, index - 1)))}
                    type="button"
                  >
                    Up
                  </button>
                  <button
                    disabled={index === entrants.length - 1}
                    onClick={() =>
                      updateEntrants(move(entrants, index, Math.min(entrants.length - 1, index + 1)))
                    }
                    type="button"
                  >
                    Down
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <section className="preview-panel stack-sm">
        <div className="inline-row">
          <div className="stack-sm">
            <span className="eyebrow">Live Preview</span>
            <h3>Check the full bracket before you create it.</h3>
          </div>
          {isPreviewLoading ? <span className="muted">Updating preview...</span> : null}
        </div>

        {previewIsValid && previewError ? <p className="error-text">{previewError}</p> : null}

        {previewIsValid && previewSnapshot ? (
          <div className="stack-md">
            <div className="preview-summary">
              <strong>{previewSnapshot.title}</strong>
              <span className="muted">
                {previewSnapshot.rosterMembers.length} players, {previewSnapshot.rounds.length} rounds
              </span>
            </div>
            <div className="round-grid">
              {previewSnapshot.rounds.map((round) => (
                <article className="round-panel" key={round.id}>
                  <div className="round-title">
                    <div>
                      <span className="eyebrow">Stage {round.number}</span>
                      <h2>{round.label}</h2>
                    </div>
                  </div>
                  <div className="matchup-list">
                    {round.matchups.map((matchup) => (
                      <div className="matchup-card" key={matchup.id}>
                        <div className="entrant-button preview-entrant">
                          <span>
                            {matchup.entrantA
                              ? `#${matchup.entrantA.seed} ${matchup.entrantA.name}`
                              : "BYE"}
                          </span>
                        </div>
                        <div className="entrant-button preview-entrant">
                          <span>
                            {matchup.entrantB
                              ? `#${matchup.entrantB.seed} ${matchup.entrantB.name}`
                              : "BYE"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="muted">
            Add a title, at least two entrants, a unique team roster, and valid round timing to
            see the full bracket preview.
          </p>
        )}
      </section>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" disabled={isPending} type="submit">
        {isPending ? "Creating bracket..." : "Create bracket"}
      </button>
    </form>
  );
}
