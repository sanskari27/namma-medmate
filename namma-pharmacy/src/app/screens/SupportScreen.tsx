"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import { timeAgo } from "../data";
import { IconSend, IconX, IconTicket } from "../components/Icon";

const FAQS = [
  { q: "How do I add a new medicine to inventory?", a: "Go to Inventory → Add product, or simply enter a distributor bill under Purchases → New purchase entry and stock is created automatically." },
  { q: "How is GST calculated on my invoices?", a: "Selling prices (MRP) are GST-inclusive. The invoice backs out the taxable value and splits tax into CGST + SGST per slab automatically. Configure invoice text under Invoice Settings." },
  { q: "Can I hide certain medicines from the online store?", a: "Yes — open Online Store and toggle a product off, or use the toggle in Inventory. Hidden items stay available for counter billing only." },
  { q: "How do I reorder stock from my distributor?", a: "Open Reorder · Distributor. Low-stock items are grouped by their allotted distributor with suggested quantities — adjust and Send order. When goods arrive, record the bill under Purchases." },
  { q: "How do I share reports with my CA?", a: "Open CA / Accountant, add your accountant, pick the period and reports, and tap Share. The share is saved on this account. Email is not sent automatically." },
  { q: "What happens when my subscription expires?", a: "Billing and saved data stay safe. Online store and some advanced features pause until you renew under Subscription." },
];

export default function SupportScreen() {
  const { now, tickets, raiseTicket } = usePharma();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [show, setShow] = useState(false);

  const raise = async (subject: string, category: string) => {
    const err = await raiseTicket(subject, category);
    if (!err) setShow(false);
  };

  return (
    <div className="pd-canvas-wide" style={{ maxWidth: 1000 }}>
      <div className="pd-grid-2">
        {/* FAQ */}
        <div className="pd-card">
          <div className="pd-card-head"><h3>Frequently asked</h3></div>
          <div className="pd-card-pad" style={{ paddingTop: 6, paddingBottom: 6 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="pd-flex" style={{ width: "100%", justifyContent: "space-between", padding: "12px 0", background: "none", border: 0, textAlign: "left" }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{f.q}</span>
                  <span className="pd-muted" style={{ fontSize: 16, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform .15s" }}>+</span>
                </button>
                {openFaq === i && <p className="pd-muted" style={{ fontSize: 13, paddingBottom: 12, lineHeight: 1.55 }}>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* tickets */}
        <div className="pd-card">
          <div className="pd-card-head"><h3>Support tickets</h3><button className="pd-btn pd-btn-primary pd-btn-sm" onClick={() => setShow(true)}>Raise ticket</button></div>
          <div className="pd-card-pad" style={{ paddingTop: 4, paddingBottom: 6 }}>
            {tickets.length === 0 ? <div className="pd-empty" style={{ padding: 24 }}><div className="em"><IconTicket size={28} /></div><p>No tickets yet.</p></div> :
              tickets.map((t) => (
                <div className="pd-row" key={t.id}>
                  <span className="em"><IconTicket size={16} /></span>
                  <span className="gw"><div className="t">{t.subject}</div><div className="s">{t.id} · {t.category} · {timeAgo(t.createdAt, now)}</div></span>
                  <span className={`pd-pill ${t.status === "Resolved" ? "pill-green" : "pill-gold"}`}><i className="d" />{t.status}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {show && <TicketModal onClose={() => setShow(false)} onRaise={raise} />}
    </div>
  );
}

function TicketModal({ onClose, onRaise }: { onClose: () => void; onRaise: (subject: string, category: string) => void }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Billing");
  const [detail, setDetail] = useState("");
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Raise a support ticket</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-form-grid">
            <div className="pd-field pd-span2" data-field="name"><label>Subject</label><input className="pd-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Briefly describe the issue" /></div>
            <div className="pd-field pd-span2"><label>Category</label><select className="pd-select" value={category} onChange={(e) => setCategory(e.target.value)}>{["Billing", "Inventory", "Online store", "Payments", "Account", "Other"].map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="pd-field pd-span2"><label>Details</label><textarea className="pd-textarea" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Tell us what happened…" /></div>
          </div>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={!subject.trim()} onClick={() => onRaise(subject, category)}><IconSend size={15} /> Submit ticket</button>
        </div>
      </div>
    </div>
  );
}
