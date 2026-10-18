"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "./lang";
import { Icon } from "./ui";

/**
 * Street scene at the bottom of the screen: a MedMate rider picks up medicine at a neighbourhood pharmacy and rides
 * it to a Bengaluru home, on a loop (12.4 s on a phone; the ride is longer on wide screens).
 *
 * Motion is computed per frame (requestAnimationFrame) and written straight to SVG transforms, so React does not
 * re-render while it runs. The scooter follows a timed path; everything else is derived from that path, the way a
 * real scooter behaves: wheels turn by distance travelled (no sliding), the body pitches with acceleration through a
 * damped spring (nose up when pulling away, dipping under braking), and the suspension settles after road seams.
 * Pauses when the tab is hidden; with "reduce motion" it shows one still frame.
 */

const T0 = 12.4; // loop length on a phone, seconds
const PH = 1.22; // pharmacy drawn 22% larger than the rest of the street, anchored at its bottom-left (3, 42)
const XE = -50, XP = 76; // scooter x: entering, stopped at the pharmacy door
const Y0 = 24.4; // scooter group y (wheels touch the road at y = 52.5)
const S = 0.78; // scooter art scale
const R = 6 * S; // wheel radius in scene units
const HAND_P: [number, number] = [3 + (59.4 - 3) * PH, 42 - (42 - 34.1) * PH]; // pharmacist's hand (scaled shop)
const H_PX = 80; // scene height on screens 640px and wider; phones keep the 400 x 60 phone layout

type Stage = "order" | "pickup" | "ride" | "drop";
const CAPTION = { order: "scene.order", pickup: "scene.pickup", ride: "scene.ride", drop: "scene.drop" } as const;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const outCubic = (u: number) => 1 - (1 - u) ** 3;
const inCubic = (u: number) => u ** 3;
const inOutCubic = (u: number) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);
const outBack = (u: number) => { const c = 1.70158; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) { const d = sx(t) - x, dd = dsx(t); if (Math.abs(d) < 1e-5 || !dd) break; t -= d / dd; }
    return sy(clamp(t));
  };
}
const rideEase = bezier(0.45, 0, 0.2, 1); // gentle pull-away, firmer braking, like a real scooter

/**
 * The phone layout is 400 units wide. Wider screens keep the pharmacy at the left edge and move the home to the
 * right edge (dx). The ride then takes longer, with the same feel of speed, and every later moment shifts by delta.
 */
type Layout = { W: number; dx: number; XH: number; XX: number; ride: number; delta: number; pre: number; T: number };
/** One rider on phones; on wider streets two or three, evenly spaced in time so they never meet at a stop. */
const scooterCount = (W: number) => (W <= 400 ? 1 : W < 1000 ? 2 : 3);
function layout(W: number): Layout {
  const dx = W <= 400 ? 0 : W - 414;
  const XH = 309 + dx;
  const ride = Math.min(11, 4.3 * ((XH - XP) / (309 - XP)) ** 0.6);
  const loop = T0 + ride - 4.3;
  // With several riders, each waits off screen before entering so the one ahead has left the home before the
  // next one pulls up: riders stay at least 7.2 s apart.
  const pre = Math.max(0, scooterCount(W) * 7.2 - loop);
  return { W, dx, XH, XX: W + 10, ride, delta: ride - 4.3, pre, T: loop + pre };
}
/** Real time to the phone timeline, which every moment below is written against. */
function phase(L: Layout, tt: number) {
  const t = tt - L.pre;
  if (t < 0) return 0;
  if (t < 3.6) return t;
  if (t < 3.6 + L.ride) return 3.6 + (t - 3.6) * (4.3 / L.ride);
  return t - L.delta;
}
function xAt(L: Layout, tt: number) {
  const t = tt - L.pre;
  if (t < 0) return XE;
  if (t < 1.5) return XE + (XP - XE) * outCubic(t / 1.5);
  if (t < 3.6) return XP;
  if (t < 3.6 + L.ride) return XP + (L.XH - XP) * rideEase((t - 3.6) / L.ride);
  const p = t - L.delta;
  if (p < 10.6) return L.XH;
  return L.XH + (L.XX - L.XH) * inCubic((p - 10.6) / 1.8);
}
/** Where the repeating middle of the street goes on wide screens: skyline blocks, lamps and extra trees. */
function midground(L: Layout) {
  const end = L.W - (L.dx ? 130 : 120);
  const sky: number[] = [], lamps: number[] = [], trees: number[] = [];
  for (let o = 0; o === 0 || 262 + o <= end; o += 200) sky.push(o);
  const homeTree = 272 + L.dx;
  for (let x = 196; x === 196 || (x <= end - 20 && x <= homeTree - 45); x += 240) lamps.push(x);
  // Extra trees sit halfway between lamps (every other gap) and keep clear of the tree by the home
  for (let x = 316; L.dx && x < homeTree - 110; x += 480) trees.push(x);
  return { sky, lamps, trees };
}
const stageAt = (t: number): Stage => (t < 1.7 || t >= 11.9 ? "order" : t < 3.7 ? "pickup" : t < 8.6 ? "ride" : "drop");
/** Lid angle in degrees (0 shut, -105 open): opens with a little overshoot, closes smoothly. */
function lidAt(t: number) {
  const open = (a: number) => -105 * outBack(span(t, a, a + 0.3));
  const shut = (a: number) => 105 * inOutCubic(span(t, a, a + 0.25));
  if (t < 5) return open(1.75) + shut(2.75);
  return open(8.05) + shut(9.15);
}
/** A short parabolic hand-off: position and a little tilt. */
function arc(u: number, a: [number, number], b: [number, number], h: number) {
  const e = inOutCubic(u);
  return { x: a[0] + (b[0] - a[0]) * e, y: a[1] + (b[1] - a[1]) * e - 4 * h * e * (1 - e), r: -14 * Math.sin(Math.PI * e) };
}

// Awning with a scalloped edge, built once
const AWNING = (() => {
  let d = "M7,20.4 H75 V23 ";
  for (let x = 75; x > 7.1; x -= 3.4) d += `a1.7,1.7 0 0 1 -3.4,0 `;
  return d + "Z";
})();
const SPOKES = [0, 72, 144, 216, 288].map((a) => { const r = (a * Math.PI) / 180; return [Math.cos(r) * 3.2, Math.sin(r) * 3.2]; });
const PACKS = [["#E8743B", 10.6], ["#2F7D52", 14.4], ["#D9A648", 18], ["#6FA8DC", 21.6], ["#F4F1EA", 25.2], ["#C2392D", 28.8], ["#8FD4A8", 32.4]] as const;
const FLOWERS = [[260, 21], [263.5, 26.5], [267, 18.5], [270.5, 23.5], [274, 16.5], [276.5, 21.5], [279.5, 26.8], [283, 20], [286, 24.5], [266, 29], [272.5, 28.6], [280, 17], [284.8, 27.6], [262, 24]];

export function DeliveryScene({ onHide, last = true }: { onHide?: () => void; last?: boolean }) {
  const t = useT();
  const [stage, setStage] = useState<Stage>("order");
  const svg = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(400);

  // Scene width in SVG units: phones use the 400-unit layout; wider screens get a wider street at a fixed height
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => { const cw = el.clientWidth; setW(cw < 640 ? 400 : Math.round((60 * cw) / H_PX)); };
    fit();
    if (!("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const L = layout(W);
    const N = scooterCount(W);
    const HAND_H: [number, number] = [350.6 + L.dx, 34.3]; // customer's hand
    const root = svg.current;
    if (!root) return;
    const $ = (id: string) => root.querySelector<SVGElement>(`[data-k="${id}"]`)!;
    const set = (e: SVGElement, a: string, v: string | number) => e.setAttribute(a, String(v));
    const shared = { pharm: $("pharm"), cust: $("cust"), door: $("door"), light: $("light"), badge: $("badge"), ring: $("ring") };
    const pf = Array.from({ length: 8 }, (_, i) => $(`pf${i}`)), du = Array.from({ length: 8 }, (_, i) => $(`du${i}`));
    const puffs = pf.map(() => ({ born: -9, x: 0, y: 0 })), dust = du.map(() => ({ born: -9, x: 0, y: 0 }));
    let puffIdx = 0, dustIdx = 0, clock = 0, shown: Stage = "order";
    const spawn = (pool: { born: number; x: number; y: number }[], i: number, x: number, y: number) => { pool[i % pool.length] = { born: clock, x, y }; };

    // Each rider runs the same loop, started N-th of a loop apart: one at the shop, one on the road, one at the door.
    const offset = (i: number) => (i * L.T) / N;
    const riders = Array.from({ length: N }, (_, i) => ({
      el: { pos: $(`pos${i}`), pitch: $(`pitch${i}`), wr: $(`wr${i}`), wf: $(`wf${i}`), lid: $(`lid${i}`), shadow: $(`shadow${i}`), bag: $(`bag${i}`), lines: [0, 1, 2].map((k) => $(`ln${i}_${k}`)) },
      lastX: NaN, speed: 0, accel: 0, wheel: i * 47, travelled: 0, nextSeam: 22 + i * 7,
      pitch: 0, pitchV: 0, bounce: 0, bounceV: 0, prevP: 0, puffLeft: 0, puffAt: 0, dustLast: -1,
    }));

    function frame(g: number, dt: number) {
      clock += dt;
      let pharmV = 0, pharmX = 0, open = 0, custV = 0, custX = 0, badgeS = 0, badgeO = 0, ringR = 5.4, ringO = 0;
      const stages = new Set<Stage>();

      riders.forEach((r, i) => {
        const tau = (((g - offset(i)) % L.T) + L.T) % L.T;
        const p = phase(L, tau); // the moment on the phone timeline
        const x = xAt(L, tau);
        if (Number.isNaN(r.lastX)) { r.lastX = x; r.prevP = p; }
        let dx = x - r.lastX;
        if (dx < -100) dx = r.speed * dt; // loop wrapped (exit right, enter left): both happen off screen
        r.lastX = x;
        const v = dt > 0 ? dx / dt : 0;
        const a = dt > 0 ? (v - r.speed) / dt : 0;
        r.accel += (a - r.accel) * Math.min(1, dt * 12); // smoothed
        r.speed = v;
        r.wheel = (r.wheel + (dx / R) * 57.2958) % 360;
        r.travelled += Math.abs(dx);

        // Body pitch: damped spring towards an acceleration-based target (nose up when pulling away)
        const target = clamp(-r.accel * 0.03, -3.2, 3.2);
        r.pitchV += ((target - r.pitch) * 140 - r.pitchV * 17) * dt;
        r.pitch += r.pitchV * dt;
        // Suspension: a small kick at every road seam, then a damped settle; a faint idle shiver when stopped
        if (r.travelled > r.nextSeam) { r.bounceV -= 7 * clamp(Math.abs(r.speed) / 90, 0.15, 1); r.nextSeam = r.travelled + 20 + ((r.travelled * 7) % 9); }
        r.bounceV += ((0 - r.bounce) * 280 - r.bounceV * 13) * dt;
        r.bounce = clamp(r.bounce + r.bounceV * dt, -1.2, 1.2);
        const onScreen = x > -40 && x < L.W + 2;
        const idle = onScreen && Math.abs(r.speed) < 1 ? Math.sin(clock * 2 * Math.PI * 9 + i) * 0.07 : 0;
        const y = Y0 + r.bounce + idle;

        set(r.el.pos, "transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        set(r.el.pitch, "transform", `rotate(${r.pitch.toFixed(2)} ${(11 * S).toFixed(2)} ${(36 * S).toFixed(2)})`);
        set(r.el.wr, "transform", `rotate(${r.wheel.toFixed(1)} 11 30)`);
        set(r.el.wf, "transform", `rotate(${r.wheel.toFixed(1)} 40 30)`);
        set(r.el.lid, "transform", `rotate(${lidAt(p).toFixed(1)} -1.6 5)`);
        set(r.el.shadow, "transform", `translate(${(x + 19.5).toFixed(2)} 53) scale(${(1 - r.bounce * 0.05).toFixed(3)} 1)`);

        // Speed lines behind the rider
        const k = clamp((Math.abs(r.speed) - 25) / 90);
        r.el.lines.forEach((ln, j) => {
          const len = (6 + j * 2.5) * k;
          set(ln, "x1", (x - 3 - len - j * 1.5).toFixed(2)); set(ln, "x2", (x - 3 - j * 1.5).toFixed(2));
          set(ln, "y1", (y + 9 + j * 5.5).toFixed(2)); set(ln, "y2", (y + 9 + j * 5.5).toFixed(2));
          set(ln, "opacity", (0.55 * k).toFixed(2));
        });

        // Exhaust puffs when pulling away; dust under hard braking
        const crossed = (m: number) => r.prevP < m && p >= m;
        if (crossed(3.6) || crossed(10.6)) { r.puffLeft = 3; r.puffAt = clock; }
        if (r.puffLeft > 0 && clock >= r.puffAt) { spawn(puffs, puffIdx++, x + 0.8, y + 24.2); r.puffLeft--; r.puffAt = clock + 0.12; }
        if (r.accel < -55 && Math.abs(r.speed) > 10 && clock - r.dustLast > 0.11) { spawn(dust, dustIdx++, x + 7 + (dustIdx % 3) * 1.4, 52 - (dustIdx % 2) * 0.8); r.dustLast = clock; }

        // This rider's moments at the pharmacy and at the home (riders never overlap at a stop)
        const pIn = outCubic(span(p, 1.3, 1.7)), pOut = span(p, 2.95, 3.35);
        if (pIn * (1 - pOut) > pharmV) { pharmV = pIn * (1 - pOut); pharmX = -2.5 * (1 - pIn) - 2 * pOut; }
        open = Math.max(open, inOutCubic(span(p, 8.0, 8.5)) * (1 - inOutCubic(span(p, 10.2, 10.65))));
        const cIn = outCubic(span(p, 8.3, 8.65)), cOut = span(p, 9.95, 10.35);
        if (cIn * (1 - cOut) > custV) { custV = cIn * (1 - cOut); custX = 2 * (1 - cIn) + 2.5 * cOut; }

        let bag: { x: number; y: number; r: number } | null = null, bagO = 1;
        if (p >= 1.3 && p < 1.95) { bag = { x: HAND_P[0], y: HAND_P[1], r: 0 }; bagO = pIn; }
        else if (p >= 1.95 && p < 2.75) bag = arc(span(p, 1.95, 2.7), HAND_P, [XP + 4.3, Y0 + 3.1], 6);
        else if (p >= 8.35 && p < 9.1) bag = arc(span(p, 8.35, 9.1), [L.XH + 4.3, Y0 + 3.1], HAND_H, 13);
        else if (p >= 9.1 && p < 10.35) { bag = { x: HAND_H[0] + 2.5 * cOut, y: HAND_H[1], r: 0 }; bagO = 1 - cOut; }
        if (bag) { set(r.el.bag, "transform", `translate(${bag.x.toFixed(2)} ${bag.y.toFixed(2)}) rotate(${bag.r.toFixed(1)})`); set(r.el.bag, "opacity", bagO.toFixed(2)); }
        else set(r.el.bag, "opacity", 0);

        // Delivered badge: spring pop, a single ripple, then fade
        if (p >= 9.1 && p < 11.9) {
          badgeS = outBack(span(p, 9.1, 9.55)); badgeO = 1 - span(p, 11.4, 11.9);
          const rp = span(p, 9.1, 9.95);
          if (rp < 1) { ringR = 5.4 + 6.5 * outCubic(rp); ringO = 0.55 * (1 - rp); }
        }
        stages.add(stageAt(p));
        r.prevP = p;
      });

      set(shared.pharm, "opacity", pharmV.toFixed(2));
      set(shared.pharm, "transform", `translate(${pharmX.toFixed(2)} 0)`);
      set(shared.door, "transform", `translate(352 0) scale(${(1 - 0.82 * open).toFixed(3)} 1) translate(-352 0)`);
      set(shared.light, "opacity", (0.95 * open).toFixed(2));
      set(shared.cust, "opacity", custV.toFixed(2));
      set(shared.cust, "transform", `translate(${custX.toFixed(2)} 0)`);
      set(shared.badge, "transform", `translate(357.6 11.5) scale(${badgeS.toFixed(3)})`);
      set(shared.badge, "opacity", badgeO.toFixed(2));
      set(shared.ring, "r", ringR.toFixed(2));
      set(shared.ring, "opacity", ringO.toFixed(2));

      pf.forEach((c, i) => {
        const age = (clock - puffs[i].born) / 0.9;
        if (age > 1 || age < 0) { set(c, "opacity", 0); return; }
        set(c, "cx", (puffs[i].x - 7 * age).toFixed(2)); set(c, "cy", (puffs[i].y - 2.5 * age).toFixed(2));
        set(c, "r", (1.2 + 3.6 * outCubic(age)).toFixed(2)); set(c, "opacity", (0.38 * (1 - age) ** 1.4).toFixed(2));
      });
      du.forEach((c, i) => {
        const age = (clock - dust[i].born) / 0.7;
        if (age > 1 || age < 0) { set(c, "opacity", 0); return; }
        set(c, "cx", (dust[i].x - 2.5 * age).toFixed(2)); set(c, "cy", (dust[i].y - 2.2 * outCubic(age)).toFixed(2));
        set(c, "r", (1.2 + 3 * outCubic(age)).toFixed(2)); set(c, "opacity", (0.32 * (1 - age) ** 1.5).toFixed(2));
      });

      // Caption: the most telling moment on screen right now
      const st: Stage = stages.has("drop") ? "drop" : stages.has("pickup") ? "pickup" : stages.has("ride") ? "ride" : "order";
      if (st !== shown) { shown = st; setStage(st); }
    }

    // One still frame for "reduce motion" (the medicine handed over at the door); ?scene=<seconds> freezes any moment for review.
    const seek = Number.parseFloat(new URLSearchParams(window.location.search).get("scene") ?? "");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || Number.isFinite(seek)) {
      const at = Number.isFinite(seek) ? ((seek % L.T) + L.T) % L.T : 9.6 + L.delta + L.pre;
      for (let i = 60; i >= 0; i--) frame(at - i / 60, 1 / 60);
      return;
    }
    // Time only advances while frames are drawn, so a hidden tab resumes exactly where it paused.
    let raf = 0, prev = 0, elapsed = 0;
    const loop = (now: number) => {
      const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 1 / 60;
      prev = now;
      elapsed += dt;
      frame(elapsed, dt);
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { prev = 0; raf = requestAnimationFrame(loop); }
    };
    raf = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis); };
  }, [W]);

  const L = layout(W);
  const mg = midground(L);
  const n = scooterCount(W);
  const clouds = Math.max(2, Math.round(W / 200));

  return (
    <div ref={box} className="relative select-none overflow-hidden rounded-t-[20px] bg-[#2E3834] shadow-[0_-8px_24px_rgba(20,32,26,0.12)]" style={last ? { paddingBottom: "env(safe-area-inset-bottom, 0px)" } : undefined}>
      <svg ref={svg} viewBox={`0 0 ${W} 60`} className="block h-auto w-full" aria-hidden focusable="false">
        <defs>
          <linearGradient id="ds-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#DFF1E5" /><stop offset="1" stopColor="#F8FBF5" /></linearGradient>
          <radialGradient id="ds-sun"><stop offset="0" stopColor="#FFE6A0" stopOpacity="0.7" /><stop offset="1" stopColor="#FFE6A0" stopOpacity="0" /></radialGradient>
          <linearGradient id="ds-road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4A5752" /><stop offset="1" stopColor="#2E3834" /></linearGradient>
          <linearGradient id="ds-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFDF8" /><stop offset="1" stopColor="#EFE8D8" /></linearGradient>
          <linearGradient id="ds-house" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFAF0" /><stop offset="1" stopColor="#F1E5D0" /></linearGradient>
          <linearGradient id="ds-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D97A4E" /><stop offset="1" stopColor="#A54D2C" /></linearGradient>
          <linearGradient id="ds-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E6F1EC" /><stop offset="1" stopColor="#BFD6CD" /></linearGradient>
          <linearGradient id="ds-glass2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#CFE2DA" /><stop offset="1" stopColor="#A9C4B9" /></linearGradient>
          <linearGradient id="ds-warm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF2CA" /><stop offset="1" stopColor="#FFD88A" /></linearGradient>
          <linearGradient id="ds-door" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#A86C44" /><stop offset="1" stopColor="#7A482D" /></linearGradient>
          <linearGradient id="ds-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3E9C69" /><stop offset="1" stopColor="#235F3D" /></linearGradient>
          <linearGradient id="ds-box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EBC067" /><stop offset="1" stopColor="#C08932" /></linearGradient>
          <linearGradient id="ds-jacket" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3A9262" /><stop offset="1" stopColor="#246642" /></linearGradient>
          <linearGradient id="ds-helmet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2C6145" /><stop offset="1" stopColor="#14301F" /></linearGradient>
          <radialGradient id="ds-head"><stop offset="0" stopColor="#FFF8DC" stopOpacity="0.95" /><stop offset="1" stopColor="#FFF8DC" stopOpacity="0" /></radialGradient>
          <pattern id="ds-stripes" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="3" height="6" fill="#1B3D29" /><rect x="3" width="3" height="6" fill="#F4EBD6" /></pattern>
          <filter id="ds-blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="1.3" /></filter>
          <filter id="ds-soft" x="-0.5" y="-0.5" width="2" height="2"><feGaussianBlur stdDeviation="0.7" /></filter>
        </defs>

        {/* Sky, sun, clouds, distant Bengaluru skyline */}
        <rect width={W} height="46" fill="url(#ds-sky)" />
        <circle cx={Math.round(W * 0.59)} cy="4" r="30" fill="url(#ds-sun)" />
        {Array.from({ length: clouds }, (_, i) => {
          const dur = (W + 120) / (i % 2 ? 1.7 : 2.6);
          return (
            <g key={i} className="ds-cloud" opacity={i % 2 ? 0.8 : 0.95} style={{ ["--w" as string]: W, animationDuration: `${dur}s`, animationDelay: `${(-dur * (i + 0.35)) / clouds}s` }}>
              {i % 2
                ? <><ellipse cx="0" cy="15" rx="6.5" ry="2.2" fill="#fff" /><ellipse cx="3.6" cy="13.7" rx="4" ry="2.3" fill="#fff" /></>
                : <><ellipse cx="0" cy="9" rx="9" ry="3" fill="#fff" /><ellipse cx="5.5" cy="7.2" rx="5.6" ry="3.2" fill="#fff" /><ellipse cx="-5" cy="8.2" rx="4.6" ry="2.4" fill="#fff" /></>}
            </g>
          );
        })}
        {mg.sky.map((o, i) => <g key={i} transform={i % 2 ? `translate(${o + 350} 0) scale(-1 1)` : `translate(${o} 0)`}><Skyline /></g>)}

        {/* Pavement, kerb, road */}
        <rect y="42" width={W} height="3.6" fill="#E7E2D7" />
        <g stroke="#D9D3C5" strokeWidth="0.4">{Array.from({ length: Math.ceil(W / 12) + 1 }, (_, i) => <line key={i} x1={i * 12 + 4} y1="42" x2={i * 12 + 4} y2="45.6" />)}</g>
        <rect y="45.6" width={W} height="1.2" fill="#B8B1A2" />
        <rect y="46.8" width={W} height="13.2" fill="url(#ds-road)" />
        <rect y="46.8" width={W} height="0.5" fill="#62706A" opacity="0.6" />
        <g fill="#EDE9DE" opacity="0.7">{Array.from({ length: Math.ceil(W / 24) + 1 }, (_, i) => <rect key={i} x={i * 24 + 4} y="53.6" width="11" height="1.1" rx="0.5" />)}</g>

        {/* Neighbourhood pharmacy */}
        <g transform={`translate(3 42) scale(${PH}) translate(-3 -42)`}>
          <rect x="3" y="7.5" width="76" height="3.2" rx="0.8" fill="#E5DDCB" />
          <rect x="5" y="10" width="72" height="32" fill="url(#ds-wall)" />
          <rect x="74" y="10" width="3" height="32" fill="#E2D9C8" />
          <rect x="8" y="12" width="66" height="8" rx="1.2" fill="#1B3D29" />
          <g transform="translate(14 16)">
            <g className="ds-glow" filter="url(#ds-blur)" fill="#3DDC84"><rect x="-1.2" y="-3.2" width="2.4" height="6.4" /><rect x="-3.2" y="-1.2" width="6.4" height="2.4" /></g>
            <rect x="-1" y="-2.8" width="2" height="5.6" fill="#47E08D" /><rect x="-2.8" y="-1" width="5.6" height="2" fill="#47E08D" />
          </g>
          <text x="20.5" y="18" fontSize="5" fontWeight="700" letterSpacing="0.9" fill="#D9A648">PHARMACY</text>
          <path d={AWNING} fill="url(#ds-stripes)" />
          <rect x="7" y="24.4" width="68" height="1.1" fill="#000" opacity="0.06" />
          <rect x="9" y="26" width="29" height="13.5" rx="0.6" fill="url(#ds-glass)" stroke="#D2C9B7" strokeWidth="0.6" />
          <g stroke="#9DB4AB" strokeWidth="0.5"><line x1="9.6" y1="30.6" x2="37.4" y2="30.6" /><line x1="9.6" y1="35.1" x2="37.4" y2="35.1" /></g>
          {PACKS.map(([c, x], i) => <rect key={i} x={x} y={i % 2 ? 27.9 : 27.4} width="2.6" height={i % 2 ? 2.7 : 3.2} rx="0.3" fill={c} />)}
          {PACKS.map(([c, x], i) => <rect key={`b${i}`} x={x + 0.8} y={i % 2 ? 32.2 : 32.6} width="2.4" height={i % 2 ? 2.9 : 2.5} rx="0.3" fill={PACKS[(i + 3) % PACKS.length][0]} />)}
          <path d="M13 26h3.4L11.6 39.5H9.4z" fill="#fff" opacity="0.32" />
          <rect x="8.5" y="39.5" width="30" height="1" fill="#DCD3C2" />
          <path d="M39.6 38.4h3.6l-.6 3.6h-2.4z" fill="#C66A3E" />
          <g fill="#3F8F5F"><ellipse cx="40.4" cy="36.6" rx="1.2" ry="2.2" transform="rotate(-18 40.4 36.6)" /><ellipse cx="42.4" cy="36.4" rx="1.2" ry="2.3" transform="rotate(20 42.4 36.4)" /><ellipse cx="41.4" cy="35.6" rx="1" ry="2.4" /></g>
          <rect x="44" y="25.5" width="14" height="16.5" fill="#1B3D29" />
          <rect x="45.2" y="26.7" width="11.6" height="15.3" fill="url(#ds-glass2)" />
          <g data-k="pharm" opacity="0">
            <rect x="47.4" y="32.6" width="7" height="9.4" rx="2.2" fill="#FFFFFF" stroke="#D9E2DD" strokeWidth="0.4" />
            <path d="M49.6 32.8l1.3 2.4 1.3-2.4" fill="none" stroke="#D9E2DD" strokeWidth="0.45" />
            <path d="M49.2 33.1c.2 1.8 1 2.6 1.7 2.6s1.5-.8 1.7-2.6" fill="none" stroke="#2F7D52" strokeWidth="0.45" />
            <circle cx="50.9" cy="30.1" r="2.1" fill="#B9794F" />
            <path d="M48.8 29.8c0-1.6 1-2.4 2.1-2.4s2.1.8 2.1 2.2c-.6-.7-1.4-1-2.2-1s-1.5.4-2 1.2z" fill="#2A211D" />
            <path d="M53.8 34.6q2.6 1 5.4-.4" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="59.4" cy="34.1" r="0.75" fill="#B9794F" />
          </g>
          <rect x="55.6" y="32" width="0.9" height="3" rx="0.4" fill="#D9A648" />
          <rect x="42.5" y="42" width="17" height="1.2" fill="#D8D0BF" />
          <rect x="62" y="27" width="8" height="10" rx="0.6" fill="#FFFFFF" stroke="#E2D9C8" strokeWidth="0.5" />
          <rect x="65.4" y="28.4" width="1.2" height="3.6" fill="#2F7D52" /><rect x="64.2" y="29.6" width="3.6" height="1.2" fill="#2F7D52" />
          <g stroke="#C9D4CE" strokeWidth="0.5"><line x1="63.4" y1="33.6" x2="68.6" y2="33.6" /><line x1="63.4" y1="35.2" x2="67.4" y2="35.2" /></g>
          <rect x="5" y="41.5" width="72" height="0.8" fill="#000" opacity="0.07" />
        </g>

        {/* Street lamps */}
        {mg.lamps.map((x) => <g key={x} transform={`translate(${x - 196} 0)`}><Lamp /></g>)}

        {/* Gulmohar trees: one by the home, more along wide streets */}
        {[...mg.trees, 272 + L.dx].map((x, i) => <g key={x} transform={`translate(${x - 272} 0)`}><Gulmohar delay={i * -2.3} /></g>)}

        <g transform={`translate(${L.dx} 0)`}>
        <rect x="296" y="37.5" width="10" height="4.5" rx="2.2" fill="#3F8F5F" />
        {/* Bengaluru home with a Mangalore-tile roof */}
        <rect x="305" y="18" width="82" height="24" fill="url(#ds-house)" />
        <rect x="384" y="18" width="3" height="24" fill="#E5D7BF" />
        <path d="M300 17.6L314 6h64l14 11.6z" fill="url(#ds-roof)" />
        <g stroke="#8E3F24" strokeWidth="0.5" opacity="0.4"><line x1="309" y1="10.2" x2="383" y2="10.2" strokeDasharray="2.2 1.2" /><line x1="304.2" y1="14.2" x2="387.8" y2="14.2" strokeDasharray="2.2 1.2" /></g>
        <rect x="313" y="5.2" width="66" height="1.4" rx="0.6" fill="#963F22" />
        <rect x="300" y="17.3" width="92" height="1.3" fill="#8E3F24" opacity="0.5" />
        <rect x="312" y="21.2" width="22" height="1.6" fill="#E1D1B8" />
        <rect x="314" y="23" width="18" height="11.5" fill="#8A5A3B" />
        <rect x="315" y="24" width="16" height="9.5" fill="url(#ds-warm)" />
        <path d="M315 24h4.6c-.8 3-.8 6.4 0 9.5H315z" fill="#F2C9A0" opacity="0.7" />
        <g stroke="#8A5A3B" strokeWidth="0.55"><line x1="319" y1="24" x2="319" y2="33.5" /><line x1="323" y1="24" x2="323" y2="33.5" /><line x1="327" y1="24" x2="327" y2="33.5" /><line x1="315" y1="28.7" x2="331" y2="28.7" /></g>
        <rect x="366" y="27" width="4.5" height="2.6" rx="0.4" fill="#D9A648" />
        <rect x="351" y="24.5" width="13" height="17.5" fill="#6B3F27" />
        <rect data-k="light" x="352" y="25.5" width="11" height="16.5" fill="#FFD27A" opacity="0" />
        <g data-k="cust" opacity="0">
          <path d="M354.6 34c0-1.6 1.2-2.4 3-2.4s3 .8 3 2.4v8h-6z" fill="#2E8C8A" />
          <path d="M355.4 32.4l4.6 5.4" stroke="#D9A648" strokeWidth="0.7" />
          <circle cx="357.6" cy="29.3" r="2" fill="#A86B45" />
          <path d="M355.6 29.2c0-1.5 1-2.3 2-2.3 1.2 0 2.1.8 2.1 2.1-.6-.6-1.4-.9-2.1-.9-.8 0-1.5.4-2 1.1z" fill="#1F1714" /><circle cx="359.5" cy="28.4" r="0.9" fill="#1F1714" />
          <path d="M355 34.6q-2.4.8-4.2-.2" fill="none" stroke="#2E8C8A" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="350.6" cy="34.3" r="0.7" fill="#A86B45" />
        </g>
        <g data-k="door">
          <rect x="352" y="25.5" width="11" height="16.5" fill="url(#ds-door)" />
          <g fill="none" stroke="#6B3F27" strokeWidth="0.5"><rect x="353.6" y="27.2" width="7.8" height="5.5" /><rect x="353.6" y="34" width="7.8" height="6" /></g>
          <circle cx="361.2" cy="34.3" r="0.7" fill="#D9A648" />
        </g>
        <path d="M351.4 24.6l1.2 2 1.2-2 1.2 2 1.2-2 1.2 2 1.2-2 1.2 2 1.2-2 1.2 2 1.2-2" fill="none" stroke="#3F8F5F" strokeWidth="0.9" strokeLinejoin="round" />
        <rect x="349" y="42" width="17" height="1.2" fill="#D7CCB8" />
        <rect x="371" y="36.5" width="8" height="5.5" fill="#E9D8BC" /><rect x="370.4" y="36" width="9.2" height="1.2" fill="#DAC6A3" />
        <g fill="#3F8F5F"><ellipse cx="375" cy="33.4" rx="1" ry="2.2" /><ellipse cx="373.6" cy="34.4" rx="0.9" ry="1.8" transform="rotate(-25 373.6 34.4)" /><ellipse cx="376.4" cy="34.4" rx="0.9" ry="1.8" transform="rotate(25 376.4 34.4)" /></g>
        <rect x="305" y="41.5" width="82" height="0.8" fill="#000" opacity="0.07" />

        {/* Delivered badge */}
        <circle data-k="ring" cx="357.6" cy="11.5" r="5.4" fill="none" stroke="#2F7D52" strokeWidth="1" opacity="0" />
        <g data-k="badge" transform="translate(357.6 11.5) scale(0)">
          <circle r="5.2" fill="#2F7D52" stroke="#fff" strokeWidth="1" />
          <path d="M-2.2 .2l1.6 1.6 3-3.2" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        </g>

        {/* Exhaust and dust */}
        <g filter="url(#ds-soft)">
          {Array.from({ length: 8 }, (_, i) => <circle key={`p${i}`} data-k={`pf${i}`} r="1" fill="#D3D8D5" opacity="0" />)}
          {Array.from({ length: 8 }, (_, i) => <circle key={`d${i}`} data-k={`du${i}`} r="1" fill="#B9AE9A" opacity="0" />)}
        </g>

        {/* MedMate riders */}
        {Array.from({ length: n }, (_, i) => <Scooter key={i} i={i} />)}
      </svg>
      <p className="sr-only">{t("scene.alt")}</p>
      <div className="pointer-events-none absolute inset-x-0 top-[4%] flex justify-center px-[23%] sm:top-[6%]">
        <span key={stage} className="anim-cap inline-flex max-w-full items-center gap-1 rounded-full bg-white/85 px-2 py-[3px] text-[10px] font-semibold leading-[13px] text-forest shadow-[0_1px_6px_rgba(20,32,26,0.10)] backdrop-blur sm:gap-1.5 sm:px-3 sm:py-1 sm:text-[12px] sm:leading-4">
          {stage === "drop"
            ? <span className="flex size-3 shrink-0 items-center justify-center rounded-full bg-green text-white sm:size-3.5"><Icon name="check" size={8} /></span>
            : <span className={`anim-dot size-1.5 shrink-0 rounded-full sm:size-2 ${stage === "ride" ? "bg-green" : "bg-gold"}`} />}
          <span className="truncate">{t(CAPTION[stage])}</span>
        </span>
      </div>
      {onHide && (
        <button type="button" aria-label={t("scene.hide")} onClick={onHide} className="absolute right-0 top-0 flex size-11 items-start justify-end p-[3px]">
          <span className="flex size-4 items-center justify-center rounded-full bg-white/75 text-ink-2 shadow-[0_1px_3px_rgba(20,32,26,0.15)]"><Icon name="x" size={9} /></span>
        </button>
      )}
    </div>
  );
}

/** Distant Bengaluru skyline block (x 88 to 262), repeated and mirrored along wide streets. */
function Skyline() {
  return (
    <>
          <g fill="#D2E8D9">
            <rect x="90" y="27" width="10" height="16" /><rect x="101" y="31" width="7" height="12" /><rect x="109" y="23.5" width="12" height="19.5" />
            <rect x="123" y="31" width="23" height="12" /><path d="M126.5 31a8 7.6 0 0 1 16 0z" /><rect x="133.9" y="20.5" width="1.2" height="3.4" /><circle cx="134.5" cy="20.3" r="0.9" />
            <rect x="149" y="28.5" width="9" height="14.5" /><rect x="160" y="20.5" width="13" height="22.5" /><rect x="166" y="16.5" width="0.8" height="4" />
            <rect x="176" y="30.5" width="8" height="12.5" /><rect x="211" y="25.5" width="11" height="17.5" /><rect x="225" y="18.5" width="14" height="24.5" />
            <rect x="241" y="29.5" width="8" height="13.5" /><rect x="251" y="32.5" width="9" height="10.5" />
          </g>
          <g fill="#C3DFCC">
            <rect x="96" y="35" width="15" height="8" /><rect x="152" y="34" width="20" height="9" /><rect x="205" y="36" width="16" height="7" /><rect x="236" y="34.5" width="18" height="8.5" />
          </g>
    </>
  );
}

function Lamp() {
  return (
    <>
          <rect x="195.3" y="16" width="1.3" height="26" fill="#6B7772" />
          <path d="M196 16.6q0-2.6 4-2.6h1.6" fill="none" stroke="#6B7772" strokeWidth="1.1" />
          <path d="M200.4 13h4.8l-1.1 2h-2.6z" fill="#56625D" /><circle cx="202.8" cy="15.6" r="0.9" fill="#FFF3C4" />
          <rect x="194.6" y="41" width="2.8" height="1.2" fill="#6B7772" />
    </>
  );
}

/** Gulmohar (Bengaluru's flame tree) with its trunk at x 272; the canopy sways in a breeze. */
function Gulmohar({ delay = 0 }: { delay?: number }) {
  return (
    <>
          <path d="M272 42c0-6-.6-10 .6-15m-.3 6c2.2-2 4.2-3.5 6.7-4.5m-7.2 3c-2-1.5-3.3-2.9-5-3.9" fill="none" stroke="#7A5236" strokeWidth="1.5" strokeLinecap="round" />
          <g className="ds-sway" style={{ animationDelay: `${delay}s` }}>
            <circle cx="264" cy="24" r="6.5" fill="#3F8F5F" /><circle cx="272" cy="20.5" r="8" fill="#2F7A4F" /><circle cx="281" cy="23.5" r="7" fill="#3A8A59" />
            <circle cx="268.5" cy="27" r="5.5" fill="#357F55" /><circle cx="277.5" cy="27.5" r="5.8" fill="#2F7A4F" />
            <circle cx="268.5" cy="17.5" r="3.4" fill="#5DAE78" opacity="0.6" /><circle cx="279" cy="19" r="2.8" fill="#5DAE78" opacity="0.5" />
            {FLOWERS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 0.9 : 1.2} fill={i % 2 ? "#F08A4B" : "#E8613A"} />)}
          </g>
    </>
  );
}

/** One MedMate rider: shadow, speed lines, scooter with its delivery box, and the medicine bag it carries. */
function Scooter({ i }: { i: number }) {
  return (
    <>
          <ellipse data-k={`shadow${i}`} cx="0" cy="0" rx="18" ry="1.4" fill="#000" opacity="0.28" transform="translate(-100 53)" />
          <g stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round">{[0, 1, 2].map((k) => <line key={k} data-k={`ln${i}_${k}`} opacity="0" />)}</g>
          <g data-k={`pos${i}`} transform={`translate(${XE} ${Y0})`}>
            <g data-k={`pitch${i}`}>
              <g transform={`scale(${S})`}>
                {/* rear wheel */}
                <circle cx="11" cy="30" r="6" fill="#1C2420" /><circle cx="11" cy="30" r="4.1" fill="#36423D" /><circle cx="11" cy="30" r="3.4" fill="#A9B4AF" />
                <g data-k={`wr${i}`} stroke="#6F7C76" strokeWidth="0.8">{SPOKES.map(([dx, dy], k) => <line key={k} x1="11" y1="30" x2={11 + dx} y2={30 + dy} />)}</g>
                <circle cx="11" cy="30" r="1.2" fill="#E8EDEA" />
                {/* front wheel */}
                <path d="M40.4 22.6L40 30" stroke="#2A3631" strokeWidth="1.2" />
                <circle cx="40" cy="30" r="6" fill="#1C2420" /><circle cx="40" cy="30" r="4.1" fill="#36423D" /><circle cx="40" cy="30" r="3.4" fill="#A9B4AF" />
                <g data-k={`wf${i}`} stroke="#6F7C76" strokeWidth="0.8">{SPOKES.map(([dx, dy], k) => <line key={k} x1="40" y1="30" x2={40 + dx} y2={30 + dy} />)}</g>
                <circle cx="40" cy="30" r="1.2" fill="#E8EDEA" />
                <path d="M6.4 26.4a5.4 5.4 0 0 1 3-3" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.8" />
                <path d="M35.4 26.4a5.4 5.4 0 0 1 3-3" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.8" />
                {/* delivery box with the MedMate M */}
                <rect x="-0.5" y="16.6" width="13" height="1.2" fill="#2A3631" />
                <rect x="-1" y="5" width="13" height="11.8" rx="1.6" fill="url(#ds-box)" />
                <rect x="9.4" y="5" width="2.6" height="11.8" rx="1.2" fill="#000" opacity="0.08" />
                <rect x="1.7" y="8.2" width="7.6" height="6.4" rx="1.3" fill="#1B3D29" />
                <path d="M3.1 13.2V9.6l2.4 2.4 2.4-2.4v3.6" fill="none" stroke="#D9A648" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
                <rect data-k={`lid${i}`} x="-1.6" y="3.6" width="14.2" height="2.4" rx="1" fill="#B98232" />
                {/* body */}
                <path d="M.8 26.5C.8 21.6 4.3 18.2 9.8 18.2h16.8c2.1 0 2.9 2.4 1.6 5l-2.4 5.2h-7C18.2 24.4 15 21.6 11 21.6s-7.2 2.6-7.7 6.2z" fill="url(#ds-body)" />
                <path d="M4.6 21.6c4.4-1.2 13.4-1.4 23-1.2" fill="none" stroke="#D9A648" strokeWidth="0.9" />
                <rect x="0.4" y="21.6" width="1.6" height="2.6" rx="0.5" fill="#E04B3A" />
                <path d="M24.6 28.6h10.2l.8-1.8H25.4z" fill="#26332D" />
                <path d="M31.6 28.4l3-14.2c.6-2.6 2.8-3.6 4.7-2.6l2.9 1.8c-.4 6.2-1.6 11-3.8 14l-1.8 1.2z" fill="url(#ds-body)" />
                <path d="M34.2 26.6c1-3.2 3.4-4.6 6.2-4.6 3 0 5.4 1.8 6.2 4.6h-1.4c-.8-2-2.6-3.2-4.8-3.2s-4 1.2-4.8 3.2z" fill="#2C7A4E" />
                <circle cx="41.6" cy="14.2" r="3.6" fill="url(#ds-head)" />
                <circle cx="41.6" cy="14.2" r="1.7" fill="#FFF6D6" stroke="#2A3631" strokeWidth="0.4" />
                <path d="M38.6 11.8l-1.8-5.2" stroke="#26332D" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M34.4 6.4l5-.6" stroke="#26332D" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M37.6 6l1.2-3.6" stroke="#26332D" strokeWidth="0.6" /><ellipse cx="39.2" cy="1.9" rx="1.1" ry="0.8" fill="#26332D" />
                <path d="M8.6 18.4c.8-2.6 3.8-3.2 7-3.2l9.6.4c1.6.1 2.2 1.4 1.2 2.8z" fill="#1E2A25" />
                {/* rider */}
                <path d="M15.5 15.2l11.1 1.2.8 10" fill="none" stroke="#24323A" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M26 27.2h3.4a.8.8 0 0 0 0-1.6h-3z" fill="#151B18" />
                <path d="M13.6 16.2c-.4-5.8 2.6-10.8 7-11.4l3.2.6c1.6 3 .6 7.2-1.6 11z" fill="url(#ds-jacket)" />
                <path d="M15.4 10.4l8-2.2" stroke="#D9A648" strokeWidth="0.8" />
                <path d="M22.4 7.2q6 2.4 12.2-.6" fill="none" stroke="#2A7049" strokeWidth="2.3" strokeLinecap="round" />
                <circle cx="34.8" cy="6.5" r="1.15" fill="#1A211E" />
                <circle cx="21.6" cy="1.2" r="4.3" fill="url(#ds-helmet)" />
                <path d="M23.4-1.6c2 .8 2.8 2.6 2.4 4.4l-2.2-.4c.3-1.4.2-2.8-.2-4z" fill="#D9A648" opacity="0.95" />
                <path d="M18.6-1.2c1-1.2 2.6-1.7 4-1.5" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.7" strokeLinecap="round" />
              </g>
            </g>
          </g>

          {/* Medicine bag (paper bag with a green cross) */}
          <g data-k={`bag${i}`} opacity="0">
            <path d="M-2.4-6.8h4.8l.6 6.8h-6z" fill="#D3AA72" />
            <path d="M-2.4-6.8h4.8l-.4 1.2h-4z" fill="#BE9259" />
            <path d="M-1.2-6.8c0-1.6 2.4-1.6 2.4 0" fill="none" stroke="#8C6A3D" strokeWidth="0.5" />
            <rect x="-0.45" y="-4.6" width="0.9" height="2.8" fill="#2F7D52" /><rect x="-1.4" y="-3.65" width="2.8" height="0.9" fill="#2F7D52" />
          </g>
    </>
  );
}
