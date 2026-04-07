import fs from "node:fs";
import path from "node:path";

import { StoreShape } from "@/lib/workquiz/types";

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
  return JSON.parse(fs.readFileSync(dataFile, "utf8")) as StoreShape;
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
