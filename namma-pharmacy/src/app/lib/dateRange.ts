// ════════════════════════════════════════════════════════════════
// Simple date-range presets (myBillBook style) — one dropdown,
// Today → Last 365 Days → Custom, each resolving to a from/to window.
// ════════════════════════════════════════════════════════════════
export type RangePreset =
  | "today" | "yesterday" | "this-week" | "last-week" | "last-7"
  | "this-month" | "prev-month" | "last-30" | "this-quarter" | "prev-quarter"
  | "this-fy" | "prev-fy" | "last-365" | "custom";

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this-week", label: "This Week" },
  { key: "last-week", label: "Last Week" },
  { key: "last-7", label: "Last 7 Days" },
  { key: "this-month", label: "This Month" },
  { key: "prev-month", label: "Previous Month" },
  { key: "last-30", label: "Last 30 Days" },
  { key: "this-quarter", label: "This Quarter" },
  { key: "prev-quarter", label: "Previous Quarter" },
  { key: "this-fy", label: "Current Fiscal Year" },
  { key: "prev-fy", label: "Previous Fiscal Year" },
  { key: "last-365", label: "Last 365 Days" },
  { key: "custom", label: "Custom" },
];

const DAY = 86400000;
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
export const fmtDay = (ts: number) => new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export type ResolvedRange = { from: number; to: number; label: string; sub: string };

export function resolveRange(preset: RangePreset, now: number, customFrom?: number, customTo?: number): ResolvedRange {
  const n = new Date(now);
  const presetLabel = RANGE_PRESETS.find((p) => p.key === preset)?.label ?? "Custom";
  let from: number, to: number;
  switch (preset) {
    case "today": from = sod(n); to = eod(n); break;
    case "yesterday": { const y = new Date(now - DAY); from = sod(y); to = eod(y); break; }
    case "this-week": { const off = (n.getDay() + 6) % 7; from = sod(new Date(now - off * DAY)); to = eod(new Date(from + 6 * DAY)); break; }
    case "last-week": { const off = (n.getDay() + 6) % 7; from = sod(new Date(now - (off + 7) * DAY)); to = eod(new Date(from + 6 * DAY)); break; }
    case "last-7": from = sod(new Date(now - 6 * DAY)); to = eod(n); break;
    case "this-month": from = sod(new Date(n.getFullYear(), n.getMonth(), 1)); to = eod(new Date(n.getFullYear(), n.getMonth() + 1, 0)); break;
    case "prev-month": from = sod(new Date(n.getFullYear(), n.getMonth() - 1, 1)); to = eod(new Date(n.getFullYear(), n.getMonth(), 0)); break;
    case "last-30": from = sod(new Date(now - 29 * DAY)); to = eod(n); break;
    case "this-quarter": { const q = Math.floor(n.getMonth() / 3); from = sod(new Date(n.getFullYear(), q * 3, 1)); to = eod(new Date(n.getFullYear(), q * 3 + 3, 0)); break; }
    case "prev-quarter": { const q = Math.floor(n.getMonth() / 3); const py = q === 0 ? n.getFullYear() - 1 : n.getFullYear(); const pq = q === 0 ? 3 : q - 1; from = sod(new Date(py, pq * 3, 1)); to = eod(new Date(py, pq * 3 + 3, 0)); break; }
    case "this-fy": { const fy = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1; from = sod(new Date(fy, 3, 1)); to = eod(new Date(fy + 1, 2, 31)); break; }
    case "prev-fy": { const fy = (n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1) - 1; from = sod(new Date(fy, 3, 1)); to = eod(new Date(fy + 1, 2, 31)); break; }
    case "last-365": from = sod(new Date(now - 364 * DAY)); to = eod(n); break;
    case "custom": from = customFrom ?? sod(new Date(now - 29 * DAY)); to = customTo ?? eod(n); break;
    default: from = 0; to = now;
  }
  const sub = `${fmtDay(from)} - ${fmtDay(to)}`;
  return { from, to, label: preset === "custom" ? sub : presetLabel, sub };
}
