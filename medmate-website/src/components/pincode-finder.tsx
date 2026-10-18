"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "./ui";

type Props = { data: Record<string, { places: string[]; areas: [string, string][] }> };

/** Type a Bengaluru pincode to see its localities and the matching MedMate area pages. */
export function PincodeFinder({ data }: Props) {
  const [pin, setPin] = useState("");
  const hit = pin.length === 6 ? data[pin] : undefined;
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="pin" className="d-caption font-semibold text-mint-200">Check your pincode</label>
      <div className="flex max-w-[420px] items-center gap-2 rounded-2xl bg-surface p-2 shadow-sh3">
        <Icon name="pin" size={20} className="ml-2 text-muted" />
        <input id="pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="e.g. 560034" className="h-11 min-w-0 flex-1 bg-transparent text-[17px] tracking-wide text-ink outline-none placeholder:text-faint" />
      </div>
      <div aria-live="polite" className="min-h-6 max-w-[520px] text-[15px]">
        {pin.length === 6 && !hit && <p className="text-mint-200">We could not find {pin} in our Bengaluru list. Open the app and set your address to check.</p>}
        {hit && (
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
            <p className="font-semibold text-white">{pin}: {hit.places.slice(0, 6).join(", ")}</p>
            {hit.areas.length > 0 && (
              <p className="mt-2 flex flex-wrap gap-2">
                {hit.areas.map(([name, slug]) => <Link key={slug} href={`/bengaluru/${slug}`} className="d-caption rounded-full bg-gold px-3 py-1 font-bold text-forest">Medicine delivery in {name}</Link>)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
