"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import { Sale, PharmacyProfile, computeInvoice, inr } from "../data";
import { buildInvoicePdf } from "../lib/pdf";
import { IconX, IconWhatsApp, IconMessage, IconMail, IconLink, IconCheck, IconPrint } from "./Icon";

// Share a bill as a LINK (WhatsApp / SMS / Email). Opening the link opens the PDF.
export default function ShareSheet({ sale, profile, onClose }: {
  sale: Sale; profile: PharmacyProfile; onClose: () => void;
}) {
  const { toast } = usePharma();
  const [phone, setPhone] = useState(sale.customer.phone ?? "");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const total = inr(computeInvoice(sale.items, sale.discount).payable);
  const link = `https://bills.nammamedmate.in/${sale.id.replace(/[^A-Za-z0-9-]/g, "")}`;
  const name = sale.customer.name && sale.customer.name !== "Walk-in" ? " " + sale.customer.name : "";
  const msg = `Hi${name}, here is your bill ${sale.id} from ${profile.name} for ${total}${sale.paid === false ? " (payment pending)" : ""}. Open the link to view & download your PDF bill: ${link}`;
  const digits = phone.replace(/\D/g, "");
  const wa = digits ? (digits.length > 10 ? digits : "91" + digits.slice(-10)) : "";
  const open = (url: string) => { const w = window.open(url, "_blank"); if (!w) window.location.href = url; };

  // Opening the bill link opens the PDF — here we open the generated PDF directly.
  const openPdf = () => { const url = URL.createObjectURL(buildInvoicePdf(sale, profile)); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000); };

  const onWhatsApp = () => { open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`); toast("Opening WhatsApp with bill link…"); };
  const onSMS = () => { open(`sms:${digits}?&body=${encodeURIComponent(msg)}`); toast("Opening SMS with bill link…"); };
  const onEmail = () => { open(`mailto:${email}?subject=${encodeURIComponent("Bill " + sale.id + " - " + profile.name)}&body=${encodeURIComponent(msg)}`); toast("Opening email with bill link…"); };
  const onCopy = () => { try { navigator.clipboard?.writeText(link); } catch { /* */ } setCopied(true); toast("Bill link copied"); setTimeout(() => setCopied(false), 1500); };

  const opts = [
    { ic: <IconWhatsApp size={20} />, t: "WhatsApp", s: "Send bill link on WhatsApp", color: "#1faa53", bg: "#e6f7ec", onClick: onWhatsApp },
    { ic: <IconMessage size={20} />, t: "SMS", s: "Text the bill link", color: "var(--blue)", bg: "var(--blue-bg)", onClick: onSMS },
    { ic: <IconMail size={20} />, t: "Email", s: "Email the bill link", color: "var(--gold-d)", bg: "var(--amber-bg)", onClick: onEmail },
    { ic: <IconPrint size={20} />, t: "Open PDF", s: "Preview / save / print", color: "var(--mid)", bg: "var(--wash)", onClick: openPdf },
  ];

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Share bill {sale.id}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-form-grid" style={{ marginBottom: 14 }}>
            <div className="pd-field"><label>Customer phone</label><input className="pd-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" /></div>
            <div className="pd-field"><label>Customer email</label><input className="pd-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {opts.map((o) => (
              <button key={o.t} className="pd-card pd-card-pad" style={{ textAlign: "left", display: "flex", gap: 10, alignItems: "center", padding: 13 }} onClick={o.onClick}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: o.bg, color: o.color, display: "grid", placeItems: "center", flexShrink: 0 }}>{o.ic}</span>
                <span><span style={{ fontWeight: 700, fontSize: 13.5, display: "block" }}>{o.t}</span><span className="pd-muted" style={{ fontSize: 11 }}>{o.s}</span></span>
              </button>
            ))}
          </div>

          {/* shareable bill link */}
          <div style={{ marginTop: 14, fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>Bill link</div>
          <div className="pd-flex" style={{ marginTop: 6, gap: 8, background: "var(--wash2)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px" }}>
            <IconLink size={15} />
            <span className="pd-mono" style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</span>
            <button className="pd-btn pd-btn-sm pd-btn-ghost" onClick={openPdf}>Open</button>
            <button className="pd-btn pd-btn-sm pd-btn-ghost" onClick={onCopy}>{copied ? <><IconCheck size={13} /> Copied</> : "Copy"}</button>
          </div>
          <p className="pd-muted" style={{ fontSize: 11.5, marginTop: 10 }}><IconLink size={13} /> WhatsApp, SMS & Email all share a secure bill link — the customer opens it to view & download the PDF. No app needed.</p>
        </div>
      </div>
    </div>
  );
}
