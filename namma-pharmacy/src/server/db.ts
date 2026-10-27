import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";
import { Pool, type PoolClient } from "pg";
import { fromPaise, toPaise } from "../app/lib/paise";
import { fail } from "./errors";
import { absorbFiles } from "./files";
import { stripDemo, touchAccess, type PharmacyState } from "./state";
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
  user_id text NOT NULL,
  login_pin_hash text
);
CREATE TABLE IF NOT EXISTS otp_challenges (
  phone text PRIMARY KEY,
  cognito_session text,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS master_phones (
  phone text PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS master_sessions (
  token text PRIMARY KEY,
  phone text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS consultations (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  area text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS master_audit (
  id bigserial PRIMARY KEY,
  phone text NOT NULL,
  pharmacy_id uuid NOT NULL,
  action text NOT NULL,
  before jsonb NOT NULL,
  after jsonb NOT NULL,
  reason text NOT NULL DEFAULT '',
  at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION master_audit_freeze() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'master_audit is append-only';
END $$;
DROP TRIGGER IF EXISTS master_audit_freeze ON master_audit;
CREATE TRIGGER master_audit_freeze
BEFORE UPDATE OR DELETE ON master_audit
FOR EACH ROW EXECUTE FUNCTION master_audit_freeze();
REVOKE UPDATE, DELETE ON master_audit FROM PUBLIC;
CREATE TABLE IF NOT EXISTS coupons (
  code text PRIMARY KEY,
  plan text NOT NULL,
  expires_on date NOT NULL,
  valid_days int NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  pharmacy_id uuid PRIMARY KEY REFERENCES pharmacies(id) ON DELETE CASCADE,
  code text NOT NULL REFERENCES coupons(code),
  redeemed_at timestamptz NOT NULL DEFAULT now()
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
      try {
        await client.query(SCHEMA);
        await client.query(`ALTER TABLE master_audit ADD COLUMN IF NOT EXISTS before jsonb`);
        await client.query(`ALTER TABLE master_audit ADD COLUMN IF NOT EXISTS after jsonb`);
        await client.query(`ALTER TABLE master_audit ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT ''`);
        await client.query(`ALTER TABLE master_audit DISABLE TRIGGER master_audit_freeze`);
        await client.query(`UPDATE master_audit SET before = COALESCE(before, '{}'::jsonb), after = COALESCE(after, '{}'::jsonb)`);
        await client.query(`ALTER TABLE master_audit ENABLE TRIGGER master_audit_freeze`);
        await client.query(`ALTER TABLE master_audit ALTER COLUMN before SET NOT NULL`);
        await client.query(`ALTER TABLE master_audit ALTER COLUMN after SET NOT NULL`);
        await client.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS impersonator text`);
        await client.query(`ALTER TABLE staff_phones ADD COLUMN IF NOT EXISTS login_pin_hash text`);
        for (const raw of (process.env.MASTER_PHONES || "").split(",")) {
          const phone = raw.trim();
          if (phone) await client.query("INSERT INTO master_phones (phone) VALUES ($1) ON CONFLICT DO NOTHING", [e164(phone)]);
        }
      } finally { client.release(); }
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
  impersonator: string | null;
  pricingPin: string;
  businessType: BusinessType;
  expiresAt: Date;
  hasPin: boolean;
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

export function hashLoginPin(pin: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return salt.toString("hex") + ":" + hash.toString("hex");
}

export function loginPinMatches(pin: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(pin, Buffer.from(salt, "hex"), 32);
  const prev = Buffer.from(hash, "hex");
  return next.length === prev.length && timingSafeEqual(next, prev);
}

export async function findLogin(phone: string) {
  await migrate();
  const { rows } = await getPool().query(
    "SELECT pharmacy_id, user_id, login_pin_hash FROM staff_phones WHERE phone = $1",
    [e164(phone)],
  );
  return rows[0] as { pharmacy_id: string; user_id: string; login_pin_hash: string | null } | undefined;
}

export async function setLoginPin(pharmacyId: string, phone: string, pin: string) {
  await migrate();
  const { rowCount } = await getPool().query(
    "UPDATE staff_phones SET login_pin_hash = $1 WHERE pharmacy_id = $2 AND phone = $3",
    [hashLoginPin(pin), pharmacyId, e164(phone)],
  );
  if (!rowCount) fail(404, "NOT_FOUND", "No login for this phone");
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
  const { rows } = await client.query("SELECT phone, login_pin_hash FROM staff_phones WHERE pharmacy_id = $1", [pharmacyId]);
  const hashes = new Map(rows.map((row) => [row.phone as string, (row.login_pin_hash as string | null) ?? null]));
  await client.query("DELETE FROM staff_phones WHERE pharmacy_id = $1", [pharmacyId]);
  for (const user of state.users) {
    if (!user.phone || user.active === false) continue;
    const phone = e164(user.phone);
    try {
      await client.query("SAVEPOINT staff_phone");
      await client.query(
        "INSERT INTO staff_phones (phone, pharmacy_id, user_id, login_pin_hash) VALUES ($1,$2,$3,$4)",
        [phone, pharmacyId, user.id, hashes.get(phone) ?? null],
      );
      await client.query("RELEASE SAVEPOINT staff_phone");
    } catch (err) {
      await client.query("ROLLBACK TO SAVEPOINT staff_phone");
      if ((err as { code?: string }).code === "23505") continue;
      throw err;
    }
  }
}

export async function createSession(pharmacyId: string, userId: string, phone: string, impersonator?: string) {
  await migrate();
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 86400000);
  await getPool().query(
    "INSERT INTO sessions (token, pharmacy_id, user_id, phone, expires_at, impersonator) VALUES ($1,$2,$3,$4,$5,$6)",
    [token, pharmacyId, userId, e164(phone), expires, impersonator || null],
  );
  return token;
}

export async function readSession(token: string | undefined): Promise<SessionRow | null> {
  if (!token) return null;
  await migrate();
  const { rows } = await getPool().query(
    `SELECT s.token, s.pharmacy_id, s.user_id, s.phone, s.pricing_unlocked, s.impersonator, s.expires_at, p.pricing_pin, p.business_type,
            (sp.login_pin_hash IS NOT NULL) AS has_pin
     FROM sessions s JOIN pharmacies p ON p.id = s.pharmacy_id
     LEFT JOIN staff_phones sp ON sp.pharmacy_id = s.pharmacy_id AND sp.phone = s.phone
     WHERE s.token = $1`,
    [token],
  );
  const row = rows[0];
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;
  return {
    token: row.token, pharmacyId: row.pharmacy_id, userId: row.user_id, phone: row.phone,
    pricingUnlocked: row.pricing_unlocked, impersonator: (row.impersonator as string) || null, pricingPin: row.pricing_pin, businessType: row.business_type, expiresAt: row.expires_at,
    hasPin: Boolean(row.has_pin),
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
  touchAccess(state);
  if (stripDemo(state)) await replaceState(pharmacyId, state);
  return state;
}

export async function withState<T>(pharmacyId: string, fn: (state: PharmacyState, client: PoolClient) => T | Promise<T>): Promise<T> {
  await migrate();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT state FROM pharmacies WHERE id = $1 FOR UPDATE", [pharmacyId]);
    if (!rows[0]) fail(404, "NOT_FOUND", "Pharmacy not found");
    const state = fromPaise(rows[0].state) as PharmacyState;
    touchAccess(state);
    stripDemo(state);
    const result = await fn(state, client);
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
    touchAccess(state);
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
