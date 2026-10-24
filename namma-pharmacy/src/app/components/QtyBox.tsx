"use client";
import { useState, useEffect } from "react";

// Editable quantity stepper: −  [typeable number]  +  ×(remove).
// Top-level component so it never remounts mid-edit (keeps input focus).
// Local text buffer lets the field be cleared / retyped without the row vanishing.
export default function QtyBox({ qty, min = 1, max, onDec, onInc, onSet, onRemove }: {
  qty: number; min?: number; max?: number;
  onDec: () => void; onInc: () => void; onSet: (n: number) => void; onRemove?: () => void;
}) {
  const [txt, setTxt] = useState(String(qty));
  useEffect(() => { setTxt(String(qty)); }, [qty]);
  const cap = (n: number) => (max != null ? Math.min(max, n) : n);
  const atMax = max != null && qty >= max;
  return (
    <div className="pd-qty">
      <button type="button" onClick={onDec} aria-label="decrease">−</button>
      <input
        className="pd-qtyinput" type="text" inputMode="numeric" value={txt} aria-label="quantity"
        onFocus={(e) => e.target.select()}
        onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setTxt(v); const n = Number(v); if (v !== "" && n >= min) onSet(cap(n)); }}
        onBlur={() => { const n = Math.floor(Number(txt)); if (txt.trim() === "" || isNaN(n) || n < min) setTxt(String(qty)); else { const c = cap(n); onSet(c); setTxt(String(c)); } }}
      />
      <button type="button" onClick={onInc} disabled={atMax} aria-label="increase">+</button>
      {onRemove && <button type="button" className="pd-qty-x" onClick={onRemove} aria-label="remove item" title="Remove item">×</button>}
    </div>
  );
}
