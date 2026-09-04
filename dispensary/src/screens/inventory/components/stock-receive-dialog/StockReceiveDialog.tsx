import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import { isApiError, receiveStock } from '@/services/inventory';
import { listProducts, type Product } from '@/services/products';
import { FormEvent, useEffect, useId, useState } from 'react';

export type StockReceiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceived: () => void;
  onCloseFocus?: () => void;
};

type DialogStatus = 'loading' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

function mapStatus(error: unknown): DialogStatus {
  if (!isApiError(error)) {
    return 'failure';
  }
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (
    error.status === 409 ||
    error.code === 'BATCH_IDENTITY_CONFLICT' ||
    error.code === 'IDEMPOTENCY_CONFLICT' ||
    error.code === 'STALE_STATE'
  ) {
    return 'conflict';
  }
  if (error.status === 400 || error.code === 'VALIDATION_ERROR') {
    return 'validation';
  }
  return 'failure';
}

function statusText(status: DialogStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Receiving stock on this outlet…';
    case 'validation':
      return 'Enter a valid quantity. Batch products need lot number, expiry, and purchase price.';
    case 'denied':
      return 'This till cannot receive stock.';
    case 'conflict':
      return 'Batch identity or version conflict. Check the lot and try again.';
    case 'failure':
      return 'Could not receive stock. Try again.';
    case 'success':
      return 'Stock received.';
    default:
      return null;
  }
}

export function StockReceiveDialog({
  open,
  onOpenChange,
  onReceived,
  onCloseFocus,
}: StockReceiveDialogProps) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturedOn, setManufacturedOn] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [quantity, setQuantity] = useState('');
  const [status, setStatus] = useState<DialogStatus>(null);
  const [busy, setBusy] = useState(false);

  const selected = products.find((p) => p.id === productId) ?? null;
  const needsBatch = selected?.requiresBatchTracking ?? false;

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setProductId('');
    setBatchNumber('');
    setManufacturedOn('');
    setExpiresOn('');
    setPriceRupees('');
    setQuantity('');
    setBusy(false);
    setStatus('loading');
    void listProducts()
      .then((items) => {
        setProducts(items);
        setStatus(null);
        window.setTimeout(() => {
          document.getElementById(`${formId}-product`)?.focus();
        }, 0);
      })
      .catch((error) => {
        setStatus(mapStatus(error));
      });
    return undefined;
  }, [open, formId]);

  function restoreFocus() {
    onCloseFocus?.();
  }

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    const qty = Number(quantity);
    if (!productId || !Number.isFinite(qty) || qty <= 0) {
      setStatus('validation');
      return;
    }
    if (needsBatch) {
      if (!batchNumber.trim() || !expiresOn || !priceRupees.trim()) {
        setStatus('validation');
        return;
      }
    }
    const pricePaise = priceRupees.trim() ? Math.round(Number(priceRupees) * 100) : null;
    if (needsBatch && (pricePaise == null || !Number.isFinite(pricePaise) || pricePaise < 0)) {
      setStatus('validation');
      return;
    }

    setBusy(true);
    setStatus('loading');
    try {
      await receiveStock({
        productId,
        batchNumber: needsBatch ? batchNumber.trim() : null,
        manufacturedOn: manufacturedOn || null,
        expiresOn: needsBatch ? expiresOn : null,
        purchasePricePaise: needsBatch ? pricePaise : null,
        quantity: qty,
        idempotencyKey: crypto.randomUUID(),
        expectedVersion: null,
      });
      setStatus('success');
      onReceived();
      onOpenChange(false);
      restoreFocus();
    } catch (error) {
      setStatus(mapStatus(error));
    } finally {
      setBusy(false);
    }
  }

  const message = statusText(status);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          restoreFocus();
        }
      }}
    >
      <DialogContent className="max-w-md gap-4 border-line bg-surface p-5">
        <div>
          <DialogTitle className="font-sans text-base font-semibold text-ink">
            Receive stock
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted">
            Opens or tops up a batch on the active outlet. Purchase price is kept in paise.
          </DialogDescription>
        </div>
        <form id={formId} className="grid gap-3" onSubmit={(e) => void onConfirm(e)}>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-product`}>Product</Label>
            <select
              id={`${formId}-product`}
              className="border border-line bg-canvas px-2 py-1.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={busy}
            >
              <option value="">Select SKU</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>
          {needsBatch ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-batch`}>Batch number</Label>
                <Input
                  id={`${formId}-batch`}
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  disabled={busy}
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor={`${formId}-mfg`}>Manufacture date</Label>
                  <Input
                    id={`${formId}-mfg`}
                    type="date"
                    value={manufacturedOn}
                    onChange={(e) => setManufacturedOn(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${formId}-exp`}>Expiry date</Label>
                  <Input
                    id={`${formId}-exp`}
                    type="date"
                    value={expiresOn}
                    onChange={(e) => setExpiresOn(e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-price`}>Purchase price (₹)</Label>
                <Input
                  id={`${formId}-price`}
                  inputMode="decimal"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  disabled={busy}
                  className="font-mono"
                />
              </div>
            </>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-qty`}>Quantity</Label>
            <Input
              id={`${formId}-qty`}
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={busy}
              className="font-mono"
            />
          </div>
          {message ? (
            <p id={statusId} role="status" className="text-sm text-muted">
              {message}
            </p>
          ) : (
            <div className="min-h-[1.25rem]" aria-hidden />
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                onOpenChange(false);
                restoreFocus();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || products.length === 0}>
              Receive
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
