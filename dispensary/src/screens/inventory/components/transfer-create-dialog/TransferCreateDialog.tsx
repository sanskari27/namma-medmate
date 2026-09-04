import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import { listStockBalances, type StockBalance } from '@/services/inventory';
import { listProducts, type Product } from '@/services/products';
import { createStockTransfer, type StockTransferDirection } from '@/services/stockTransfers';
import type { AssignedBranch } from '@/store';
import { FormEvent, useEffect, useId, useMemo, useState } from 'react';
import { TransferCreateFields } from './TransferCreateFields';
import {
  mapTransferDialogStatus,
  transferDialogStatusText,
  type TransferDialogStatus,
} from './TransferCreateDialog.utils';

export type TransferCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: AssignedBranch[];
  activeBranchId: string;
  onCreated: () => void;
  onCloseFocus?: () => void;
  prefillProductId?: string | null;
};

export function TransferCreateDialog({
  open,
  onOpenChange,
  branches,
  activeBranchId,
  onCreated,
  onCloseFocus,
  prefillProductId = null,
}: TransferCreateDialogProps) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const counterparts = useMemo(
    () => branches.filter((b) => b.id !== activeBranchId),
    [branches, activeBranchId],
  );
  const [direction, setDirection] = useState<StockTransferDirection>('PUSH');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [balanceKey, setBalanceKey] = useState('');
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [status, setStatus] = useState<TransferDialogStatus>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const pullPrefill = Boolean(prefillProductId);
    setDirection(pullPrefill ? 'PULL' : 'PUSH');
    setCounterpartyId(counterparts[0]?.id ?? '');
    setBalanceKey('');
    setProductId(prefillProductId ?? '');
    setBatchId('');
    setQuantity('');
    setBusy(false);
    setStatus('loading');
    void Promise.all([listStockBalances(), listProducts()])
      .then(([balanceItems, productItems]) => {
        setBalances(balanceItems);
        setProducts(productItems);
        if (prefillProductId) {
          setProductId(prefillProductId);
          setDirection('PULL');
        }
        setStatus(null);
        window.setTimeout(() => {
          document.getElementById(`${formId}-direction`)?.focus();
        }, 0);
      })
      .catch((error) => setStatus(mapTransferDialogStatus(error)));
    return undefined;
  }, [open, formId, counterparts, prefillProductId]);

  const selectedBalance = balances.find((b) => b.balanceId === balanceKey) ?? null;
  const selectedProduct = products.find((p) => p.id === productId) ?? null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!counterpartyId || !quantity.trim()) {
      setStatus('validation');
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setStatus('validation');
      return;
    }

    let lineProductId = '';
    let lineBatchId: string | null = null;
    if (direction === 'PUSH') {
      if (!selectedBalance) {
        setStatus(balances.length === 0 ? 'empty' : 'validation');
        return;
      }
      if (qty > selectedBalance.quantity) {
        setStatus('validation');
        return;
      }
      lineProductId = selectedBalance.productId;
      lineBatchId = selectedBalance.batchId;
    } else {
      if (!selectedProduct) {
        setStatus('validation');
        return;
      }
      if (selectedProduct.requiresBatchTracking && !batchId.trim()) {
        setStatus('validation');
        return;
      }
      lineProductId = selectedProduct.id;
      lineBatchId = batchId.trim() || null;
    }

    setBusy(true);
    setStatus('loading');
    try {
      await createStockTransfer({
        direction,
        counterpartyBranchId: counterpartyId,
        lines: [{ productId: lineProductId, batchId: lineBatchId, quantity: qty }],
        idempotencyKey: `ui-xfer-${crypto.randomUUID()}`,
      });
      setStatus('success');
      onCreated();
      onOpenChange(false);
    } catch (error) {
      setStatus(mapTransferDialogStatus(error));
    } finally {
      setBusy(false);
    }
  };

  const close = (next = false) => {
    onOpenChange(next);
    if (!next) {
      window.setTimeout(() => onCloseFocus?.(), 0);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          window.setTimeout(() => onCloseFocus?.(), 0);
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogTitle>Start outlet transfer</DialogTitle>
        <DialogDescription>
          Push from this till, or pull from another outlet. Receiving till still confirms goods in.
        </DialogDescription>
        <form id={formId} className="mt-3 grid gap-3" onSubmit={onSubmit}>
          <TransferCreateFields
            formId={formId}
            direction={direction}
            onDirectionChange={setDirection}
            counterparts={counterparts}
            counterpartyId={counterpartyId}
            onCounterpartyChange={setCounterpartyId}
            balances={balances}
            balanceKey={balanceKey}
            onBalanceKeyChange={setBalanceKey}
            products={products}
            productId={productId}
            onProductIdChange={setProductId}
            selectedProduct={selectedProduct}
            batchId={batchId}
            onBatchIdChange={setBatchId}
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
          {transferDialogStatusText(status) ? (
            <p id={statusId} role="status" className="text-sm text-muted">
              {transferDialogStatusText(status)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || counterparts.length === 0}>
              Start transfer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
