"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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

export function CreateBracketForm() {
  const router = useRouter();
  const [title, setTitle] = useState("Best Chocolate Bar");
  const [entrantsText, setEntrantsText] = useState(
    "Mars\nKit Kat\nCoffee Crisp\nReese's\nTwix\nSnickers\nOh Henry!\nAero",
  );
  const [seedingMode, setSeedingMode] = useState<"manual" | "random">("manual");
  const [startsAt, setStartsAt] = useState(() =>
    toLocalDateTimeValue(new Date(Date.now() + 30 * 60 * 1000)),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const entrants = useMemo(() => parseEntrantsFromText(entrantsText), [entrantsText]);

  function updateEntrants(next: string[]) {
    setEntrantsText(next.join("\n"));
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    const payload = {
      title: String(formData.get("title") ?? ""),
      entrants,
      seedingMode,
      startsAt: new Date(String(formData.get("startsAt"))).toISOString(),
      roundDurationHours,
    };

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
          Paste the entrants, set the round one start, and choose whether you want a
          strict seed order or a totally chaotic draw.
        </p>
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
        <span>Entrants, one per line</span>
        <textarea
          rows={10}
          value={entrantsText}
          onChange={(event) => setEntrantsText(event.target.value)}
        />
      </label>

      <div className="seed-mode">
        <button
          className={seedingMode === "manual" ? "pill active" : "pill"}
          onClick={() => setSeedingMode("manual")}
          type="button"
        >
          Manual seeding
        </button>
        <button
          className={seedingMode === "random" ? "pill active" : "pill"}
          onClick={() => setSeedingMode("random")}
          type="button"
        >
          Random draw
        </button>
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

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" disabled={isPending} type="submit">
        {isPending ? "Creating bracket..." : "Create bracket"}
      </button>
    </form>
  );
}
