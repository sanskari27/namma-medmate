import { Button } from '@atoms';
import type { Product } from '@/services/products';
import type { PurchaseOrder, PurchaseOrderVersion } from '@/services/purchaseOrders';
import type { Supplier } from '@/services/suppliers';
import type { FormEvent } from 'react';
import { formatPaise, canEdit, type FormState } from '../../PurchasesScreen.utils';
import { PurchaseOrderHeaderFields } from '../purchase-order-header-fields';
import { PurchaseOrderLifecycle } from '../purchase-order-lifecycle';
import { PurchaseOrderLines } from '../purchase-order-lines';
import { PurchaseOrderVersions } from '../purchase-order-versions';

export type PurchaseOrderPanelProps = {
  formId: string;
  form: FormState;
  selected: PurchaseOrder | null;
  creating: boolean;
  busy: boolean;
  suppliers: Supplier[];
  products: Product[];
  versions: PurchaseOrderVersion[];
  leftVersion: number | null;
  rightVersion: number | null;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onLinesChange: (lines: FormState['lines']) => void;
  onLeftVersion: (version: number) => void;
  onRightVersion: (version: number) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
  onIssue: () => void;
  onClose: () => void;
  onCancelOrder: () => void;
};

export function PurchaseOrderPanel({
  formId,
  form,
  selected,
  creating,
  busy,
  suppliers,
  products,
  versions,
  leftVersion,
  rightVersion,
  onChange,
  onLinesChange,
  onLeftVersion,
  onRightVersion,
  onCancel,
  onSubmit,
  onIssue,
  onClose,
  onCancelOrder,
}: PurchaseOrderPanelProps) {
  if (!creating && !selected) {
    return (
      <section
        aria-label="Purchase order detail"
        className="flex h-full min-h-0 items-center border border-line bg-surface px-4 py-8 text-sm text-muted"
      >
        Select an indent, or start a new one for this outlet.
      </section>
    );
  }

  const readOnly = Boolean(selected && !canEdit(selected.status));

  return (
    <section
      aria-label="Purchase order detail"
      className="flex h-full min-h-0 flex-col border border-line bg-surface"
    >
      <form
        id={formId}
        noValidate
        className="flex h-full min-h-0 flex-1 flex-col"
        onSubmit={onSubmit}
      >
        <div className="panel-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {selected ? (
            <p className="font-mono text-sm text-ink">
              {selected.poNumber} · {formatPaise(selected.totalPaise)} · v{selected.version}
            </p>
          ) : (
            <p className="text-sm font-medium text-ink">New indent for this outlet</p>
          )}
          <PurchaseOrderHeaderFields
            formId={formId}
            form={form}
            suppliers={suppliers}
            lockedSupplier={!creating}
            readOnly={readOnly}
            onChange={onChange}
          />
          <PurchaseOrderLines
            formId={formId}
            lines={form.lines}
            products={products}
            readOnly={readOnly}
            onChange={onLinesChange}
          />
          {selected ? (
            <PurchaseOrderLifecycle
              status={selected.status}
              busy={busy}
              onIssue={onIssue}
              onClose={onClose}
              onCancel={onCancelOrder}
            />
          ) : null}
          {selected ? (
            <PurchaseOrderVersions
              formId={formId}
              versions={versions}
              left={leftVersion}
              right={rightVersion}
              onLeft={onLeftVersion}
              onRight={onRightVersion}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Back to list
          </Button>
          {readOnly ? null : (
            <Button type="submit" disabled={busy}>
              {creating ? 'Save indent' : 'Save revision'}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
