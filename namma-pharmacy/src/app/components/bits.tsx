"use client";
import { OrderStatus, STATUS_LABEL, Channel, Schedule, SCHEDULE_META, InvProduct, stockOf, isLowStock, looseUnitsOf, stockLabel } from "../data";
import { IconGlobe, IconStore } from "./Icon";

/** Product thumbnail: shows the uploaded photo, else the emoji. Place inside an `.em` box. */
export function Thumb({ p }: { p: InvProduct }) {
  return p.image ? <img className="pd-thumb" src={p.image} alt={p.name} /> : <>{p.emoji}</>;
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const cls: Record<OrderStatus, string> = {
    new: "pill-gold", accepted: "pill-blue", packed: "pill-teal",
    out: "pill-blue", delivered: "pill-green", completed: "pill-green", cancelled: "pill-rose",
  };
  return <span className={`pd-pill ${cls[status]}`}><i className="d" />{STATUS_LABEL[status]}</span>;
}

export function ChannelPill({ channel }: { channel: Channel }) {
  return channel === "online"
    ? <span className="pd-pill pill-blue"><IconGlobe size={13} /> Online</span>
    : <span className="pd-pill pill-gray"><IconStore size={13} /> Counter</span>;
}

export function ScheduleTag({ schedule }: { schedule: Schedule }) {
  const m = SCHEDULE_META[schedule];
  return <span className={`pd-tag ${m.rx ? "rx" : "otc"}`} title={m.note}>{m.label}</span>;
}

export function StockPill({ p }: { p: InvProduct; now?: number }) {
  const strips = stockOf(p);
  const loose = looseUnitsOf(p);
  if (strips <= 0 && loose <= 0) return <span className="pd-pill pill-rose"><i className="d" />Out of stock</span>;
  const label = stockLabel(p);
  if (isLowStock(p)) return <span className="pd-pill pill-gold"><i className="d" />Low · {label}</span>;
  return <span className="pd-pill pill-green"><i className="d" />{label}</span>;
}
