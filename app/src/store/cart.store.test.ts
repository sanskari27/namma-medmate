import { useCartStore } from './cart.store';

const line = (productId: string, quantity: number, pharmacyId = 'hf') => ({
  productId,
  quantity,
  pharmacyId,
});

describe('cart store', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it('adds a line and counts the items', () => {
    useCartStore.getState().addLine(line('p1', 2));

    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().summary.itemCount).toBe(2);
  });

  it('merges a repeat of the same product at the same pharmacy', () => {
    useCartStore.getState().addLine(line('p1', 1));
    useCartStore.getState().addLine(line('p1', 2));

    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().summary.itemCount).toBe(3);
  });

  it('keeps the same product from two pharmacies apart', () => {
    useCartStore.getState().addLine(line('p1', 1, 'hf'));
    useCartStore.getState().addLine(line('p1', 1, 'ss'));

    expect(useCartStore.getState().lines).toHaveLength(2);
    expect(useCartStore.getState().summary.itemCount).toBe(2);
  });

  it('removes a line', () => {
    useCartStore.getState().addLine(line('p1', 1));
    useCartStore.getState().removeLine('p1', 'hf');

    expect(useCartStore.getState().lines).toHaveLength(0);
    expect(useCartStore.getState().summary.itemCount).toBe(0);
  });

  it('drops the line when the quantity reaches zero', () => {
    useCartStore.getState().addLine(line('p1', 2));
    useCartStore.getState().setQuantity('p1', 'hf', 0);

    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('updates the quantity of an existing line', () => {
    useCartStore.getState().addLine(line('p1', 1));
    useCartStore.getState().setQuantity('p1', 'hf', 5);

    expect(useCartStore.getState().summary.itemCount).toBe(5);
  });
});
