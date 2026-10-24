"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { RangePreset, RANGE_PRESETS, resolveRange, ResolvedRange } from "../lib/dateRange";
import { IconCalendar } from "./Icon";

const isoDate = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fromYmd = (s: string, end = false) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0).getTime(); };

/** Shared simple date-range filter — a single dropdown of presets. */
export function useDateRange(now: number, initial: RangePreset = "last-365") {
  const [preset, setPreset] = useState<RangePreset>(initial);
  const [from, setFrom] = useState(isoDate(now - 29 * 86400000));
  const [to, setTo] = useState(isoDate(now));
  const r: ResolvedRange = useMemo(
    () => resolveRange(preset, now, fromYmd(from), fromYmd(to, true)),
    [preset, now, from, to]
  );
  const node = <DateRangeDropdown now={now} preset={preset} setPreset={setPreset} from={from} setFrom={setFrom} to={to} setTo={setTo} resolved={r} />;
  return { from: r.from, to: r.to, label: r.label, sub: r.sub, inWindow: (ts: number) => ts >= r.from && ts <= r.to, node };
}

function DateRangeDropdown({ now, preset, setPreset, from, setFrom, to, setTo, resolved }: {
  now: number; preset: RangePreset; setPreset: (p: RangePreset) => void;
  from: string; setFrom: (s: string) => void; to: string; setTo: (s: string) => void; resolved: ResolvedRange;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="nm-dr" ref={ref}>
      <button className="nm-dr-btn" onClick={() => setOpen((o) => !o)}>
        <span className="cal"><IconCalendar size={15} /></span>
        <span className="lbl">{resolved.label}</span>
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="nm-dr-menu">
          {RANGE_PRESETS.map((p) => (
            <button key={p.key} className={`nm-dr-item${preset === p.key ? " on" : ""}`} onClick={() => { setPreset(p.key); if (p.key !== "custom") setOpen(false); }}>
              <span className="nm">{p.label}</span>
              {p.key !== "custom" && <span className="sub">{resolveRange(p.key, now).sub}</span>}
            </button>
          ))}
          {preset === "custom" && (
            <div className="nm-dr-custom">
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              <span>→</span>
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
