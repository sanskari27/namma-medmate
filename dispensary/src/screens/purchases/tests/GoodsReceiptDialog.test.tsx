import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoodsReceiptDialog } from '@/screens/purchases/components/goods-receipt-dialog';
import { ApiError } from '@/services/axios';
import type { GoodsReceipts } from '@/services/purchaseOrders';

vi.mock('@/services/purchaseOrders', async () => {
  const axios = await import('@/services/axios');
  return {
    listGoodsReceipts: vi.fn(),
    createGoodsReceipt: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { createGoodsReceipt, listGoodsReceipts } from '@/services/purchaseOrders';

const listMock = vi.mocked(listGoodsReceipts);
const createMock = vi.mocked(createGoodsReceipt);

const outstanding: GoodsReceipts = {
  purchaseOrderId: 'po1',
  poNumber: 'PO/2026-27/BR01/00001',
  status: 'ISSUED',
  supplierId: 's1',
  supplierLegalName: 'Acme Pharma Pvt Ltd',
  lines: [
    {
      purchaseOrderLineId: 'l1',
      productId: 'p1',
      productName: 'Crocin Advance',
      sku: 'CROCIN',
      orderedQuantity: 10,
      unitRatePaise: 10000,
      receivedQuantity: 0,
      remainingQuantity: 10,
    },
  ],
  receipts: [],
};

const recorded: GoodsReceipts = {
  ...outstanding,
  lines: [{ ...outstanding.lines[0], receivedQuantity: 10, remainingQuantity: 0 }],
  receipts: [
    {
      id: 'g1',
      receiptNumber: 'GRN/2026-27/BR01/00001',
      receiptReference: 'CH-1',
      status: 'PENDING_QC',
      createdAt: '2026-09-04T10:00:00Z',
      lines: [],
    },
    {
      id: 'g2',
      receiptNumber: 'GRN/2026-27/BR01/00002',
      receiptReference: 'CH-2',
      status: 'CHECKED',
      createdAt: '2026-09-05T04:00:00Z',
      lines: [],
    },
  ],
};

function renderDialog(onCloseFocus = vi.fn()) {
  return render(
    <div>
      <button type="button" data-testid="restore-target">
        Record delivery
      </button>
      <GoodsReceiptDialog
        open
        purchaseOrderId="po1"
        onOpenChange={vi.fn()}
        onRecorded={vi.fn()}
        onCloseFocus={onCloseFocus}
      />
    </div>,
  );
}

describe('goods receipt dialog', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
  });

  it('loading: waits for outstanding against this indent', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderDialog();
    expect(screen.getByText('Loading outstanding against this indent…')).toBeInTheDocument();
  });

  it('empty: no packs still pending', async () => {
    listMock.mockResolvedValue({
      ...outstanding,
      lines: [{ ...outstanding.lines[0], receivedQuantity: 10, remainingQuantity: 0 }],
    });
    renderDialog();
    expect(
      await screen.findByText('Nothing is still pending on this indent. All packs are in.'),
    ).toBeInTheDocument();
  });

  it('shows pending QC versus checked status on recorded deliveries', async () => {
    listMock.mockResolvedValue(recorded);
    renderDialog();
    expect(await screen.findByText(/CH-1/)).toBeInTheDocument();
    expect(screen.getByText('Pending pharmacist check')).toBeInTheDocument();
    expect(screen.getByText('Checked')).toBeInTheDocument();
  });

  it('validation: challan ref and a qty that fits remaining are required', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(outstanding);
    renderDialog();
    await screen.findByLabelText('Challan / invoice ref');
    await user.click(screen.getByRole('button', { name: 'Save delivery' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Enter a challan ref and a qty that does not exceed outstanding.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('blocks over-qty before submit', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(outstanding);
    renderDialog();
    await user.type(await screen.findByLabelText('Challan / invoice ref'), 'CH-1');
    const qty = screen.getByLabelText('This delivery');
    await user.clear(qty);
    await user.type(qty, '11');
    expect(screen.getByText('Qty is over remaining on this indent')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save delivery' }));
    expect(createMock).not.toHaveBeenCalled();
  });

  it('denied: till without purchases', async () => {
    listMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderDialog();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This till cannot record deliveries. Ask the owner to grant Purchases.',
    );
  });

  it('conflict: duplicate challan ref', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(outstanding);
    createMock.mockRejectedValue(
      new ApiError('This challan is already recorded.', 409, 'DUPLICATE_RECEIPT'),
    );
    renderDialog();
    await user.type(await screen.findByLabelText('Challan / invoice ref'), 'CH-DUP');
    const qty = screen.getByLabelText('This delivery');
    await user.clear(qty);
    await user.type(qty, '4');
    await user.click(screen.getByRole('button', { name: 'Save delivery' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This challan ref was already recorded on this outlet.',
    );
  });

  it('failure: network error on save', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(outstanding);
    createMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    renderDialog();
    await user.type(await screen.findByLabelText('Challan / invoice ref'), 'CH-1');
    const qty = screen.getByLabelText('This delivery');
    await user.clear(qty);
    await user.type(qty, '4');
    await user.click(screen.getByRole('button', { name: 'Save delivery' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not record the delivery. Try again.',
    );
  });

  it('success: records a partial delivery', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(outstanding);
    createMock.mockResolvedValue({
      id: 'grn1',
      receiptNumber: 'GRN/2026-27/BR01/00001',
      receiptReference: 'CH-4',
      status: 'PENDING_QC',
      createdAt: '2026-09-05T00:00:00Z',
      lines: [],
    });
    renderDialog();
    await user.type(await screen.findByLabelText('Challan / invoice ref'), 'CH-4');
    const qty = screen.getByLabelText('This delivery');
    await user.clear(qty);
    await user.type(qty, '4');
    expect(screen.getByText('6')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save delivery' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Delivery recorded. Packs stay pending QC — they are not on the shelf yet.',
    );
  });

  it('shows PRICE_MISMATCH from the server', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(outstanding);
    createMock.mockRejectedValue(
      new ApiError('Delivery rate must match the indent rate.', 422, 'PRICE_MISMATCH'),
    );
    renderDialog();
    await user.type(await screen.findByLabelText('Challan / invoice ref'), 'CH-1');
    const qty = screen.getByLabelText('This delivery');
    await user.clear(qty);
    await user.type(qty, '4');
    await user.click(screen.getByRole('button', { name: 'Save delivery' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Challan rate does not match the indent rate.',
    );
  });

  it('shows OVER_RECEIPT from the server', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(outstanding);
    createMock.mockRejectedValue(
      new ApiError('Received quantity exceeds outstanding on this indent.', 422, 'OVER_RECEIPT'),
    );
    renderDialog();
    await user.type(await screen.findByLabelText('Challan / invoice ref'), 'CH-1');
    const qty = screen.getByLabelText('This delivery');
    await user.clear(qty);
    await user.type(qty, '4');
    await user.click(screen.getByRole('button', { name: 'Save delivery' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Qty is over what remains on this indent. Raise the ordered qty first.',
    );
  });

  it('restores focus after the dialog closes', async () => {
    const user = userEvent.setup();
    const onCloseFocus = vi.fn();
    listMock.mockResolvedValue(outstanding);
    renderDialog(onCloseFocus);
    await screen.findByLabelText('Challan / invoice ref');
    await user.click(screen.getByRole('button', { name: 'Back to indent' }));
    expect(onCloseFocus).toHaveBeenCalled();
  });
});
