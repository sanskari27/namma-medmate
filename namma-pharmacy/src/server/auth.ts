import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";
import { fail } from "./errors";

export type OtpState = {
  hash: string;
  expiresAt: number;
  attempts: number;
  sentAt: number;
  sendCount: number;
  windowStart: number;
};

export type OtpConfig = {
  length: number;
  ttlMs: number;
  maxAttempts: number;
  cooldownMs: number;
  maxSends: number;
  windowMs: number;
};

export type AccessClaims = {
  sub: string;
  phone: string;
  pid: string;
  sid: string;
  typ: "access";
  iat: number;
  exp: number;
};

type RefreshRow = { hash: string; previous: string | null; expiresAt: number };

function integer(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return fallback;
  return n;
}

export function otpConfig(): OtpConfig {
  const length = integer("OTP_LENGTH", 6);
  return {
    length: length >= 4 && length <= 10 ? length : 6,
    ttlMs: integer("OTP_TTL_SECONDS", 600) * 1000,
    maxAttempts: Math.max(1, integer("OTP_MAX_ATTEMPTS", 5)),
    cooldownMs: integer("OTP_RESEND_COOLDOWN_SECONDS", 30) * 1000,
    maxSends: Math.max(1, integer("OTP_MAX_SENDS", 5)),
    windowMs: Math.max(1, integer("OTP_SEND_WINDOW_SECONDS", 900)) * 1000,
  };
}

export function authConfig() {
  return {
    accessTtl: Math.max(1, integer("AUTH_ACCESS_TTL_SECONDS", 900)),
    refreshTtl: Math.max(1, integer("AUTH_REFRESH_TTL_SECONDS", 30 * 86400)),
  };
}

let devSecret: string | undefined;

export function jwtSecret() {
  const set = process.env.AUTH_JWT_SECRET;
  if (set) return set;
  if (process.env.NODE_ENV === "production") fail(500, "VALIDATION", "AUTH_JWT_SECRET is required");
  if (!devSecret) devSecret = randomBytes(32).toString("hex");
  return devSecret;
}

export function devCodeAccepted(code: string) {
  return process.env.NODE_ENV !== "production" && code === "123456";
}

export function generateOtp(length: number) {
  let otp = "";
  for (let i = 0; i < length; i++) otp += randomInt(0, 10).toString();
  return otp;
}

export function hashOtp(otp: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(otp, salt, 32);
  return salt.toString("hex") + ":" + hash.toString("hex");
}

export function otpMatches(otp: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(otp, Buffer.from(salt, "hex"), 32);
  const prev = Buffer.from(hash, "hex");
  return next.length === prev.length && timingSafeEqual(next, prev);
}

export function prepareSend(prev: OtpState | null, now: number, cfg: OtpConfig): { otp: string; state: OtpState } | { error: "cooldown" | "rate" } {
  const active = prev?.hash ? prev : null;
  if (active && now - active.sentAt < cfg.cooldownMs) return { error: "cooldown" };
  let sendCount = 1;
  let windowStart = now;
  if (active && now - active.windowStart < cfg.windowMs) {
    if (active.sendCount >= cfg.maxSends) return { error: "rate" };
    sendCount = active.sendCount + 1;
    windowStart = active.windowStart;
  }
  const otp = generateOtp(cfg.length);
  return {
    otp,
    state: { hash: hashOtp(otp), expiresAt: now + cfg.ttlMs, attempts: 0, sentAt: now, sendCount, windowStart },
  };
}

export function judgeOtp(state: OtpState | null, code: string, now: number, maxAttempts: number): { result: "ok" | "missing" | "expired" | "invalid" | "locked"; next: OtpState | null } {
  if (!state?.hash) return { result: "missing", next: null };
  if (state.expiresAt <= now) return { result: "expired", next: null };
  if (state.attempts >= maxAttempts) return { result: "locked", next: state };
  if (otpMatches(code, state.hash)) return { result: "ok", next: null };
  const attempts = state.attempts + 1;
  const next = { ...state, attempts };
  return { result: attempts >= maxAttempts ? "locked" : "invalid", next };
}

function b64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sameText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function signAccess(claims: Omit<AccessClaims, "iat" | "exp">, secret: string, nowSec: number, ttlSec: number) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...claims, iat: nowSec, exp: nowSec + ttlSec }));
  const sig = createHmac("sha256", secret).update(header + "." + body).digest("base64url");
  return header + "." + body + "." + sig;
}

export function verifyAccess(token: string, secret: string, nowSec: number, ignoreExp = false): AccessClaims | null {
  const [header, body, sig] = token.split(".");
  if (!header || !body || !sig || token.split(".").length !== 3) return null;
  let parsedHeader: { alg?: string };
  try { parsedHeader = JSON.parse(Buffer.from(header, "base64url").toString()) as { alg?: string }; }
  catch { return null; }
  if (parsedHeader.alg !== "HS256") return null;
  const expected = createHmac("sha256", secret).update(header + "." + body).digest("base64url");
  if (!sameText(sig, expected)) return null;
  let payload: AccessClaims;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString()) as AccessClaims; }
  catch { return null; }
  if (payload.typ !== "access" || !payload.sub || !payload.sid || !payload.pid || !payload.phone) return null;
  if (!ignoreExp && payload.exp <= nowSec) return null;
  return payload;
}

export function sessionIdOf(token: string) {
  if (!token.includes(".")) return token;
  return verifyAccess(token, jwtSecret(), Math.floor(Date.now() / 1000), true)?.sid ?? null;
}

export function newRefreshToken() {
  return randomBytes(32).toString("base64url");
}

export function hashRefresh(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function judgeRefresh(row: RefreshRow | null, presentedHash: string, now: number) {
  if (!row?.hash) return "invalid" as const;
  if (row.previous && sameText(row.previous, presentedHash)) return "reuse" as const;
  if (!sameText(row.hash, presentedHash)) return "invalid" as const;
  if (row.expiresAt <= now) return "expired" as const;
  return "ok" as const;
}
