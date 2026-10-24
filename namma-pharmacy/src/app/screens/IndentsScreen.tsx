"use client";
import { useState, useMemo } from "react";
import { usePharma } from "../pharmaState";
import { fmtDateTime, inr } from "../data";
import { IndentStatus } from "../lib/hospital";
import { reasonMeta } from "../lib/hospitalAccount";
import { IconReceipt } from "../components/Icon";

const TONE: Record<IndentStatus, string> = { pending: "pill-gold", approved: "pill-blue", issued: "pill-green", rejected: "pill-rose" };
const LABEL: Record<IndentStatus, string> = { pending: "Pending", approved: "Approved", issued: "Issued", rejected: "Rejected" };
const FILTERS: ("all" | IndentStatus)[] = ["all", "pending", "approved", "issued", "rejected"];

export default function IndentsScreen() {
  const { wardIndents, setIndentStatus, wardSupplies, openIndentBilling } = usePharma();
  const supplyFor = (id: string) => wardSupplies.find((s) => s.indentId === id) ?? null;
  const [f, setF] = useState<"all" | IndentStatus>("all");
  const rows = useMemo(() => wardIndents.filter((x) => f === "all" || x.status === f).sort((a, b) => b.at - a.at), [wardIndents, f]);
  const count = (s: IndentStatus) => wardIndents.filter((x) => x.status === s).length;

  return (
    <div className="pd-canvas-wide">
      <div className="pd-summary-chips" style={{ marginBottom: 16 }}>
        <div className="pd-schip">Pending<b>{count("pending")}</b></div>
        <div className="pd-schip">Approved<b>{count("approved")}</b></div>
        <div className="pd-schip">Issued today<b>{count("issued")}</b></div>
        <div className="pd-schip">Total indents<b>{wardIndents.length}</b></div>
      </div>

      <div className="pd-toolbar" style={{ marginBottom: 14 }}>
        <div className="pd-flex pd-gap6">
          {FILTERS.map((x) => <button key={x} className={`pd-chip${f === x ? " on" : ""}`} onClick={() => setF(x)}>{x === "all" ? "All" : LABEL[x]}</button>)}
        </div>
      </div>

      <div className="pd-grid-cards">
        {rows.map((ind) => (
          <div className="pd-card pd-card-pad" key={ind.id}>
            <div className="pd-flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: 15 }}>{ind.wardName}</h3>
                <div className="pd-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{ind.id} · {ind.patient ?? "Ward stock"}</div>
              </div>
              <span className={`pd-pill ${TONE[ind.status]}`}>{LABEL[ind.status]}</span>
            </div>
            <div className="pd-muted" style={{ fontSize: 12, marginTop: 6 }}>Requested by {ind.requestedBy} · {fmtDateTime(ind.at)}</div>
            <ul className="pd-ob-itemlist">
              {ind.items.map((it, i) => (
                <li key={i}><span>{it.name}</span><b>×{it.qty}{it.issued ? ` · issued ${it.issued}` : ""}</b></li>
              ))}
            </ul>
            {ind.note && <p className="pd-muted" style={{ fontSize: 12, fontStyle: "italic", marginTop: 4 }}>“{ind.note}”</p>}
            {(() => { const sup = supplyFor(ind.id); return sup ? (
              <div className="pd-indent-bill">
                <IconReceipt size={14} /> Billed to hospital · <b className="pd-mono">{sup.id}</b> · {inr(sup.total)}
                <span className="pd-muted"> · {reasonMeta(sup.reason).tag} · {fmtDateTime(sup.at)}</span>
              </div>
            ) : null; })()}
            <div className="pd-flex pd-gap6" style={{ marginTop: 12 }}>
              {ind.status === "pending" && <>
                <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={() => setIndentStatus(ind.id, "approved")}>Approve</button>
                <button className="pd-btn pd-btn-ghost pd-btn-sm" style={{ color: "var(--rose)" }} onClick={() => setIndentStatus(ind.id, "rejected")}>Reject</button>
              </>}
              {ind.status === "approved" && <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={() => openIndentBilling(ind.id)}><IconReceipt size={14} /> Issue &amp; bill to hospital</button>}
              {ind.status === "issued" && (supplyFor(ind.id)
                ? <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => openIndentBilling(ind.id)}>View / re-bill</button>
                : <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={() => openIndentBilling(ind.id)}><IconReceipt size={14} /> Bill to hospital</button>)}
              {ind.status === "rejected" && <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => setIndentStatus(ind.id, "pending")}>Reopen</button>}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="pd-empty">No indents in this view.</div>}
      </div>
    </div>
  );
}
