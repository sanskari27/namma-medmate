import { createHash, randomBytes, randomInt } from "crypto";
import { Pool, type PoolClient } from "pg";
import { fromPaise, toPaise } from "../app/lib/paise";
import { fail } from "./errors";
import { absorbFiles } from "./files";
import { stripDemo, type PharmacyState } from "./state";
import type { BusinessType } from "./types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS pharmacies (
  id uuid PRIMARY KEY,
  phone text UNIQUE NOT NULL,
  business_type text NOT NULL,
  setup_complete boolean NOT NULL DEFAULT false,
  pricing_pin text NOT NULL,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  phone text NOT NULL,
  pricing_unlocked boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS idempotency (
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  key text NOT NULL,
  request_hash text NOT NULL,
  status int NOT NULL,
  body jsonb NOT NULL,
  PRIMARY KEY (pharmacy_id, key)
);
CREATE TABLE IF NOT EXISTS files (
  id text PRIMARY KEY,
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  bytes bytea,
  s3_key text
);
CREATE TABLE IF NOT EXISTS staff_phones (
  phone text PRIMARY KEY,
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id text NOT NULL
);
CREATE TABLE IF NOT EXISTS otp_challenges (
  phone text PRIMARY KEY,
  cognito_session text,
  expires_at timestamptz NOT NULL
);
`;

let pool: Pool | undefined;
let ready: Promise<void> | undefined;

export function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") fail(500, "VALIDATION", "DATABASE_URL is required");
  return "postgres://pharmacy:pharmacy@127.0.0.1:5432/pharmacy";
}

export function getPool() {
  if (!pool) pool = new Pool({ connectionString: databaseUrl() });
  return pool;
}

export async function migrate() {
  if (!ready) {
    ready = (async () => {
      const client = await getPool().connect();
      try { await client.query(SCHEMA); } finally { client.release(); }
    })();
  }
  await ready;
}

export type SessionRow = {
  token: string;
  pharmacyId: string;
  userId: string;
  phone: string;
  pricingUnlocked: boolean;
  pricingPin: string;
  businessType: BusinessType;
  expiresAt: Date;
};

export function e164(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return "+91" + d;
  if (d.startsWith("91") && d.length === 12) return "+" + d;
  return (phone.trim().startsWith("+") ? "+" : "+") + d;
}

export function requestHash(method: string, path: string, raw: string) {
  return createHash("sha256").update(method + " " + path + "\n" + raw).digest("hex");
}

export async function findLogin(phone: string) {
  await migrate();
  const { rows } = await getPool().query(
    "SELECT pharmacy_id, user_id FROM staff_phones WHERE phone = $1",
    [e164(phone)],
  );
  return rows[0] as { pharmacy_id: string; user_id: string } | undefined;
}

export async function insertPharmacy(phone: string, businessType: BusinessType, state: PharmacyState) {
  await migrate();
  const id = crypto.randomUUID();
  const pin = String(randomInt(100000, 1000000));
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO pharmacies (id, phone, business_type, setup_complete, pricing_pin, state) VALUES ($1,$2,$3,$4,$5,$6)",
      [id, e164(phone), businessType, state.setupComplete, pin, JSON.stringify(toPaise(state))],
    );
    await syncPhones(client, id, state);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally { client.release(); }
  return { id, pin };
}

async function syncPhones(client: PoolClient, pharmacyId: string, state: PharmacyState) {
  await client.query("DELETE FROM staff_phones WHERE pharmacy_id = $1", [pharmacyId]);
  for (const user of state.users) {
    if (!user.phone || user.active === false) continue;
    try {
      await client.query("SAVEPOINT staff_phone");
      await client.query("INSERT INTO staff_phones (phone, pharmacy_id, user_id) VALUES ($1,$2,$3)", [e164(user.phone), pharmacyId, user.id]);
      await client.query("RELEASE SAVEPOINT staff_phone");
    } catch (err) {
      await client.query("ROLLBACK TO SAVEPOINT staff_phone");
      if ((err as { code?: string }).code === "23505") continue;
      throw err;
    }
  }
}

export async function createSession(pharmacyId: string, userId: string, phone: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 86400000);
  await getPool().query(
    "INSERT INTO sessions (token, pharmacy_id, user_id, phone, expires_at) VALUES ($1,$2,$3,$4,$5)",
    [token, pharmacyId, userId, e164(phone), expires],
  );
  return token;
}

export async function readSession(token: string | undefined): Promise<SessionRow | null> {
  if (!token) return null;
  await migrate();
  const { rows } = await getPool().query(
    `SELECT s.token, s.pharmacy_id, s.user_id, s.phone, s.pricing_unlocked, s.expires_at, p.pricing_pin, p.business_type
     FROM sessions s JOIN pharmacies p ON p.id = s.pharmacy_id WHERE s.token = $1`,
    [token],
  );
  const row = rows[0];
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;
  return {
    token: row.token, pharmacyId: row.pharmacy_id, userId: row.user_id, phone: row.phone,
    pricingUnlocked: row.pricing_unlocked, pricingPin: row.pricing_pin, businessType: row.business_type, expiresAt: row.expires_at,
  };
}

export async function destroySession(token: string) {
  await getPool().query("DELETE FROM sessions WHERE token = $1", [token]);
}

export async function setUnlocked(token: string, unlocked: boolean) {
  await getPool().query("UPDATE sessions SET pricing_unlocked = $2 WHERE token = $1", [token, unlocked]);
}

export async function loadState(pharmacyId: string): Promise<PharmacyState> {
  await migrate();
  const { rows } = await getPool().query("SELECT state FROM pharmacies WHERE id = $1", [pharmacyId]);
  if (!rows[0]) fail(404, "NOT_FOUND", "Pharmacy not found");
  const state = fromPaise(rows[0].state) as PharmacyState;
  if (stripDemo(state)) await replaceState(pharmacyId, state);
  return state;
}

export async function withState<T>(pharmacyId: string, fn: (state: PharmacyState) => T | Promise<T>): Promise<T> {
  await migrate();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT state FROM pharmacies WHERE id = $1 FOR UPDATE", [pharmacyId]);
    if (!rows[0]) fail(404, "NOT_FOUND", "Pharmacy not found");
    const state = fromPaise(rows[0].state) as PharmacyState;
    stripDemo(state);
    const result = await fn(state);
    const stored = await absorbFiles(client, pharmacyId, state);
    await client.query("UPDATE pharmacies SET state = $2, setup_complete = $3, business_type = $4, updated_at = now() WHERE id = $1", [
      pharmacyId, JSON.stringify(toPaise(stored)), stored.setupComplete, stored.businessType,
    ]);
    await syncPhones(client, pharmacyId, stored);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally { client.release(); }
}

export async function readIdempotent(pharmacyId: string, key: string, hash: string) {
  const { rows } = await getPool().query("SELECT request_hash, status, body FROM idempotency WHERE pharmacy_id = $1 AND key = $2", [pharmacyId, key]);
  const row = rows[0] as { request_hash: string; status: number; body: unknown } | undefined;
  if (!row) return null;
  if (row.request_hash !== hash) fail(409, "IDEMPOTENCY_REPLAY", "This idempotency key was already used for a different request");
  return { status: row.status, body: row.body };
}

export async function saveIdempotent(pharmacyId: string, key: string, hash: string, status: number, body: unknown) {
  await getPool().query(
    "INSERT INTO idempotency (pharmacy_id, key, request_hash, status, body) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
    [pharmacyId, key, hash, status, body],
  );
}

export async function withIdempotent<T>(pharmacyId: string, key: string, hash: string, run: (state: PharmacyState) => T, encodeResult: (result: T) => unknown) {
  await migrate();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query("SELECT state FROM pharmacies WHERE id = $1 FOR UPDATE", [pharmacyId]);
    if (!locked.rows[0]) fail(404, "NOT_FOUND", "Pharmacy not found");
    const prev = await client.query("SELECT request_hash, status, body FROM idempotency WHERE pharmacy_id = $1 AND key = $2", [pharmacyId, key]);
    const row = prev.rows[0] as { request_hash: string; status: number; body: unknown } | undefined;
    if (row) {
      if (row.request_hash !== hash) fail(409, "IDEMPOTENCY_REPLAY", "This idempotency key was already used for a different request");
      await client.query("COMMIT");
      return { status: row.status, body: row.body };
    }
    const state = fromPaise(locked.rows[0].state) as PharmacyState;
    const result = await run(state);
    const stored = await absorbFiles(client, pharmacyId, state);
    await client.query("UPDATE pharmacies SET state = $2, setup_complete = $3, business_type = $4, updated_at = now() WHERE id = $1", [
      pharmacyId, JSON.stringify(toPaise(stored)), stored.setupComplete, stored.businessType,
    ]);
    await syncPhones(client, pharmacyId, stored);
    const encoded = encodeResult(result);
    await client.query(
      "INSERT INTO idempotency (pharmacy_id, key, request_hash, status, body) VALUES ($1,$2,$3,$4,$5)",
      [pharmacyId, key, hash, 200, encoded],
    );
    await client.query("COMMIT");
    return { status: 200, body: encoded };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally { client.release(); }
}

export async function saveChallenge(phone: string, cognitoSession: string | null) {
  await migrate();
  await getPool().query(
    `INSERT INTO otp_challenges (phone, cognito_session, expires_at) VALUES ($1,$2, now() + interval '10 minutes')
     ON CONFLICT (phone) DO UPDATE SET cognito_session = EXCLUDED.cognito_session, expires_at = EXCLUDED.expires_at`,
    [e164(phone), cognitoSession],
  );
}

export async function takeChallenge(phone: string) {
  const { rows } = await getPool().query("DELETE FROM otp_challenges WHERE phone = $1 AND expires_at > now() RETURNING cognito_session", [e164(phone)]);
  return rows[0] as { cognito_session: string | null } | undefined;
}

export async function replaceState(pharmacyId: string, state: PharmacyState) {
  await withState(pharmacyId, (current) => {
    for (const key of Object.keys(current)) delete (current as Record<string, unknown>)[key];
    Object.assign(current, structuredClone(state));
  });
}
