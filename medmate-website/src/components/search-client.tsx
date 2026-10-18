"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GetAppLink, Icon } from "./ui";

type Item = { n: string; c: string; b: string; k: string; u: string; r: number; i: string };

export function SearchClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => { fetch("/search-index.json").then((r) => r.json()).then(setItems).catch(() => setItems([])); }, []);
  useEffect(() => {
    const t = setTimeout(() => router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { scroll: false }), 300);
    return () => clearTimeout(t);
  }, [q, router]);

  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!items || term.length < 2) return [];
    const words = term.split(/\s+/);
    return items
      .map((x) => {
        const name = x.n.toLowerCase();
        const hay = `${name} ${x.c} ${x.b} ${x.k}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return null;
        return { x, score: name.startsWith(term) ? 0 : name.includes(term) ? 1 : 2 };
      })
      .filter((r) => r !== null)
      .sort((a, b) => a.score - b.score || a.x.n.localeCompare(b.x.n))
      .slice(0, 60)
      .map((r) => r.x);
  }, [items, term]);

  return (
    <div className="flex flex-col gap-6">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex max-w-[720px] items-center gap-2 rounded-2xl border-[1.5px] border-line-2 bg-surface p-2 focus-within:border-green focus-within:ring-[3px] focus-within:ring-mint-200">
        <Icon name="search" size={22} className="ml-2 text-muted" />
        <label htmlFor="q" className="sr-only">Search medicines</label>
        <input id="q" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Brand or salt, e.g. Paracetamol 650" className="h-11 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-faint" />
        {q && <button type="button" aria-label="Clear" onClick={() => setQ("")} className="flex size-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2"><Icon name="x" size={18} /></button>}
      </form>

      {items === null ? (
        <p className="text-muted">Loading…</p>
      ) : term.length < 2 ? (
        <p className="text-muted">Type at least two letters of a medicine, salt or brand.</p>
      ) : results.length === 0 ? (
        <div className="flex max-w-[720px] flex-col items-start gap-3 rounded-2xl bg-mint-50 p-6 ring-1 ring-mint-200">
          <p className="d-h3">No match for “{q}” on the website</p>
          <p className="text-ink-2">When MedMate launches, the app will search every pharmacy near you, and you will be able to upload a prescription to get quotes for anything on it.</p>
          <GetAppLink from="search-empty" to="/upload-rx">Join the waitlist</GetAppLink>
        </div>
      ) : (
        <>
          <p className="d-caption text-muted">{results.length}{results.length === 60 ? "+" : ""} results</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {results.map((x) => (
              <li key={x.u}>
                <Link href={x.u} className="lift flex items-center gap-4 rounded-2xl border border-line p-3">
                  <span className="art-bg flex size-16 shrink-0 items-center justify-center rounded-xl p-1.5">
                    {x.i ? <img src={x.i} alt="" loading="lazy" className="h-full w-full object-contain mix-blend-multiply" /> : <Icon name="pill" size={24} className="text-green-700" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2"><span className="truncate font-semibold">{x.n}</span>{x.r ? <span className="d-tag rounded-md bg-red-bg px-1.5 text-red">Rx</span> : null}</span>
                    <span className="d-caption truncate text-muted">{x.c || x.b}</span>
                    <span className="d-caption text-green-700">{x.k}</span>
                  </span>
                  <Icon name="chev-r" size={18} className="text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
