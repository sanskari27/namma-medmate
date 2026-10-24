// Minimal client-side PDF generator for a bill — produces a real application/pdf
// Blob (single A4 page, Courier) so it can be attached/shared directly. No deps.
import { Sale, PharmacyProfile, computeInvoice, PAY_LABEL, Prescription } from "../data";

// assemble a single-page PDF from text-drawing ops
function onePagePdf(ops: string[]): Blob {
  const content = ops.join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += `${String(off).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

// ── prescription PDF (uploaded scan-as-PDF, or e-prescription) ──
export function buildRxPdf(rx: Prescription): Blob {
  let y = 800;
  const ops: string[] = [];
  const line = (text: string, size = 10, x = 40, dy = 15) => { ops.push(`BT /F1 ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`); y -= dy; };
  const rule = () => { ops.push(`40 ${y + 9} m 555 ${y + 9} l S`); y -= 6; };
  const when = new Date(rx.uploadedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const digital = rx.kind === "digital";

  line(rx.doctor, 16);
  line(`MBBS, MD (Gen. Med.)    Reg. ${rx.regNo ?? "KMC-44219"}`, 9);
  if (digital) line("NAMMA MEDMATE - DIGITAL PRESCRIPTION (verified, e-signed)", 9);
  rule();
  line(`Rx    ${rx.id}`, 13);
  line(`Patient: ${rx.patient}${rx.phone && rx.phone !== "—" ? "    " + rx.phone : ""}`, 9);
  line(`Date: ${when}`, 9);
  rule();
  line("Medicines:", 10);
  const meds = rx.meds && rx.meds.length
    ? rx.meds.map((m) => `- ${m.name}   ${m.dose}${m.days ? "   x " + m.days + " days" : ""}`)
    : (rx.note ? ["- " + rx.note] : ["- As advised"]);
  meds.forEach((m) => line(m, 9, 48, 16));
  rule();
  y -= 14;
  line(`Signature: ${rx.doctor.replace(/^Dr\.?\s*/i, "")}`, 11);
  line(digital ? `Digitally signed via Namma MedMate on ${when}` : "Signature & seal", 8);
  return onePagePdf(ops);
}

const esc = (s: string) => String(s).replace(/[\\()]/g, (m) => "\\" + m).replace(/[^\x20-\x7e]/g, "?");
const rs = (n: number) => "Rs " + Math.round(n).toLocaleString("en-IN");
const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s).replace(/…/g, ".").padEnd(n);
const padL = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s).padStart(n);

export function buildInvoicePdf(sale: Sale, profile: PharmacyProfile): Blob {
  const t = computeInvoice(sale.items, sale.discount);
  const d = new Date(sale.createdAt);
  const when = d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // ── compose text lines (Courier is monospaced → columns align) ──
  let y = 802;
  const ops: string[] = [];
  const line = (text: string, size = 10, x = 40, dy = 15) => { ops.push(`BT /F1 ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`); y -= dy; };
  const rule = () => { ops.push(`${40} ${y + 9} m ${555} ${y + 9} l S`); y -= 6; };

  line(profile.name, 16);
  line(profile.address, 9);
  line(`Ph: ${profile.phone}   ${profile.email}`, 9);
  line(`GSTIN: ${profile.gstin}    D.L.: ${profile.dlNo}`, 9);
  rule();
  line(`TAX INVOICE   ${sale.id}`, 12);
  line(`Date: ${when}    ${sale.channel === "online" ? "Online" : "Counter"} sale`, 9);
  line(`Billed to: ${sale.customer.name}${sale.ward ? " - " + sale.ward : ""}${sale.customer.phone ? "   " + sale.customer.phone : ""}`, 9);
  line(`Payment: ${sale.paid === false ? "PENDING - pay at reception" : PAY_LABEL[sale.payMode]}`, 9);
  if (sale.paid === false) line("** PAYMENT PENDING - COLLECT AT RECEPTION / BILLING COUNTER **", 9);
  rule();
  // table
  line(`${pad("#", 3)}${pad("Item", 30)}${padL("Qty", 5)}${padL("Rate", 11)}${padL("GST", 6)}${padL("Amount", 12)}`, 9);
  rule();
  sale.items.forEach((it, i) => {
    line(`${pad(String(i + 1), 3)}${pad(it.name, 30)}${padL(String(it.qty), 5)}${padL(rs(it.price), 11)}${padL(it.gst + "%", 6)}${padL(rs(it.price * it.qty), 12)}`, 9);
    if (it.batchNo && it.batchNo !== "-") line(`   Batch ${it.batchNo}  Exp ${it.expiry}  HSN ${it.hsn}`, 7.5, 40, 13);
  });
  rule();
  y -= 2;
  const sum = (label: string, val: string) => line(`${padL(label, 60)}${padL(val, 18)}`, 9.5, 40, 14);
  sum("Gross (incl. GST)", rs(t.gross));
  if (t.discount > 0) sum("Discount", "- " + rs(t.discount));
  sum("Taxable value", rs(t.taxable));
  sum("CGST + SGST", rs(t.totalTax));
  line(`${padL("AMOUNT PAYABLE", 60)}${padL(rs(t.payable), 18)}`, 12, 40, 20);
  rule();
  if (t.savings > 0) line(`You saved ${rs(t.savings)} on MRP.`, 8.5);
  line("Goods once sold are not returnable. Subject to local jurisdiction.", 8);
  y -= 10;
  line(`For ${profile.name}`, 9);
  line("Authorised signatory", 8.5);
  line(profile.pharmacist, 7.5);

  const content = ops.join("\n");

  // ── assemble PDF objects with byte-accurate xref ──
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += `${String(off).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

// ── paginated tabular report PDF (monospaced) ───────────────────
export function buildReportPdf(opts: {
  title: string; subtitle: string; generatedAt: string; profile: PharmacyProfile;
  headerLine: string; rowLines: string[]; totalsLine?: string;
}): Blob {
  const X = 36, TOP = 800, LH = 11, FONT = 8;
  const bodyPerPage = 60;
  const pages: string[][] = [];
  for (let i = 0; i < opts.rowLines.length; i += bodyPerPage) pages.push(opts.rowLines.slice(i, i + bodyPerPage));
  if (pages.length === 0) pages.push([]);

  const streams = pages.map((rows, pi) => {
    let y = TOP; const ops: string[] = [];
    const line = (t: string, size = FONT, dy = LH, x = X) => { ops.push(`BT /F1 ${size} Tf ${x} ${y} Td (${esc(t)}) Tj ET`); y -= dy; };
    const rule = () => { ops.push(`${X} ${y + 8} m 559 ${y + 8} l S`); y -= 5; };
    line(opts.profile.name, 13);
    line(opts.title, 10);
    line(opts.subtitle, 8);
    line(`GSTIN ${opts.profile.gstin}    Generated ${opts.generatedAt}`, 7);
    rule();
    line(opts.headerLine, 8);
    rule();
    rows.forEach((r) => line(r, 8, LH));
    if (pi === pages.length - 1 && opts.totalsLine) { rule(); line(opts.totalsLine, 9); }
    line(`Page ${pi + 1} of ${pages.length}`, 7, LH, X);
    return ops.join("\n");
  });

  const bodies: Record<number, string> = {};
  bodies[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  bodies[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";
  const pageNums: number[] = [];
  let n = 3;
  streams.forEach((s) => {
    const cNum = ++n; bodies[cNum] = `<< /Length ${s.length} >>\nstream\n${s}\nendstream`;
    const pNum = ++n; pageNums.push(pNum);
    bodies[pNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${cNum} 0 R >>`;
  });
  bodies[2] = `<< /Type /Pages /Kids [${pageNums.map((x) => x + " 0 R").join(" ")}] /Count ${pageNums.length} >>`;

  let pdf = "%PDF-1.4\n"; const offsets: number[] = [];
  for (let i = 1; i <= n; i++) { offsets[i] = pdf.length; pdf += `${i} 0 obj\n${bodies[i]}\nendobj\n`; }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${n + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= n; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${n + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
