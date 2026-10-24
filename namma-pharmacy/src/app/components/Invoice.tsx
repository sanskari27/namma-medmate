"use client";
import { Sale, PharmacyProfile, computeInvoice, inr2, inr, PAY_LABEL, channelLabel, fmtDateTime } from "../data";
import { usePharma } from "../pharmaState";
import { IconAlert } from "./Icon";

// A GST/VAT tax invoice — rendered on screen and printed via window.print().
// Four templates (classic / modern / minimal / thermal) + brand logo, accent colour and signature stamp.
export default function Invoice({ sale, profile }: { sale: Sale; profile: PharmacyProfile }) {
  const { invoiceSettings: cfg } = usePharma();
  const t = computeInvoice(sale.items, sale.discount);
  const accentStyle = { ["--inv-accent" as string]: cfg.accent } as React.CSSProperties;
  const logo = cfg.showLogo && profile.logo ? profile.logo : null;

  // ── thermal (80mm receipt) is a distinct compact layout ──
  if (cfg.template === "thermal") {
    return (
      <div className="pd-invoice pd-inv-thermal pd-print-area" style={accentStyle}>
        <div className="th-head">
          {logo && <img className="th-logo" src={logo} alt="logo" />}
          <div className="th-nm">{profile.name}</div>
          <div className="th-meta">{profile.address}</div>
          <div className="th-meta">Ph {profile.phone}</div>
          <div className="th-meta">GSTIN {profile.gstin} · DL {profile.dlNo}</div>
        </div>
        <div className="th-title">{cfg.title}</div>
        <div className="th-rowline"><span>{sale.id}</span><span>{fmtDateTime(sale.createdAt)}</span></div>
        <div className="th-rowline"><span>{sale.customer.name}</span><span>{PAY_LABEL[sale.payMode]}</span></div>
        <div className="th-sep" />
        {sale.items.map((it, i) => (
          <div className="th-item" key={it.productId + it.batchNo}>
            <div className="th-item-nm">{i + 1}. {it.name} <small>· B:{it.batchNo}</small></div>
            <div className="th-item-ln"><span>{it.qty} × {inr2(it.price)}</span><span>{inr2(it.price * it.qty)}</span></div>
          </div>
        ))}
        <div className="th-sep" />
        <div className="th-rowline"><span>Taxable</span><span>{inr2(t.taxable)}</span></div>
        {t.lines.map((l) => <div className="th-rowline" key={l.gst}><span>GST {l.gst}%</span><span>{inr2(l.cgst + l.sgst)}</span></div>)}
        {t.discount > 0 && <div className="th-rowline"><span>Discount</span><span>− {inr2(t.discount)}</span></div>}
        <div className="th-total"><span>TOTAL</span><span>{inr(t.payable)}</span></div>
        {cfg.showSavings && t.savings > 0 && <div className="th-save">You saved {inr(t.savings)} on MRP</div>}
        <div className="th-sep" />
        <div className="th-foot">{cfg.footerNote}</div>
      </div>
    );
  }

  // ── classic / modern / minimal share the A4 layout (CSS differentiates) ──
  return (
    <div className={`pd-invoice pd-inv-${cfg.template} pd-print-area`} style={accentStyle}>
      <div className="pd-inv-top">
        <div className="pd-inv-brand">
          {logo && <img className="pd-inv-logo" src={logo} alt="logo" />}
          <div>
            <div className="ph-nm">{profile.name}</div>
            <div className="meta">
              {profile.address}<br />
              Ph: {profile.phone} · {profile.email}<br />
              <b>GSTIN:</b> {profile.gstin} &nbsp; <b>D.L. No:</b> {profile.dlNo}
            </div>
          </div>
        </div>
        <div className="rt">
          <div className="pd-inv-title">{cfg.title}</div>
          <div className="meta">
            <b>{sale.id}</b><br />
            {fmtDateTime(sale.createdAt)}<br />
            {channelLabel(sale.channel)} sale
          </div>
        </div>
      </div>

      <div className="pd-inv-meta-grid">
        <div><span className="lb">Billed to: </span><b>{sale.customer.name}{sale.ward ? ` · ${sale.ward}` : ""}</b></div>
        <div><span className="lb">Payment: </span><b style={sale.paid === false ? { color: "#c0392b" } : undefined}>{sale.paid === false ? "PENDING — pay at reception" : PAY_LABEL[sale.payMode]}</b></div>
        {sale.customer.phone && <div><span className="lb">Phone: </span>{sale.customer.phone}</div>}
        {cfg.includeDoctor && sale.customer.doctor && <div><span className="lb">Prescribed by: </span>{sale.customer.doctor}</div>}
        {sale.customer.address && <div className="pd-span2"><span className="lb">Address: </span>{sale.customer.address}</div>}
      </div>

      {sale.paid === false && (
        <div style={{ margin: "10px 0", padding: "8px 12px", border: "1.5px dashed #c0392b", borderRadius: 8, color: "#c0392b", fontWeight: 800, fontSize: 12.5, letterSpacing: ".04em", textAlign: "center" }}>
          <IconAlert size={13} /> PAYMENT PENDING — COLLECT AT RECEPTION / BILLING COUNTER
        </div>
      )}

      <table className="pd-inv-tbl">
        <thead>
          <tr>
            <th>#</th><th>Item</th>{cfg.showHsn && <th>HSN</th>}<th>Batch</th><th>Exp</th>
            <th className="num">Qty</th><th className="num">MRP</th><th className="num">Rate</th>
            <th className="num">GST%</th><th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it, i) => (
            <tr key={it.productId + it.batchNo}>
              <td>{i + 1}</td>
              <td><b>{it.name}</b></td>
              {cfg.showHsn && <td>{it.hsn}</td>}
              <td>{it.batchNo}</td>
              <td>{it.expiry}</td>
              <td className="num">{it.qty}</td>
              <td className="num">{inr2(it.mrp)}</td>
              <td className="num">{inr2(it.price)}</td>
              <td className="num">{it.gst}%</td>
              <td className="num">{inr2(it.price * it.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pd-inv-sum">
        <table>
          <tbody>
            <tr><td>Gross (incl. GST)</td><td className="num">{inr2(t.gross)}</td></tr>
            {t.discount > 0 && <tr><td>Discount</td><td className="num">− {inr2(t.discount)}</td></tr>}
            <tr><td>Taxable value</td><td className="num">{inr2(t.taxable)}</td></tr>
            {t.lines.map((l) => (
              <tr key={l.gst}>
                <td>CGST {l.gst / 2}% + SGST {l.gst / 2}%</td>
                <td className="num">{inr2(l.cgst + l.sgst)}</td>
              </tr>
            ))}
            {Math.abs(t.roundOff) >= 0.005 && <tr><td>Round off</td><td className="num">{t.roundOff >= 0 ? "+" : "−"} {inr2(Math.abs(t.roundOff))}</td></tr>}
            <tr className="grand"><td>Amount payable</td><td className="num">{inr(t.payable)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="pd-inv-foot">
        <div style={{ maxWidth: "56%" }}>
          {cfg.showSavings && t.savings > 0 && <><b style={{ color: "var(--inv-accent)" }}>You saved {inr(t.savings)}</b> on MRP.<br /></>}
          {cfg.terms}
          {cfg.showBank && <><br /><span style={{ fontSize: 10.5 }}>{cfg.bankLine}</span></>}
          {cfg.footerNote && <><br /><span style={{ fontSize: 10.5, color: "#888" }}>{cfg.footerNote}</span></>}
        </div>
        <div className="pd-inv-sign">
          <span className="fr">For <b>{profile.name}</b></span>
          <span className="pd-inv-marks">
            {cfg.showStamp && cfg.stamp && <img className="pd-inv-stamp" src={cfg.stamp} alt="stamp" />}
            {profile.signature && <img className="pd-inv-sig" src={profile.signature} alt="signature" />}
          </span>
          <span className="sg">{cfg.signatory}</span>
          <span className="ph">{profile.pharmacist}</span>
        </div>
      </div>
    </div>
  );
}
