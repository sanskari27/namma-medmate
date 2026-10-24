/** API and database money is integer paise. Screen math stays in rupees. */

const MONEY_KEYS = new Set([
  "mrp", "ptr", "price", "amount", "discount", "onlinePrice", "purchasePrice",
  "total", "taxable", "salary", "creditLimit", "approvedAmount", "outstanding",
  "spent", "avgOrder", "given", "repaid", "payable", "reward", "fee", "paid",
]);

function isMoney(key: string, obj: Record<string, unknown>): boolean {
  if (MONEY_KEYS.has(key)) return true;
  if (key !== "value" || typeof obj.value !== "number") return false;
  if (obj.type === "flat" || obj.mode === "flat") return true;
  return "points" in obj && "custKey" in obj;
}

function convert(node: unknown, toPaise: boolean): unknown {
  if (Array.isArray(node)) return node.map((item) => convert(item, toPaise));
  if (!node || typeof node !== "object") return node;
  const src = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(src)) {
    if (typeof value === "number" && isMoney(key, src)) {
      out[key] = toPaise ? Math.round(value * 100) : value / 100;
    } else {
      out[key] = convert(value, toPaise);
    }
  }
  return out;
}

export function toPaise<T>(node: T): T {
  return convert(node, true) as T;
}

export function fromPaise<T>(node: T): T {
  return convert(node, false) as T;
}

type ReportLike = { columns: { money?: boolean }[]; rows: (string | number)[][]; totals?: (string | number)[] };

export function reportToPaise<T extends ReportLike>(report: T): T {
  const cell = (row: (string | number)[]) => row.map((value, i) =>
    report.columns[i]?.money && typeof value === "number" ? Math.round(value * 100) : value);
  return { ...report, rows: report.rows.map(cell), totals: report.totals ? cell(report.totals) : report.totals };
}
