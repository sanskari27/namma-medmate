import Link from "next/link";
import { inr, productHref, type Pack, type Product } from "@/lib/catalogue";
import { Badge } from "./ui";

const cv = (c: string) => `var(--color-${c})`;
/** Drawn pack with the name on the label, for products without a photo (same as the app). */
export function PackArt({ pack, scale = 1 }: { pack: Pack; scale?: number }) {
  const col = cv(pack.color);
  let art;
  if (pack.kind === "bottle")
    art = (
      <div className="flex flex-col items-center">
        <div className="h-[10px] w-6 rounded-[3px]" style={{ background: col }} />
        <div className="flex h-[54px] w-12 items-center rounded-lg border border-line-2 bg-surface p-1">
          <div className="d-tag w-full truncate rounded-[3px] px-0.5 text-center text-white" style={{ background: col }}>{pack.label}</div>
        </div>
      </div>
    );
  else if (pack.kind === "device")
    art = (
      <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg bg-forest">
        <span className="text-sm font-extrabold text-mint">{pack.label}</span>
        <span className="d-tag text-mint-300">Digital</span>
      </div>
    );
  else
    art = (
      <div className="flex flex-col items-center gap-1">
        <div className="h-9 w-20 overflow-hidden rounded-[5px] border border-line-2 bg-surface">
          <div className="h-2" style={{ background: col }} />
          <div className="d-tag truncate px-[5px] pt-0.5 text-ink">{pack.label}</div>
        </div>
        <div className="flex gap-[3px] rounded-md border border-line-2 bg-surface px-[5px] py-[3px]">
          {[0, 1, 2, 3, 4].map((i) => <span key={i} className="size-2 rounded-full" style={{ background: col }} />)}
        </div>
      </div>
    );
  return <div style={{ transform: `scale(${scale})` }}>{art}</div>;
}

export function ProductArt({ p, scale = 1, className = "", eager }: { p: Product; scale?: number; className?: string; eager?: boolean }) {
  if (p.img) return <img src={p.img} alt={`${p.name} pack`} loading={eager ? "eager" : "lazy"} className={`object-contain mix-blend-multiply ${className}`} />;
  return <PackArt pack={p.pack ?? { label: p.name.split(" ")[0], color: "green" }} scale={scale} />;
}

export function ProductCard({ p, className = "" }: { p: Product; className?: string }) {
  return (
    <Link href={productHref(p)} className={`lift group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface ${className}`}>
      <div className="art-bg relative flex h-36 items-center justify-center p-4 sm:h-40">
        <ProductArt p={p} scale={1.3} className="h-full w-full" />
        {p.rx && <span className="absolute left-2.5 top-2.5"><Badge tone="red">Rx</Badge></span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-5 group-hover:text-green-700">{p.name}</h3>
        <p className="d-caption line-clamp-1 text-muted">{p.comp || p.form}</p>
        <p className="mt-auto pt-2 text-[13px] text-ink-2">MRP <span className="font-bold text-ink">{inr(p.mrp)}</span></p>
        {!p.rx && <p className="d-tag mt-1.5 w-fit rounded-md bg-mint-100 px-1.5 py-0.5 text-green-700 sm:hidden">Compare pharmacies at launch</p>}
      </div>
    </Link>
  );
}

