// Code 128B. Widths alternate bar, space, starting with a bar. Stop is 7 digits.
// ponytail: subset B only; add C if a numeric-only retail symbology is required.
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

function symbols(text: string): number[] {
  const values = [104];
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 126) throw new Error("Code 128B cannot encode " + ch);
    values.push(c - 32);
  }
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  values.push(sum % 103, 106);
  return values;
}

/** Bar/space modules, 1 = bar. No quiet zone. */
export function code128Bits(text: string): string {
  let bits = "";
  for (const v of symbols(text)) {
    let black = true;
    for (const w of PATTERNS[v]) {
      bits += (black ? "1" : "0").repeat(Number(w));
      black = !black;
    }
  }
  return bits;
}

export function barcodeSvg(text: string): string {
  const bits = "0".repeat(10) + code128Bits(text) + "0".repeat(10);
  const rects: string[] = [];
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === "0") { i++; continue; }
    const x = i;
    while (i < bits.length && bits[i] === "1") i++;
    rects.push(`<rect x="${x}" y="0" width="${i - x}" height="50"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bits.length} 50" width="100%" height="64" role="img" aria-label="Barcode ${text}">${rects.join("")}</svg>`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Opens the browser print dialog for `copies` identical labels. False when the popup is blocked. */
export function printBarcodeLabels(name: string, code: string, copies: number): boolean {
  const n = Math.max(1, Math.min(50, Math.floor(copies) || 1));
  const svg = barcodeSvg(code);
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return false;
  const label = `<section class="label"><p class="name">${esc(name)}</p>${svg}<p class="code">${esc(code)}</p></section>`;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(code)}</title><style>
    @page { margin: 8mm; }
    body { margin: 0; font-family: system-ui, sans-serif; color: #111; }
    .label { width: 58mm; padding: 3mm 2mm; text-align: center; break-after: page; }
    .name { margin: 0 0 2mm; font-size: 13px; font-weight: 700; }
    .code { margin: 1.5mm 0 0; font-family: ui-monospace, monospace; font-size: 12px; letter-spacing: .12em; }
    svg { width: 52mm; height: 18mm; }
  </style></head><body>${label.repeat(n)}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
