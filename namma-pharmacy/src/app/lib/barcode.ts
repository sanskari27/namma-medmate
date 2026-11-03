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

export function barcodeSvg(text: string, portrait = false): string {
  const bits = "0".repeat(10) + code128Bits(text) + "0".repeat(10);
  const rects: string[] = [];
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === "0") { i++; continue; }
    const start = i;
    while (i < bits.length && bits[i] === "1") i++;
    rects.push(portrait
      ? `<rect x="0" y="${start}" width="50" height="${i - start}"/>`
      : `<rect x="${start}" y="0" width="${i - start}" height="50"/>`);
  }
  const box = portrait ? `0 0 50 ${bits.length}` : `0 0 ${bits.length} 50`;
  const size = portrait ? `width="12mm" height="22mm"` : `width="100%" height="64"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" ${size} role="img" aria-label="Barcode ${text}">${rects.join("")}</svg>`;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

/** One 50×25 mm label per copy. The symbol is portrait so it fits the roll height. */
export function barcodeLabelDocument(name: string, code: string, copies: number): string {
  const n = Math.min(200, Math.max(1, Math.floor(Number(copies)) || 1));
  const label = `<section class="label"><div class="meta"><p class="name">${esc(name)}</p><p class="code">${esc(code)}</p></div>${barcodeSvg(code, true)}</section>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(code)}</title><style>
@page{size:50mm 25mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#000}
.label{width:50mm;height:25mm;padding:1.5mm 1.5mm 1.5mm 2mm;display:flex;align-items:center;gap:1.5mm;overflow:hidden;break-after:page;page-break-after:always}
.label:last-child{break-after:auto;page-break-after:auto}
.meta{flex:1;min-width:0}
.name{margin:0;font:700 8pt/1.15 system-ui,sans-serif;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.code{margin:.6mm 0 0;font:600 7pt/1 ui-monospace,monospace;letter-spacing:.06em}
svg{display:block;flex:none;shape-rendering:crispEdges}
svg rect{fill:#000}
</style></head><body>${label.repeat(n)}</body></html>`;
}

export function printBarcodeLabels(name: string, code: string, copies: number) {
  document.querySelectorAll("iframe[data-barcode-print]").forEach((el) => el.remove());
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.dataset.barcodePrint = "";
  // ponytail: kept until afterprint so the system dialog still has a document; the next print drops a leftover frame
  frame.style.cssText = "position:fixed;left:-60mm;top:0;width:50mm;height:25mm;border:0";
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) { frame.remove(); return; }
  win.document.open();
  win.document.write(barcodeLabelDocument(name, code, copies));
  win.document.close();
  win.addEventListener("afterprint", () => frame.remove(), { once: true });
  requestAnimationFrame(() => { win.focus(); win.print(); });
}
