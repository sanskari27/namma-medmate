"use client";
import { useState, useMemo } from "react";
import { usePharma } from "../pharmaState";
import { inr, fmtDateTime, computeInvoice, Sale, PayMode, PAY_LABEL, SALE_SOURCES, saleSourceOf } from "../data";
import { buildPatientLedger, PatientGroup } from "../lib/hospital";
import { IconSearch, IconX, IconRupee, IconCheck } from "../components/Icon";

const SETTLE_MODES: PayMode[] = ["cash", "upi", "card", "insurance"];
const billTotal = (s: Sale) => computeInvoice(s.items, s.discount).payable;

export default function PatientBillsScreen() {
  const { sales, settleBills, profile, now } = usePharma();
  const [tab, setTab] = useState<"active" | "all">("active");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const groups = useMemo(() => buildPatientLedger(sales), [sales]);
  const shown = groups
    .filter((g) => tab === "all" || g.outstanding > 0)
    .filter((g) => !q.trim() || `${g.patientId} ${g.name} ${g.ward}`.toLowerCase().includes(q.toLowerCase()));

  const activeCount = groups.filter((g) => g.outstanding > 0).length;
  const totalOutstanding = groups.reduce((a, g) => a + g.outstanding, 0);
  const unsettledBills = groups.reduce((a, g) => a + g.unsettled, 0);
  const current = groups.find((g) => g.key === sel) ?? null;

  return (
    <div className="pd-canvas-wide">
      <div className="pd-summary-chips" style={{ marginBottom: 16 }}>
        <div className="pd-schip">Active patients<b>{activeCount}</b></div>
        <div className="pd-schip">Outstanding<b>{inr(totalOutstanding)}</b></div>
        <div className="pd-schip">Unsettled bills<b>{unsettledBills}</b></div>
        <div className="pd-schip">In-patients (total)<b>{groups.length}</b></div>
      </div>

      <div className="pd-toolbar">
        <div className="pd-flex pd-gap6">
          <button className={`pd-chip${tab === "active" ? " on" : ""}`} onClick={() => setTab("active")}>Active · unsettled</button>
          <button className={`pd-chip${tab === "all" ? " on" : ""}`} onClick={() => setTab("all")}>All in-patients</button>
        </div>
        <div className="pd-spacer" />
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Patient ID, name, ward…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <div className="pd-grid-cards" style={{ marginTop: 16 }}>
        {shown.map((g) => {
          const so = SALE_SOURCES.find((x) => x.key === g.source)!;
          return (
            <button key={g.key} className="pd-card pd-card-pad pd-srccard" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setSel(g.key)}>
              <div className="pd-flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: 16 }}>{g.name}</h3>
                  <div className="pd-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{g.patientId || "No Patient ID"} · {so.emoji} {g.ward}</div>
                </div>
                <span className={`pd-pill ${g.outstanding > 0 ? "pill-rose" : "pill-green"}`}>{g.outstanding > 0 ? "Active" : "Settled"}</span>
              </div>
              <div className="pd-flex" style={{ justifyContent: "space-between", marginTop: 14, fontSize: 13 }}>
                <span className="pd-muted">{g.bills.length} bill{g.bills.length !== 1 ? "s" : ""}{g.unsettled ? ` · ${g.unsettled} unsettled` : ""}</span>
                <span style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 16, color: g.outstanding > 0 ? "var(--rose)" : "var(--mid)" }}>{inr(g.outstanding > 0 ? g.outstanding : g.total)}</span>
              </div>
            </button>
          );
        })}
        {shown.length === 0 && <div className="pd-empty">{tab === "active" ? "No patients with unsettled bills" : "No in-patient bills yet."}</div>}
      </div>

      {current && <SettleModal g={current} onClose={() => setSel(null)} settleBills={settleBills} profileName={profile.name} now={now} />}
    </div>
  );
}

function SettleModal({ g, onClose, settleBills, now }: { g: PatientGroup; onClose: () => void; settleBills: (ids: string[], m: PayMode) => void; profileName: string; now: number }) {
  const [mode, setMode] = useState<PayMode>("cash");
  const unpaid = g.bills.filter((b) => b.paid === false);
  const so = SALE_SOURCES.find((x) => x.key === g.source)!;
  const settle = () => { settleBills(unpaid.map((b) => b.id), mode); onClose(); };

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head">
          <div>
            <h3>{g.name}</h3>
            <small className="pd-muted">{g.patientId || "No Patient ID"} · {so.emoji} {g.ward} · last bill {fmtDateTime(g.lastAt)}</small>
          </div>
          <button className="pd-iconbtn" onClick={onClose}><IconX size={18} /></button>
        </div>
        <div className="pd-modal-body">
          <div className="pd-summary-chips" style={{ marginBottom: 14 }}>
            <div className="pd-schip">Bills<b>{g.bills.length}</b></div>
            <div className="pd-schip">Total<b>{inr(g.total)}</b></div>
            <div className="pd-schip">Settled<b>{inr(g.paid)}</b></div>
            <div className="pd-schip">Outstanding<b>{inr(g.outstanding)}</b></div>
          </div>

          <div className="pd-tbl-wrap">
            <table className="pd-tbl">
              <thead><tr><th>Invoice</th><th>Date</th><th>Source</th><th>Items</th><th>Payment</th><th>Status</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {g.bills.map((b) => (
                  <tr key={b.id}>
                    <td className="pd-mono" style={{ fontWeight: 700 }}>{b.id}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(b.createdAt)}</td>
                    <td>{SALE_SOURCES.find((x) => x.key === saleSourceOf(b))!.short}</td>
                    <td>{b.items.length} item{b.items.length !== 1 ? "s" : ""}<div className="pd-muted" style={{ fontSize: 11 }}>{b.items.map((i) => i.name).join(", ").slice(0, 40)}{b.items.map((i) => i.name).join(", ").length > 40 ? "…" : ""}</div></td>
                    <td>{PAY_LABEL[b.payMode]}{b.insurer ? <div className="pd-muted" style={{ fontSize: 11 }}>{b.insurer}</div> : null}</td>
                    <td><span className={`pd-pill ${b.paid === false ? "pill-rose" : "pill-green"}`}>{b.paid === false ? "Unpaid" : "Paid"}</span></td>
                    <td className="num" style={{ fontWeight: 800 }}>{inr(billTotal(b))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {unpaid.length > 0 ? (
            <div className="pd-card pd-card-pad" style={{ marginTop: 16, background: "var(--wash2)" }}>
              <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <b>Settle {unpaid.length} unsettled bill{unpaid.length !== 1 ? "s" : ""}</b>
                <span style={{ fontFamily: "Manrope", fontWeight: 800, color: "var(--rose)" }}>{inr(g.outstanding)}</span>
              </div>
              <div className="pd-flex pd-gap6" style={{ marginBottom: 12, flexWrap: "wrap" }}>
                {SETTLE_MODES.map((m) => <button key={m} className={`pd-chip${mode === m ? " on" : ""}`} onClick={() => setMode(m)}>{PAY_LABEL[m]}</button>)}
              </div>
              <button className="pd-btn pd-btn-primary pd-btn-lg pd-btn-block" onClick={settle}><IconRupee size={16} /> Settle {inr(g.outstanding)} · {PAY_LABEL[mode]}</button>
            </div>
          ) : (
            <div className="pd-pill pill-green" style={{ width: "100%", justifyContent: "center", padding: 10, marginTop: 16 }}><IconCheck size={14} /> All bills settled for this patient</div>
          )}
        </div>
      </div>
    </div>
  );
}
