import fs from "node:fs";
import path from "node:path";

import { StoreShape } from "@/lib/workquiz/types";
import { nanoid } from "nanoid";

const dataDirectory = path.join(process.cwd(), "data");
const dataFile = path.join(dataDirectory, "workquiz.json");

function initialStore(): StoreShape {
  return {
    brackets: [],
  };
}

export function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(initialStore(), null, 2), "utf8");
  }
}

export function readStore(): StoreShape {
  ensureStore();
  const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8")) as StoreShape;
  let changed = false;

  for (const bracket of parsed.brackets as Array<
    StoreShape["brackets"][number] & { rosterMembers?: Array<{ id: string; name: string }> }
  >) {
    if (!bracket.rosterMembers?.length) {
      bracket.rosterMembers = Array.from({ length: bracket.totalPlayers ?? 0 }, (_, index) => ({
        id: `legacy-roster-${index + 1}-${nanoid(6)}`,
        name: `Player ${index + 1}`,
      }));
      changed = true;
    }
  }

  if (changed) {
    writeStore(parsed);
  }

  return parsed;
}

export function writeStore(store: StoreShape) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2), "utf8");
}

export function updateStore(mutator: (store: StoreShape) => StoreShape) {
  const current = readStore();
  const next = mutator(current);
  writeStore(next);
  return next;
}
