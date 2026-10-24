"use client";
import { useMemo, useState } from "react";

export type PMode = "today" | "month" | "year" | "fy" | "custom" | "all";

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoMonth = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const sod = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
const eod = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.getTime(); };
const mLabel = (d: Date) => d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
const parseM = (s: string) => { const [y, m] = s.split("-").map(Number); return { y, m }; };

type P = { mode: PMode; today: string; month: string; monthTo: string; monthRange: boolean; year: number; yearTo: number; yearRange: boolean; fy: number; from: string; to: string; now: number };

function computeWindow(p: P): { start: number; end: number; label: string } {
  switch (p.mode) {
    case "today": { const d = new Date(p.today + "T12:00:00"); return { start: sod(d), end: eod(d), label: d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) }; }
    case "month": {
      if (p.monthRange) {
        const a = parseM(p.month), b = parseM(p.monthTo);
        let s = new Date(a.y, a.m - 1, 1), e = new Date(b.y, b.m, 0);
        if (e < s) { const ns = new Date(b.y, b.m - 1, 1), ne = new Date(a.y, a.m, 0); s = ns; e = ne; }
        return { start: sod(s), end: eod(e), label: `${mLabel(s)} → ${mLabel(new Date(e.getFullYear(), e.getMonth(), 1))}` };
      }
      const { y, m } = parseM(p.month); const s = new Date(y, m - 1, 1), e = new Date(y, m, 0);
      return { start: sod(s), end: eod(e), label: s.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) };
    }
    case "year": {
      if (p.yearRange) { const a = Math.min(p.year, p.yearTo), b = Math.max(p.year, p.yearTo); return { start: sod(new Date(a, 0, 1)), end: eod(new Date(b, 11, 31)), label: `${a} → ${b}` }; }
      return { start: sod(new Date(p.year, 0, 1)), end: eod(new Date(p.year, 11, 31)), label: String(p.year) };
    }
    case "fy": return { start: sod(new Date(p.fy, 3, 1)), end: eod(new Date(p.fy + 1, 2, 31)), label: `FY ${p.fy}-${pad((p.fy + 1) % 100)}` };
    case "custom": { const s = new Date(p.from + "T12:00:00"); const e = new Date(p.to + "T12:00:00"); return { start: sod(s), end: eod(e), label: `${p.from} → ${p.to}` }; }
    default: return { start: 0, end: p.now, label: "All time" };
  }
}

/** Shared reporting period filter: Today / Month (single or range) / Year (single or range) / FY / Custom / All. */
export function usePeriod(now: number, initial: PMode = "month") {
  const base = useMemo(() => new Date(now), [now]);
  const [mode, setMode] = useState<PMode>(initial);
  const [today, setToday] = useState(isoDate(base));
  const [month, setMonth] = useState(isoMonth(base));
  const [monthTo, setMonthTo] = useState(isoMonth(base));
  const [monthRange, setMonthRange] = useState(false);
  const [year, setYear] = useState(base.getFullYear());
  const [yearTo, setYearTo] = useState(base.getFullYear());
  const [yearRange, setYearRange] = useState(false);
  const [fy, setFy] = useState(base.getMonth() >= 3 ? base.getFullYear() : base.getFullYear() - 1);
  const [from, setFrom] = useState(isoDate(new Date(base.getFullYear(), base.getMonth(), 1)));
  const [to, setTo] = useState(isoDate(base));

  const { start, end, label } = useMemo(() => computeWindow({ mode, today, month, monthTo, monthRange, year, yearTo, yearRange, fy, from, to, now }),
    [mode, today, month, monthTo, monthRange, year, yearTo, yearRange, fy, from, to, now]);
  const inWindow = (ts: number) => ts >= start && ts <= end;

  const years = Array.from({ length: 6 }, (_, i) => base.getFullYear() - 4 + i);
  const fys = Array.from({ length: 4 }, (_, i) => base.getFullYear() - 3 + i);
  const yearOpts = years.map((y) => <option key={y} value={y}>{y}</option>);

  const scope = (range: boolean, set: (b: boolean) => void) => (
    <select className="pd-select" style={{ width: 96 }} value={range ? "range" : "single"} onChange={(e) => set(e.target.value === "range")}>
      <option value="single">Single</option>
      <option value="range">Range</option>
    </select>
  );
  const arrow = <span className="pd-muted" style={{ fontSize: 12 }}>→</span>;

  const node = (
    <div className="pd-flex pd-gap6" style={{ flexWrap: "wrap" }}>
      <select className="pd-select" style={{ width: 140 }} value={mode} onChange={(e) => setMode(e.target.value as PMode)}>
        <option value="today">Today</option>
        <option value="month">Month</option>
        <option value="year">Year</option>
        <option value="fy">Financial Year</option>
        <option value="custom">Custom dates</option>
        <option value="all">All time</option>
      </select>

      {mode === "today" && <input type="date" className="pd-input" style={{ width: 160 }} value={today} onChange={(e) => setToday(e.target.value)} />}

      {mode === "month" && <>
        {scope(monthRange, setMonthRange)}
        <input type="month" className="pd-input" style={{ width: 150 }} value={month} onChange={(e) => setMonth(e.target.value)} />
        {monthRange && <>{arrow}<input type="month" className="pd-input" style={{ width: 150 }} value={monthTo} onChange={(e) => setMonthTo(e.target.value)} /></>}
      </>}

      {mode === "year" && <>
        {scope(yearRange, setYearRange)}
        <select className="pd-select" style={{ width: 100 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>{yearOpts}</select>
        {yearRange && <>{arrow}<select className="pd-select" style={{ width: 100 }} value={yearTo} onChange={(e) => setYearTo(Number(e.target.value))}>{yearOpts}</select></>}
      </>}

      {mode === "fy" && <select className="pd-select" style={{ width: 140 }} value={fy} onChange={(e) => setFy(Number(e.target.value))}>{fys.map((y) => <option key={y} value={y}>FY {y}-{pad((y + 1) % 100)}</option>)}</select>}

      {mode === "custom" && <>
        <input type="date" className="pd-input" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        {arrow}
        <input type="date" className="pd-input" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} />
      </>}
    </div>
  );

  return { node, inWindow, label, start, end, mode };
}
