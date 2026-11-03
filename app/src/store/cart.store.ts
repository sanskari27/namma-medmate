import { create } from 'zustand';

import type { CartLine, CartSummary } from '@/types';

interface CartState {
  lines: CartLine[];
  summary: CartSummary;

  addLine: (line: CartLine) => void;
  removeLine: (productId: string, pharmacyId: string) => void;
  setQuantity: (productId: string, pharmacyId: string, quantity: number) => void;
  clear: () => void;
}

const emptySummary: CartSummary = {
  lines: [],
  itemCount: 0,
  mrpTotal: 0,
  payableTotal: 0,
  savings: 0,
};

/**
 * Cart contents.
 *
 * Totals are derived from the lines here; pricing per product arrives with
 * the catalog service once the backend is live.
 */
export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  summary: emptySummary,

  addLine(line) {
    const lines = [...get().lines];
    const index = lines.findIndex(
      (existing) =>
        existing.productId === line.productId && existing.pharmacyId === line.pharmacyId,
    );

    if (index >= 0) {
      const existing = lines[index];
      if (existing)
        lines[index] = { ...existing, quantity: existing.quantity + line.quantity };
    } else {
      lines.push(line);
    }

    set({ lines, summary: deriveSummary(lines) });
  },

  removeLine(productId, pharmacyId) {
    const lines = get().lines.filter(
      (line) => !(line.productId === productId && line.pharmacyId === pharmacyId),
    );
    set({ lines, summary: deriveSummary(lines) });
  },

  setQuantity(productId, pharmacyId, quantity) {
    const lines =
      quantity <= 0
        ? get().lines.filter(
            (line) => !(line.productId === productId && line.pharmacyId === pharmacyId),
          )
        : get().lines.map((line) =>
            line.productId === productId && line.pharmacyId === pharmacyId
              ? { ...line, quantity }
              : line,
          );
    set({ lines, summary: deriveSummary(lines) });
  },

  clear() {
    set({ lines: [], summary: emptySummary });
  },
}));

function deriveSummary(lines: CartLine[]): CartSummary {
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  return {
    lines,
    itemCount,
    mrpTotal: 0,
    payableTotal: 0,
    savings: 0,
  };
}
