import fs from "node:fs";
import path from "node:path";

import { Pool } from "pg";

import { StoreShape } from "@/lib/workquiz/types";

const sourcePath = process.argv[2] ?? path.join(process.cwd(), "data", "workquiz.json");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to migrate WorkQuiz data to Postgres.");
}

if (!fs.existsSync(sourcePath)) {
  throw new Error(`WorkQuiz JSON store not found: ${sourcePath}`);
}

const store = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as StoreShape;

if (!Array.isArray(store.brackets)) {
  throw new Error("Invalid WorkQuiz JSON store: expected a brackets array.");
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workquiz_store (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(
    `
      INSERT INTO workquiz_store (id, data, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (id)
      DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `,
    ["default", JSON.stringify(store)],
  );

  console.log(`Migrated ${store.brackets.length} WorkQuiz bracket(s) from ${sourcePath} to Postgres.`);
} finally {
  await pool.end();
}
