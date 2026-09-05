import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryStatusBanner } from '@/screens/inventory/components/inventory-status-banner';
import { PurchaseReturnWorkspace } from '@/screens/inventory/components/purchase-return-workspace';
import { ApiError } from '@/services/axios';
import type { PageStatus } from '@/screens/inventory/InventoryScreen.utils';
import type { GoodsReceiptDetail, GoodsReceiptSummary } from '@/services/goodsReceipts';
import type { PurchaseReturnDetail, PurchaseReturnSummary } from '@/services/purchaseReturns';

vi.mock('@/services/purchaseReturns', async () => {
  const axios = await import('@/services/axios');
  return {
    listPurchaseReturns: vi.fn(),
    getPurchaseReturn: vi.fn(),
    createPurchaseReturn: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/goodsReceipts', async () => {
  const axios = await import('@/services/axios');
  return {
    listBranchGoodsReceipts: vi.fn(),
    getGoodsReceipt: vi.fn(),
    submitQualityCheck: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { getGoodsReceipt, listBranchGoodsReceipts } from '@/services/goodsReceipts';
import {
  createPurchaseReturn,
  getPurchaseReturn,
  listPurchaseReturns,
} from '@/services/purchaseReturns';

const listReturnsMock = vi.mocked(listPurchaseReturns);
const getReturnMock = vi.mocked(getPurchaseReturn);
const createReturnMock = vi.mocked(createPurchaseReturn);
const listReceiptsMock = vi.mocked(listBranchGoodsReceipts);
const getReceiptMock = vi.mocked(getGoodsReceipt);

const summary: PurchaseReturnSummary = {
  id: 'pr1',
  debitNoteNumber: 'DN/2026-27/BR01/00001',
  origin: 'QC',
  status: 'CONFIRMED',
  supplierId: 's1',
  supplierLegalName: 'Acme Pharma Pvt Ltd',
  amountPaise: 400000,
  createdAt: '2026-09-05T04:30:00Z',
};

const detail: PurchaseReturnDetail = {
  id: 'pr1',
  debitNoteNumber: 'DN/2026-27/BR01/00001',
  origin: 'QC',
  status: 'CONFIRMED',
  supplierId: 's1',
  supplierLegalName: 'Acme Pharma Pvt Ltd',
  goodsReceiptId: 'grn1',
  amountPaise: 400000,
  createdAt: '2026-09-05T04:30:00Z',
  lines: [
    {
      id: 'prl1',
      goodsReceiptLineId: 'line1',
      productId: 'p1',
      productName: 'Paracetamol 500',
      sku: 'SKU-PARA',
      batchId: null,
      quantity: 40,
      unitRatePaise: 10000,
      amountPaise: 400000,
      stockMovementId: null,
    },
  ],
};

const checkedReceipt: GoodsReceiptSummary = {
  id: 'grn2',
  receiptNumber: 'GRN/2026-27/BR01/00002',
  receiptReference: 'CH-RET',
  status: 'CHECKED',
  supplierLegalName: 'Acme Pharma Pvt Ltd',
  createdAt: '2026-09-04T10:00:00Z',
  checkedAt: '2026-09-05T04:30:00Z',
};

const checkedDetail: GoodsReceiptDetail = {
  id: 'grn2',
  receiptNumber: 'GRN/2026-27/BR01/00002',
  receiptReference: 'CH-RET',
  status: 'CHECKED',
  supplierLegalName: 'Acme Pharma Pvt Ltd',
  createdAt: '2026-09-04T10:00:00Z',
  checkedAt: '2026-09-05T04:30:00Z',
  checkedByUserId: 'u1',
  visualInspectionPassed: true,
  checklist: {
    packagingIntact: true,
    labelMatches: true,
    batchReadable: true,
    noDamage: true,
  },
  purchaseReturnId: null,
  debitNoteNumber: null,
  lines: [
    {
      id: 'line2',
      purchaseOrderLineId: 'pol2',
      productId: 'p1',
      productName: 'Paracetamol 500',
      sku: 'SKU-PARA',
      quantity: 100,
      unitRatePaise: 10000,
      requiresBatchTracking: true,
      acceptedQuantity: 60,
      rejectedQuantity: 40,
      batchNumber: 'LOT-OK',
      manufacturedOn: '2026-01-15',
      expiresOn: '2027-12-31',
      stockMovementId: 'mv1',
    },
  ],
};

const manualReturn: PurchaseReturnDetail = {
  ...detail,
  id: 'pr2',
  debitNoteNumber: 'DN/2026-27/BR01/00002',
  origin: 'MANUAL',
  amountPaise: 100000,
  lines: [
    {
      ...detail.lines[0],
      id: 'prl2',
      goodsReceiptLineId: 'line2',
      quantity: 10,
      amountPaise: 100000,
      stockMovementId: 'mv-pr',
    },
  ],
};

function renderWorkspace(
  options: { createOpen?: boolean; allowed?: boolean; branch?: string | null } = {},
) {
  const { createOpen = false, allowed = true, branch = 'br1' } = options;
  function Page() {
    const ref = useRef<HTMLButtonElement | null>(null);
    const [status, setStatus] = useState<PageStatus>('loading');
    const [open, setOpen] = useState(createOpen);
    return (
      <div>
        <button ref={ref} type="button" onClick={() => setOpen(true)}>
          Send back
        </button>
        <InventoryStatusBanner
          status={status}
          statusId="return-status"
          asAlert={status === 'denied'}
          view="returns"
        />
        <PurchaseReturnWorkspace
          allowed={allowed}
          activeBranchId={branch}
          createOpen={open}
          onCreateOpenChange={setOpen}
          createButtonRef={ref}
          onStatusChange={setStatus}
        />
      </div>
    );
  }
  return render(<Page />);
}

describe('purchase return workspace', () => {
  beforeEach(() => {
    listReturnsMock.mockReset();
    getReturnMock.mockReset();
    createReturnMock.mockReset();
    listReceiptsMock.mockReset();
    getReceiptMock.mockReset();
    listReturnsMock.mockResolvedValue([]);
    listReceiptsMock.mockResolvedValue([]);
    vi.stubGlobal('crypto', { ...crypto, randomUUID: () => 'pr-key-1' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function floorUser() {
    return userEvent.setup({ delay: null });
  }

  it('loading: waits for debit notes', () => {
    listReturnsMock.mockReturnValue(new Promise(() => undefined));
    renderWorkspace();
    expect(screen.getByText('Loading debit notes for this outlet…')).toBeInTheDocument();
  });

  it('empty: no debit notes yet', async () => {
    renderWorkspace();
    expect(
      await screen.findByText(
        'No debit notes yet. Send a pack back, or reject qty at Quality check.',
      ),
    ).toBeInTheDocument();
  });

  it('validation: confirm return without a qty', async () => {
    const user = floorUser();
    listReceiptsMock.mockResolvedValue([checkedReceipt]);
    getReceiptMock.mockResolvedValue(checkedDetail);
    renderWorkspace({ createOpen: true });
    await screen.findByRole('dialog', { name: 'Send back to stockist' });
    await user.selectOptions(screen.getByLabelText('Checked delivery'), 'grn2');
    await screen.findByLabelText('Return qty for SKU-PARA');
    await user.click(screen.getByRole('button', { name: 'Confirm return' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a quantity to send back.');
    expect(createReturnMock).not.toHaveBeenCalled();
  });

  it('denied: till without purchases or accounts', async () => {
    listReturnsMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderWorkspace();
    expect(
      await screen.findByText(
        'This till cannot send packs back. Ask the owner for Purchases or Accounts.',
      ),
    ).toBeInTheDocument();
  });

  it('conflict: stockist balance changed', async () => {
    const user = floorUser();
    listReceiptsMock.mockResolvedValue([checkedReceipt]);
    getReceiptMock.mockResolvedValue(checkedDetail);
    createReturnMock.mockRejectedValue(new ApiError('Stale', 409, 'STALE_STATE'));
    renderWorkspace({ createOpen: true });
    await screen.findByRole('dialog', { name: 'Send back to stockist' });
    await user.selectOptions(screen.getByLabelText('Checked delivery'), 'grn2');
    await screen.findByLabelText('Return qty for SKU-PARA');
    await user.type(screen.getByLabelText('Return qty for SKU-PARA'), '10');
    await user.click(screen.getByRole('button', { name: 'Confirm return' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Stockist balance changed. Close and try again.',
    );
  });

  it('failure: no active outlet', async () => {
    renderWorkspace({ branch: null });
    expect(
      await screen.findByText(
        'Pick an outlet in the sidebar, or retry if the server could not be reached.',
      ),
    ).toBeInTheDocument();
  });

  it('success: lists debit note and opens detail', async () => {
    const user = floorUser();
    listReturnsMock.mockResolvedValue([summary]);
    getReturnMock.mockResolvedValue(detail);
    renderWorkspace();
    expect(await screen.findByText('DN/2026-27/BR01/00001')).toBeInTheDocument();
    expect(screen.getByText('From QC reject')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /DN\/2026-27\/BR01\/00001/ }));
    expect(await screen.findByLabelText('Debit note')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500')).toBeInTheDocument();
  });

  it('success: confirmed send-back writes a debit note', async () => {
    const user = floorUser();
    listReturnsMock.mockResolvedValueOnce([]).mockResolvedValue([
      {
        ...summary,
        id: 'pr2',
        debitNoteNumber: 'DN/2026-27/BR01/00002',
        origin: 'MANUAL',
        amountPaise: 100000,
      },
    ]);
    listReceiptsMock.mockResolvedValue([checkedReceipt]);
    getReceiptMock.mockResolvedValue(checkedDetail);
    createReturnMock.mockResolvedValue(manualReturn);
    renderWorkspace({ createOpen: true });
    await screen.findByRole('dialog', { name: 'Send back to stockist' });
    await user.selectOptions(screen.getByLabelText('Checked delivery'), 'grn2');
    await screen.findByLabelText('Return qty for SKU-PARA');
    await user.type(screen.getByLabelText('Return qty for SKU-PARA'), '10');
    await user.click(screen.getByRole('button', { name: 'Confirm return' }));
    await waitFor(() => expect(createReturnMock).toHaveBeenCalled());
    expect(
      await screen.findByText(
        'Debit note confirmed. Floor stock is down and the khata is updated.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('DN/2026-27/BR01/00002')).toBeInTheDocument();
  });

  it('restores focus to Send back after cancel', async () => {
    const user = floorUser();
    renderWorkspace({ createOpen: true });
    await screen.findByRole('dialog', { name: 'Send back to stockist' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Send back' })).toHaveFocus();
    });
  });
});
