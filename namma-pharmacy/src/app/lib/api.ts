import { fromPaise, toPaise } from "./paise";

export class ApiError extends Error {
  status: number;
  code: string;
  field?: string;
  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

const attempts = new Map<string, Promise<unknown>>();

export async function api<T>(path: string, init: { method?: string; body?: unknown; idempotency?: boolean; pricing?: boolean } = {}): Promise<T> {
  const method = init.method || "GET";
  const slot = init.idempotency ? method + " " + path : "";
  const pending = slot ? attempts.get(slot) : undefined;
  if (pending) return pending as Promise<T>;
  const run = (async () => {
    const headers: Record<string, string> = {};
    if (init.body !== undefined) headers["content-type"] = "application/json";
    if (init.idempotency) headers["idempotency-key"] = crypto.randomUUID();
    if (init.pricing) headers["x-pricing-unlock"] = "1";
    const res = await fetch("/api/v1" + path, {
      method,
      headers,
      credentials: "include",
      body: init.body !== undefined ? JSON.stringify(toPaise(init.body)) : undefined,
    });
    const text = await res.text();
    let json: { error?: { code?: string; message?: string; field?: string } } | null = null;
    if (text) { try { json = JSON.parse(text); } catch { json = null; } }
    if (!res.ok) {
      const error = json?.error;
      throw new ApiError(res.status, error?.code || "VALIDATION", error?.message || "Request failed", error?.field);
    }
    return fromPaise(json) as T;
  })();
  if (slot) {
    attempts.set(slot, run);
    void run.finally(() => attempts.delete(slot));
  }
  return run;
}
