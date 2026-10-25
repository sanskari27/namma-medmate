export type SaveFault = { message: string; field?: string };

const FIELDS: [RegExp, string][] = [
  [/gstin/i, "gstin"],
  [/ifsc/i, "ifsc"],
  [/mobile|phone/i, "phone"],
  [/otp|\d-digit code|code was not accepted|request a new code/i, "otp"],
  [/e-?mail/i, "email"],
  [/amount|must be positive/i, "amount"],
  [/rack/i, "rack"],
  [/stock|nothing to bill|nothing to issue|nothing to return|out of stock/i, "qty"],
  [/doctor/i, "doctor"],
  [/ward/i, "ward"],
  [/invoice/i, "invoiceNo"],
  [/\bname\b/i, "name"],
];

export function fieldFrom(message: string): string | undefined {
  for (const [re, field] of FIELDS) if (re.test(message)) return field;
  return undefined;
}

export function faultOf(err: unknown, fallback = "Save failed"): SaveFault {
  let message = err instanceof Error && err.message ? err.message : fallback;
  if (message === "Failed to fetch") message = "Could not reach the server. Check your connection.";
  const given = err && typeof err === "object" && "field" in err ? (err as { field?: unknown }).field : undefined;
  const field = typeof given === "string" && given ? given : fieldFrom(message);
  return field ? { message, field } : { message };
}
