export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export function buildSuccess<T>(data: T, meta?: Record<string, unknown>): SuccessEnvelope<T> {
  return meta ? { success: true, data, meta } : { success: true, data };
}
