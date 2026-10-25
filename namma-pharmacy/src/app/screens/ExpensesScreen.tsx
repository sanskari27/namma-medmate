"use client";
import { useMemo, useState } from "react";
import { usePharma } from "../pharmaState";
import { inr, Expense, PayMode, PAY_LABEL, fmtDateTime, expenseTax } from "../data";
import { IconPlus, IconSearch, IconReports, IconPrint, IconX, IconReceipt, IconDownload } from "../components/Icon";
import { useDateRange } from "../components/DateRangeField";
import { exportCatalogCsv, exportCatalogPdf } from "../lib/reportExport";
import { runReport } from "../lib/reportCatalog";

const ymd = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function ExpensesScreen() {
  const { expenses, expenseCategories, addExpense, removeExpense, profile, now, openReport } = usePharma();
  const period = useDateRange(now, "last-365");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [showRep, setShowRep] = useState(false);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => expenses
    .filter((e) => period.inWindow(e.date))
    .filter((e) => cat === "all" || e.category === cat)
    .filter((e) => !q.trim() || `${e.number} ${e.party} ${e.category} ${e.note ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date - a.date), [expenses, period, cat, q]);

  const total = rows.reduce((a, e) => a + e.amount, 0);
  const gstTotal = rows.reduce((a, e) => a + expenseTax(e), 0);

  return (
    <div className="pd-canvas-wide">
      <div className="pd-toolbar">
        {period.node}
        <select className="pd-select" style={{ width: 200 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All expense categories</option>
          {expenseCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Search expense, party…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="pd-spacer" />
        <div style={{ position: "relative" }}>
          <button className="pd-btn pd-btn-ghost" onClick={() => setShowRep((v) => !v)}><IconReports size={16} /> Reports ▾</button>
          {showRep && (
            <div className="pd-menu" style={{ position: "absolute", right: 0, top: "110%", zIndex: 20, minWidth: 210 }}>
              <button className="pd-menu-item" onClick={() => { setShowRep(false); openReport("expense-transaction"); }}>Expense Transactions</button>
              <button className="pd-menu-item" onClick={() => { setShowRep(false); openReport("expense-category"); }}>Expense Category</button>
            </div>
          )}
        </div>
        <button className="pd-btn pd-btn-primary" onClick={() => setCreating(true)}><IconPlus size={16} /> Create Expense</button>
      </div>

      <div className="pd-summary-chips" style={{ marginBottom: 16 }}>
        <div className="pd-schip">Expenses<b>{rows.length}</b></div>
        <div className="pd-schip">Total spend<b>{inr(total)}</b></div>
        <div className="pd-schip">GST (ITC eligible)<b>{inr(gstTotal)}</b></div>
        <div className="pd-schip">Period<b>{period.label}</b></div>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Date</th><th>Expense No.</th><th>Party Name</th><th>Category</th><th>Payment</th><th className="num">Amount</th><th></th></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.date)}</td>
                  <td className="pd-mono" style={{ fontWeight: 700 }}>{e.number}</td>
                  <td>{e.party}</td>
                  <td><span className="pd-pill pill-gray">{e.category}</span></td>
                  <td>{PAY_LABEL[e.paymentMode]}</td>
                  <td className="num" style={{ fontWeight: 800 }}>{inr(e.amount)}</td>
                  <td className="num"><button className="pd-icon-btn" title="Delete" onClick={() => removeExpense(e.id)}><IconX size={14} /></button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7}><div className="pd-empty"><div className="em"><IconReceipt size={28} /></div><p>No expenses match the current filter.</p></div></td></tr>}
            </tbody>
            {rows.length > 0 && <tfoot><tr><td colSpan={5}>Total · {rows.length} expenses</td><td className="num">{inr(total)}</td><td></td></tr></tfoot>}
          </table>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="pd-flex pd-no-print" style={{ marginTop: 14, gap: 8 }}>
          <span className="pd-muted" style={{ flex: 1, fontSize: 12.5 }}>Download the filtered expense register</span>
          <button className="pd-btn pd-btn-ghost" onClick={() => downloadRegister(rows, profile, period, now, "csv")}><IconDownload size={14} /> Excel</button>
          <button className="pd-btn pd-btn-ghost" onClick={() => downloadRegister(rows, profile, period, now, "pdf")}><IconPrint size={15} /> PDF</button>
        </div>
      )}

      {creating && <CreateExpense onClose={() => setCreating(false)} categories={expenseCategories} addExpense={addExpense} now={now} />}
    </div>
  );
}

// shared with the catalog so the register matches the Expense Transactions report
function downloadRegister(rows: Expense[], profile: any, period: any, now: number, kind: "csv" | "pdf") {
  const range = { from: period.from, to: period.to, label: period.label };
  const res = runReport("expense-transaction", { sales: [], purchases: [], inventory: [], expenses: rows, profile, now, range });
  if (kind === "csv") exportCatalogCsv("Expense Transactions", res, range, now);
  else exportCatalogPdf("Expense Transactions", res, profile, range, now);
}

function CreateExpense({ onClose, categories, addExpense, now }: { onClose: () => void; categories: string[]; addExpense: (e: Omit<Expense, "id" | "number">) => Promise<unknown>; now: number }) {
  const [date, setDate] = useState(ymd(now));
  const [party, setParty] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Miscellaneous");
  const [paymentMode, setPaymentMode] = useState<PayMode>("cash");
  const [amount, setAmount] = useState(0);
  const [gst, setGst] = useState(0);
  const [note, setNote] = useState("");
  const [custom, setCustom] = useState("");

  const save = async () => {
    if (amount <= 0 || !party.trim()) return;
    const [y, m, d] = date.split("-").map(Number);
    const err = await addExpense({ date: new Date(y, m - 1, d, 12).getTime(), party: party.trim(), category: custom.trim() || category, paymentMode, amount, gst, note: note.trim() || undefined });
    if (!err) onClose();
  };

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Create Expense</h3><button className="pd-icon-btn" onClick={onClose}><IconX size={16} /></button></div>
        <div className="pd-modal-body" style={{ display: "grid", gap: 13 }}>
          <div className="pd-grid-2">
            <div className="pd-field"><label>Date</label><input className="pd-input" type="date" value={date} max={ymd(now)} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="pd-field"><label>Paid to (party)</label><input className="pd-input" value={party} onChange={(e) => setParty(e.target.value)} placeholder="Landlord, staff, vendor…" /></div>
          </div>
          <div className="pd-grid-2">
            <div className="pd-field"><label>Category</label>
              <select className="pd-select" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <input className="pd-input" style={{ marginTop: 6 }} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or a new category" />
            </div>
            <div className="pd-field"><label>Payment mode</label>
              <select className="pd-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PayMode)}>{(["cash", "upi", "card", "cod"] as PayMode[]).map((m) => <option key={m} value={m}>{PAY_LABEL[m]}</option>)}</select>
            </div>
          </div>
          <div className="pd-grid-2">
            <div className="pd-field" data-field="amount"><label>Amount ₹ (incl. GST)</label><input className="pd-input" inputMode="numeric" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} placeholder="0" /></div>
            <div className="pd-field"><label>GST %</label>
              <select className="pd-select" value={gst} onChange={(e) => setGst(Number(e.target.value))}>{[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}</select>
            </div>
          </div>
          <div className="pd-field"><label>Note (optional)</label><input className="pd-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was this for?" /></div>
          {gst > 0 && amount > 0 && <p className="pd-muted" style={{ fontSize: 12 }}>Taxable {inr(amount / (1 + gst / 100))} · GST {inr(amount - amount / (1 + gst / 100))} (input credit)</p>}
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={amount <= 0 || !party.trim()} onClick={save}><IconPlus size={15} /> Save expense</button>
        </div>
      </div>
    </div>
  );
}
