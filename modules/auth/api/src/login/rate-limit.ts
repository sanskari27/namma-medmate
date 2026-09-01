import { TokenBucket } from '@namma-medmate/rate-limiter';
import { AuthErrors } from '../errors.ts';

const buckets = new Map<string, TokenBucket>();

export function assertLoginRateLimit(loginId: string, ip: string, now = Date.now()): void {
  const key = `${loginId}|${ip}`;
  const existing = buckets.get(key);
  const bucket = existing ?? new TokenBucket(20, 20 / 60, now);
  if (!existing) {
    buckets.set(key, bucket);
  }
  if (!bucket.tryRemove(now)) {
    throw AuthErrors.rateLimited();
  }
}

export function resetLoginRateLimit(): void {
  buckets.clear();
}
