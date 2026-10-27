import { neon } from "@neondatabase/serverless";

export const sql = () => neon(process.env.DATABASE_URL);

let ready = false;
export async function ensureSchema(q) {
  if (ready) return;
  await q`CREATE TABLE IF NOT EXISTS captured_numbers (
    phone TEXT PRIMARY KEY,
    last_captured_at TIMESTAMPTZ NOT NULL
  )`;
  await q`CREATE TABLE IF NOT EXISTS contacts (
    name_key TEXT PRIMARY KEY,
    phone TEXT NOT NULL
  )`;
  ready = true;
}

// The 3-day rule, in one atomic statement.
// Returns true only if the key is new, or was last captured MORE than 3 days ago.
// Returns false (skip) if it was captured within the last 3 days.
export async function claimNumber(q, key) {
  const rows = await q`INSERT INTO captured_numbers (phone, last_captured_at)
    VALUES (${key}, now())
    ON CONFLICT (phone) DO UPDATE SET last_captured_at = now()
    WHERE captured_numbers.last_captured_at <= now() - interval '3 days'
    RETURNING phone`;
  return rows.length > 0;
}

// Used if writing to the sheet fails, so the number is captured again next time.
export async function releaseNumber(q, key) {
  await q`UPDATE captured_numbers SET last_captured_at = to_timestamp(0) WHERE phone = ${key}`;
}

export async function loadContacts(q) {
  const rows = await q`SELECT name_key, phone FROM contacts`;
  return new Map(rows.map((r) => [r.name_key, r.phone]));
}

export async function saveContacts(q, list) {
  const CHUNK = 1500;
  for (let i = 0; i < list.length; i += CHUNK) {
    const part = list.slice(i, i + CHUNK);
    await q`INSERT INTO contacts (name_key, phone)
      SELECT * FROM unnest(${part.map((c) => c.key)}::text[], ${part.map((c) => c.phone)}::text[])
      ON CONFLICT (name_key) DO UPDATE SET phone = EXCLUDED.phone`;
  }
}
