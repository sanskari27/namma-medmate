export function measureRender(startedAt: number, now: number = Date.now()): number {
  return Math.max(0, now - startedAt);
}
