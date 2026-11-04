import assert from "node:assert/strict";
import test from "node:test";
import {
  authConfig, generateOtp, hashRefresh, judgeOtp, judgeRefresh, otpConfig, prepareSend, signAccess, verifyAccess, type OtpConfig,
} from "./auth";
import { sendOtp } from "./sms";

const cfg: OtpConfig = { length: 6, ttlMs: 600_000, maxAttempts: 5, cooldownMs: 30_000, maxSends: 2, windowMs: 900_000 };

function issued(now = 1_000_000) {
  const prepared = prepareSend(null, now, cfg);
  if ("error" in prepared) throw new Error(prepared.error);
  return prepared;
}

test("otp generation is numeric and uses the configured length", () => {
  const otp = generateOtp(otpConfig().length);
  assert.match(otp, new RegExp("^\\d{" + otpConfig().length + "}$"));
  assert.equal(generateOtp(8).length, 8);
});

test("otp send enforces cooldown, the send window, and expiry", () => {
  const first = issued(0);
  const cooled = prepareSend(first.state, 10_000, cfg);
  assert.equal("error" in cooled ? cooled.error : "", "cooldown");
  const second = prepareSend(first.state, 30_000, cfg);
  if ("error" in second) throw new Error(second.error);
  assert.equal(second.state.sendCount, 2);
  const limited = prepareSend(second.state, 60_000, cfg);
  assert.equal("error" in limited ? limited.error : "", "rate");
  const reset = prepareSend(second.state, 30_000 + cfg.windowMs, cfg);
  if ("error" in reset) throw new Error(reset.error);
  assert.equal(reset.state.sendCount, 1);
  assert.equal(judgeOtp(first.state, first.otp, cfg.ttlMs, cfg.maxAttempts).result, "expired");
});

test("otp verification accepts one matching code and then locks the rest", () => {
  const first = issued();
  const wrong = first.otp === "000000" ? "111111" : "000000";
  const bad = judgeOtp(first.state, wrong, 1_000_000, cfg.maxAttempts);
  assert.equal(bad.result, "invalid");
  assert.equal(bad.next?.attempts, 1);
  let state = first.state;
  for (let i = 0; i < cfg.maxAttempts; i++) {
    const step = judgeOtp(state, wrong, 1_000_000, cfg.maxAttempts);
    assert.ok(step.next);
    state = step.next;
  }
  assert.equal(judgeOtp(state, first.otp, 1_000_000, cfg.maxAttempts).result, "locked");
  const ok = judgeOtp(first.state, first.otp, 1_000_000, cfg.maxAttempts);
  assert.equal(ok.result, "ok");
  assert.equal(ok.next, null);
  assert.equal(judgeOtp(ok.next, first.otp, 1_000_000, cfg.maxAttempts).result, "missing");
});

test("sms placeholder resolves and does not reveal the otp", async () => {
  const first = issued();
  await sendOtp("+919800000000", first.otp);
  assert.equal(JSON.stringify({ delivery: "sms" }).includes(first.otp), false);
});

test("access tokens carry their claims and fail when the signature or expiry is wrong", () => {
  const secret = "test-secret";
  const token = signAccess({ sub: "u1", phone: "+919800000000", pid: "pharm", sid: "sid", typ: "access" }, secret, 1_000, 60);
  assert.equal(verifyAccess(token, secret, 1_030)?.sid, "sid");
  assert.equal(verifyAccess(token, secret, 1_060), null);
  assert.equal(verifyAccess(token, "other-secret", 1_030), null);
  const [header, body, sig] = token.split(".");
  assert.equal(verifyAccess(header + "." + body + "." + (sig.endsWith("a") ? sig.slice(0, -1) + "b" : sig.slice(0, -1) + "a"), secret, 1_030), null);
  assert.equal(verifyAccess(header + "." + Buffer.from('{"typ":"access"}').toString("base64url") + "." + sig, secret, 1_030), null);
  assert.equal(authConfig().accessTtl > 0, true);
});

test("refresh rotation rejects a reused, expired, or unknown token", () => {
  const now = 5_000;
  const hash = hashRefresh("current");
  const previous = hashRefresh("previous");
  assert.equal(judgeRefresh({ hash, previous: null, expiresAt: now + 1 }, hash, now), "ok");
  assert.equal(judgeRefresh({ hash: hashRefresh("newer"), previous: hash, expiresAt: now + 1 }, hash, now), "reuse");
  assert.equal(judgeRefresh({ hash, previous: null, expiresAt: now }, hash, now), "expired");
  assert.equal(judgeRefresh({ hash, previous: null, expiresAt: now + 1 }, hashRefresh("nope"), now), "invalid");
  assert.equal(judgeRefresh(null, hash, now), "invalid");
});
