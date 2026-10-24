"use client";
import { useState } from "react";
import { Prescription, rxImageDataUrl, fmtDateTime } from "../data";
import { buildRxPdf } from "../lib/pdf";
import { IconPill, IconCheck, IconDoc, IconDownload, IconX } from "./Icon";

const openPdf = (rx: Prescription) => {
  const u = URL.createObjectURL(buildRxPdf(rx));
  window.open(u, "_blank");
  setTimeout(() => URL.revokeObjectURL(u), 60000);
};

// Renders a prescription the way the customer submitted it:
//  • "digital"  → Namma MedMate e-prescription card (verified, structured meds, e-signed) + download PDF
//  • "uploaded" → photo/scan (tap to enlarge) OR a PDF file (open) of the doctor's paper Rx
export default function RxView({ rx, compact }: { rx: Prescription; compact?: boolean }) {
  const [zoom, setZoom] = useState(false);

  if (rx.kind === "digital") {
    const signed = rx.signedAt ?? rx.uploadedAt;
    return (
      <div style={{ border: "1.5px solid #cdbff0", borderRadius: 14, overflow: "hidden", background: "linear-gradient(180deg,#f6f2ff,#ffffff)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "linear-gradient(100deg,#6d4fc4,#8a6ee0)", color: "#fff" }}>
          <span style={{ fontSize: 16 }}><IconPill size={16} /></span>
          <b style={{ fontFamily: "Manrope, sans-serif", fontSize: 13.5, flex: 1 }}>Namma MedMate · Digital Prescription</b>
          <span style={{ fontSize: 10.5, fontWeight: 800, background: "rgba(255,255,255,.22)", padding: "3px 8px", borderRadius: 999 }}><IconCheck size={12} /> Verified</span>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{rx.doctor}</div>
          <div style={{ fontSize: 11.5, color: "#6b6b6b" }}>Reg. {rx.regNo ?? "—"} · Patient: {rx.patient}</div>
          <div style={{ margin: "12px 0 6px", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#8a6ee0" }}>℞ Medicines</div>
          {(rx.meds ?? []).map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px dashed #e7e0f5" }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</span>
              <span style={{ fontSize: 12, color: "#555", whiteSpace: "nowrap" }}>{m.dose}{m.days ? ` · ${m.days}d` : ""}</span>
            </div>
          ))}
          {rx.note && <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}><IconDoc size={13} /> {rx.note}</div>}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 11.5, color: "#6b6b6b", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "Brush Script MT, cursive", fontStyle: "italic", fontSize: 18, color: "#6d4fc4" }}>{rx.doctor.replace(/^Dr\.?\s*/i, "")}</span>
              · e-signed {fmtDateTime(signed)}
            </span>
            <button onClick={() => openPdf(rx)} style={pdfBtn}><IconDownload size={13} /> PDF</button>
          </div>
        </div>
      </div>
    );
  }

  // ── uploaded as PDF ──
  if (rx.fileType === "pdf") {
    return (
      <div style={{ border: "1.5px solid var(--line, #e3e9e4)", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--wash2, #f0faf4)" }}>
          <span style={{ fontSize: 15 }}><IconDoc size={15} /></span>
          <b style={{ fontFamily: "Manrope, sans-serif", fontSize: 13.5, flex: 1 }}>Patient-uploaded prescription · PDF</b>
        </div>
        <button onClick={() => openPdf(rx)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", border: "none", background: "#fbf3f2", padding: 16, cursor: "pointer", textAlign: "left" }}>
          <span style={{ width: 44, height: 52, borderRadius: 6, background: "#d83b3b", color: "#fff", fontWeight: 800, fontSize: 12, display: "grid", placeItems: "center", flexShrink: 0 }}>PDF</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 700, fontSize: 13.5 }}>{rx.id}.pdf</span>
            <span style={{ display: "block", fontSize: 11.5, color: "#6b6b6b" }}>{rx.doctor} · tap to open</span>
          </span>
          <span style={pdfBtn}>Open PDF</span>
        </button>
        <div style={{ padding: "10px 14px", fontSize: 11.5, color: "#6b6b6b" }}>Patient: {rx.patient} · uploaded {fmtDateTime(rx.uploadedAt)}</div>
      </div>
    );
  }

  // ── uploaded as image (photo/scan) ──
  const src = rx.image || rxImageDataUrl(rx);
  return (
    <>
      <div style={{ border: "1.5px solid var(--line, #e3e9e4)", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--wash2, #f0faf4)" }}>
          <span style={{ fontSize: 15 }}><IconDoc size={15} /></span>
          <b style={{ fontFamily: "Manrope, sans-serif", fontSize: 13.5, flex: 1 }}>Patient-uploaded prescription</b>
          <button onClick={() => openPdf(rx)} style={{ fontSize: 11.5, fontWeight: 800, color: "var(--green,#2f7d52)", background: "none", border: "none", cursor: "pointer" }}><IconDownload size={13} /> PDF</button>
          <button onClick={() => setZoom(true)} style={{ fontSize: 11.5, fontWeight: 800, color: "var(--green,#2f7d52)", background: "none", border: "none", cursor: "pointer" }}>Enlarge ⤢</button>
        </div>
        <button onClick={() => setZoom(true)} style={{ display: "block", width: "100%", border: "none", background: "#f4f3ee", padding: 12, cursor: "zoom-in" }}>
          <img src={src} alt={`Prescription ${rx.id}`} style={{ display: "block", width: "100%", maxHeight: compact ? 200 : 320, objectFit: "contain", borderRadius: 8 }} />
        </button>
        <div style={{ padding: "10px 14px", fontSize: 11.5, color: "#6b6b6b" }}>
          {rx.doctor} · Patient: {rx.patient} · uploaded {fmtDateTime(rx.uploadedAt)}
        </div>
      </div>

      {zoom && (
        <div onClick={() => setZoom(false)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={src} alt={`Prescription ${rx.id}`} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 10, boxShadow: "0 10px 40px rgba(0,0,0,.5)" }} onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setZoom(false)} style={{ position: "fixed", top: 18, right: 18, width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.92)", fontSize: 20, fontWeight: 800, cursor: "pointer" }}><IconX size={16} /></button>
        </div>
      )}
    </>
  );
}

const pdfBtn: React.CSSProperties = { flexShrink: 0, background: "var(--dark,#1B3D29)", color: "#fff", fontWeight: 800, fontSize: 11.5, padding: "6px 11px", borderRadius: 999, border: "none", cursor: "pointer", whiteSpace: "nowrap" };
