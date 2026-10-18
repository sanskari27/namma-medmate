"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./ui";

type Props = { data: Record<string, { area: string; slug: string } | null>; shareUrl: string };
type Signup = { pincode?: string; lang?: string };

/** After a waitlist sign-up: the area status for the pincode entered, and a one-tap WhatsApp share. */
export function ThanksStatus({ data, shareUrl }: Props) {
  const [s, setS] = useState<Signup>({});
  useEffect(() => { try { setS(JSON.parse(sessionStorage.getItem("mm-signup") ?? "{}")); } catch { /* ignore */ } }, []);
  const pin = s.pincode ?? "";
  const hit = pin.length === 6 ? data[pin] : undefined;
  const msg = `MedMate is launching soon in Bengaluru: medicines from licensed pharmacies near you, prices compared, rider tracked. Join the waitlist and get MedMate Premium free for 3 months from launch day: ${shareUrl}`;
  return (
    <div className="flex w-full max-w-[520px] flex-col gap-3">
      {pin.length === 6 && (
        <p className="flex items-start gap-2 rounded-2xl bg-mint-50 p-4 text-left text-[15px] leading-6 text-ink-2 ring-1 ring-mint-200">
          <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-green-700" />
          <span>
            {hit ? <>Pincode <strong className="text-ink">{pin}</strong> is on our launch list: <Link href={`/bengaluru/${hit.slug}`} className="font-semibold text-green-700 underline underline-offset-2">{hit.area}</Link>. You will hear from us the day pharmacies there go live.</>
              : <>Pincode <strong className="text-ink">{pin}</strong> is not on our first Bengaluru list yet. We have noted it and will message you when we reach your area.</>}
          </span>
        </p>
      )}
      <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener" className="press d-btn inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-white">
        <Icon name="chat" size={18} />Tell a neighbour on WhatsApp
      </a>
      <p className="d-caption text-muted">Launches happen area by area. The more neighbours on the list, the sooner yours opens.</p>
    </div>
  );
}
