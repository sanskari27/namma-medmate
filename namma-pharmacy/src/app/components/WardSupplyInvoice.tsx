"use client";
import { inr, fmtDateTime, PharmacyProfile } from "../data";
import { WardSupplyItem, WardSupplyReason, reasonMeta, HospitalAccount, itemMrp } from "../lib/hospitalAccount";
import { IconPrint, IconCheck } from "./Icon";

// Ward-supply credit invoice — shown before sending to the hospital, and re-viewable after.
// Lists every medicine with batch no., MRP and the discounted hospital (credit) price, so the
// hospital can see what to bill the patient. Self-contained styles + print (Save as PDF).
export type SupplyInvoiceData = {
  invoiceNo: string;
  at: number;
  wardName: string;
  reason: WardSupplyReason;
  patientId?: string;
  patientName?: string;
  refDoc?: string;
  indentId?: string;
  items: WardSupplyItem[];
};

export default function WardSupplyInvoice({ data, profile, account, onClose, onEdit, onConfirm }: {
  data: SupplyInvoiceData; profile: PharmacyProfile; account: HospitalAccount;
  onClose: () => void; onEdit?: () => void; onConfirm?: () => void;
}) {
  const rows = data.items.map((it) => {
    const mrp = itemMrp(it, account.discountPct);
    const disc = mrp > 0 ? Math.round((1 - it.price / mrp) * 100) : 0;
    return { ...it, mrp, disc, mrpAmount: Math.round(mrp * it.qty * 100) / 100, amount: Math.round(it.price * it.qty * 100) / 100 };
  });
  const mrpTotal = rows.reduce((a, r) => a + r.mrpAmount, 0);
  const creditTotal = rows.reduce((a, r) => a + r.amount, 0);
  const margin = Math.round((mrpTotal - creditTotal) * 100) / 100;
  const draft = onConfirm != null;

  return (
    <div className="wsi-wrap" onClick={onClose}>
      <style>{CSS}</style>
      <div className="wsi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wsi-controls">
          <b>{draft ? "Invoice preview — review before sending to hospital" : `Invoice ${data.invoiceNo}`}</b>
          <span style={{ flex: 1 }} />
          <button className="wsi-btn" onClick={() => window.print()}><IconPrint size={14} /> Print / Save PDF</button>
          {onEdit && <button className="wsi-btn" onClick={onEdit}>← Edit</button>}
          {onConfirm ? <button className="wsi-btn wsi-primary" onClick={onConfirm}><IconCheck size={14} /> Confirm &amp; send to hospital</button> : <button className="wsi-btn" onClick={onClose}>Close</button>}
        </div>

        <div className="wsi-print-area">
          <div className="wsi-paper">
            {/* header */}
            <div className="wsi-head">
              <div>
                <div className="wsi-title">TAX INVOICE</div>
                <div className="wsi-sub">Ward supply · billed to hospital on credit</div>
              </div>
              <div className="wsi-no">
                <div><span>Invoice no.</span><b>{data.invoiceNo}</b></div>
                <div><span>Date</span><b>{fmtDateTime(data.at)}</b></div>
                <div><span>Terms</span><b>{account.creditTerms}</b></div>
              </div>
            </div>

            {/* parties */}
            <div className="wsi-parties">
              <div className="wsi-party">
                <span className="lbl">Supplied by</span>
                <b>{profile.name}</b>
                <p>{profile.address}</p>
                <p>GSTIN: {profile.gstin || "—"} · DL: {profile.dlNo || "—"}</p>
              </div>
              <div className="wsi-party">
                <span className="lbl">Bill to (credit account)</span>
                <b>{account.name}</b>
                <p>{account.contact}</p>
                <p>GSTIN: {account.gstin || "—"}</p>
              </div>
            </div>

            {/* meta */}
            <div className="wsi-meta">
              <div><span>Ward</span><b>{data.wardName}</b></div>
              <div><span>Reason</span><b>{reasonMeta(data.reason).label}</b></div>
              <div><span>Indent ref</span><b>{data.indentId || data.refDoc || "—"}</b></div>
              <div><span>Patient (refill)</span><b>{data.patientId ? `${data.patientId}${data.patientName ? " · " + data.patientName : ""}` : "—"}</b></div>
            </div>

            {/* lines */}
            <table className="wsi-table">
              <thead><tr><th>#</th><th>Medicine</th><th>Batch</th><th>Exp</th><th>HSN</th><th className="n">GST%</th><th className="n">Qty</th><th className="n">MRP</th><th className="n">Credit price</th><th className="n">Disc%</th><th className="n">Amount</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="wsi-name">{r.name}</td>
                    <td className="mono">{r.batchNo}</td>
                    <td className="mono">{r.expiry}</td>
                    <td className="mono">{r.hsn}</td>
                    <td className="n">{r.gst}%</td>
                    <td className="n">{r.qty}</td>
                    <td className="n">{inr(r.mrp)}</td>
                    <td className="n"><b>{inr(r.price)}</b></td>
                    <td className="n">{r.disc}%</td>
                    <td className="n"><b>{inr(r.amount)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* totals */}
            <div className="wsi-totals">
              <div className="wsi-tline"><span>MRP value (for patient billing)</span><b>{inr(mrpTotal)}</b></div>
              <div className="wsi-tline grand"><span>Billed to hospital (credit, GST incl.)</span><b>{inr(creditTotal)}</b></div>
              <div className="wsi-tline"><span>Hospital margin if billed at MRP</span><b className="green">{inr(margin)}</b></div>
            </div>

            <p className="wsi-note">Goods supplied to the ward and billed to <b>{account.name}</b> on credit at the institutional rate ({account.discountPct}% off MRP). <b>MRP</b> is shown so the hospital can bill the patient; the hospital settles this invoice with the pharmacy. Prices are GST-inclusive. This is a computer-generated invoice.</p>

            <div className="wsi-sign"><i />For {profile.name}<br />Authorised signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.wsi-wrap { position: fixed; inset: 0; z-index: 200; background: rgba(15,30,22,.55); display: flex; align-items: flex-start; justify-content: center; padding: 24px; overflow: auto; }
.wsi-modal { background: #eef3f0; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.3); width: 100%; max-width: 880px; }
.wsi-controls { display: flex; align-items: center; gap: 8px; padding: 13px 16px; border-bottom: 1px solid #d8e4dd; position: sticky; top: 0; background: #eef3f0; z-index: 2; border-radius: 14px 14px 0 0; flex-wrap: wrap; }
.wsi-controls b { font-family: Manrope, sans-serif; font-size: 13.5px; color: #1B3D29; }
.wsi-btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 13px; border-radius: 9px; border: 1px solid #cfe0d6; background: #fff; color: #1B3D29; cursor: pointer; }
.wsi-primary { background: #2F7D52; color: #fff; border-color: #2F7D52; }
.wsi-print-area { padding: 22px; }
.wsi-paper { background: #fff; border: 1px solid #e1ece5; border-radius: 8px; padding: 26px 28px; color: #16241c; font-size: 12.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

.wsi-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1B3D29; padding-bottom: 12px; }
.wsi-title { font-family: Manrope, sans-serif; font-weight: 800; font-size: 22px; color: #1B3D29; letter-spacing: .02em; }
.wsi-sub { font-size: 11.5px; color: #5d7a6b; margin-top: 1px; }
.wsi-no { text-align: right; display: flex; flex-direction: column; gap: 2px; }
.wsi-no > div { font-size: 11.5px; }
.wsi-no span { color: #8AAE9A; margin-right: 6px; }
.wsi-no b { font-family: "IBM Plex Mono", monospace; color: #16241c; }

.wsi-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 16px 0; }
.wsi-party .lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em; color: #8AAE9A; font-weight: 800; }
.wsi-party b { display: block; font-family: Manrope, sans-serif; font-size: 14px; color: #1B3D29; margin: 3px 0; }
.wsi-party p { margin: 1px 0; font-size: 11.5px; color: #3a5346; line-height: 1.4; }

.wsi-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #F0FAF4; border: 1px solid #e1ece5; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
.wsi-meta span { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #8AAE9A; font-weight: 800; }
.wsi-meta b { font-size: 12px; color: #16241c; }

.wsi-table { width: 100%; border-collapse: collapse; }
.wsi-table th { background: #1B3D29; color: #fff; font-size: 9.5px; text-transform: uppercase; letter-spacing: .03em; padding: 7px 7px; text-align: left; font-weight: 700; }
.wsi-table th.n, .wsi-table td.n { text-align: right; }
.wsi-table td { padding: 7px 7px; border-bottom: 1px solid #eef3f0; font-size: 11.5px; }
.wsi-table .wsi-name { font-weight: 700; color: #16241c; }
.wsi-table .mono { font-family: "IBM Plex Mono", monospace; font-size: 10.5px; color: #3a5346; }

.wsi-totals { margin-top: 12px; margin-left: auto; width: 340px; }
.wsi-tline { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12.5px; }
.wsi-tline b { font-family: Manrope, sans-serif; }
.wsi-tline.grand { border-top: 1px solid #cfe0d6; border-bottom: 2px solid #1B3D29; margin: 3px 0; padding: 8px 0; font-size: 14px; color: #1B3D29; font-weight: 800; }
.wsi-tline .green { color: #2F7D52; }
.wsi-note { font-size: 9.5px; color: #5d7a6b; line-height: 1.5; margin-top: 16px; border-top: 1px dashed #cfe0d6; padding-top: 10px; }
.wsi-sign { margin-top: 22px; margin-left: auto; width: 200px; text-align: center; font-size: 10.5px; color: #3a5346; }
.wsi-sign i { display: block; border-top: 1px solid #8AAE9A; margin-bottom: 4px; height: 28px; }

@media print {
  body * { visibility: hidden !important; }
  .wsi-print-area, .wsi-print-area * { visibility: visible !important; }
  .wsi-print-area { position: fixed; inset: 0; padding: 12mm; background: #fff; }
  .wsi-paper { border: 0; padding: 0; }
  @page { size: A4; margin: 12mm; }
}
`;
