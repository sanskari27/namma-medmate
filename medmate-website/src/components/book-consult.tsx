"use client";

import { useState, type FormEvent } from "react";
import { PHARMACY_URL } from "@/lib/site";

export function BookConsult() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const field = "h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-surface px-3.5 text-[16px] text-ink outline-none placeholder:text-faint focus:border-green focus:ring-[3px] focus:ring-mint-200";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const companyWebsite = String(data.get("company-website") ?? "");
    if (companyWebsite.trim()) { setDone(true); return; }
    setPending(true);
    setError("");
    try {
      const res = await fetch(`${PHARMACY_URL}/api/v1/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? "").trim(),
          phone: String(data.get("phone") ?? "").trim(),
          area: String(data.get("area") ?? "").trim(),
          note: String(data.get("note") ?? "").trim(),
          companyWebsite,
        }),
      });
      if (!res.ok) throw new Error("book");
      setDone(true);
    } catch {
      setPending(false);
      setError("We could not save that. Check the number and try again.");
    }
  }

  if (done) return <p className="d-lead text-ink-2">Saved. We will call this number about a consultation.</p>;

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <p className="hidden"><label>Leave this empty <input name="company-website" tabIndex={-1} autoComplete="off" /></label></p>
      <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Name</span><input name="name" required minLength={2} autoComplete="name" className={field} /></label>
      <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Mobile number</span><input name="phone" required type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} title="10-digit Indian mobile number" placeholder="98450 12345" autoComplete="tel-national" className={field} /></label>
      <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Area in Bengaluru</span><input name="area" autoComplete="address-level2" placeholder="HSR Layout" className={field} /></label>
      <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Note</span><textarea name="note" rows={3} maxLength={400} className={`${field} h-auto py-3`} /></label>
      <p className="text-[14px] text-ink-2">We use this number only to call you about a consultation.</p>
      {error && <p className="text-[14px] text-red">{error}</p>}
      <button type="submit" disabled={pending} className="press d-btn inline-flex h-12 w-fit items-center justify-center rounded-xl bg-green px-5 text-white hover:bg-green-700 disabled:opacity-60 max-sm:w-full">{pending ? "Saving…" : "Book a consultation"}</button>
    </form>
  );
}
