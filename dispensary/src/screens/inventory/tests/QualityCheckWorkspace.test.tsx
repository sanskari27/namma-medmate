import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryStatusBanner } from '@/screens/inventory/components/inventory-status-banner';
import { QualityCheckWorkspace } from '@/screens/inventory/components/quality-check-workspace';
import { ApiError } from '@/services/axios';
import type { PageStatus } from '@/screens/inventory/InventoryScreen.utils';
import type { GoodsReceiptDetail, GoodsReceiptSummary } from '@/services/goodsReceipts';

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

import {
  getGoodsReceipt,
  listBranchGoodsReceipts,
  submitQualityCheck,
} from '@/services/goodsReceipts';

const listGoodsReceiptsMock = vi.mocked(listBranchGoodsReceipts);
const getGoodsReceiptMock = vi.mocked(getGoodsReceipt);
const submitQualityCheckMock = vi.mocked(submitQualityCheck);

const pending: GoodsReceiptSummary = {
  id: 'grn1',
  receiptNumber: 'GRN/2026-27/BR01/00001',
  receiptReference: 'CH-OK',
  status: 'PENDING_QC',
  supplierLegalName: 'Acme Pharma Pvt Ltd',
  createdAt: '2026-09-04T10:00:00Z',
  checkedAt: null,
};

const detail: GoodsReceiptDetail = {
  id: 'grn1',
  receiptNumber: 'GRN/2026-27/BR01/00001',
  receiptReference: 'CH-OK',
  status: 'PENDING_QC',
  supplierLegalName: 'Acme Pharma Pvt Ltd',
  createdAt: '2026-09-04T10:00:00Z',
  checkedAt: null,
  checkedByUserId: null,
  visualInspectionPassed: null,
  checklist: null,
  purchaseReturnId: null,
  debitNoteNumber: null,
  lines: [
    {
      id: 'line1',
      purchaseOrderLineId: 'pol1',
      productId: 'p1',
      productName: 'Paracetamol 500',
      sku: 'SKU-PARA',
      quantity: 10,
      unitRatePaise: 10000,
      requiresBatchTracking: true,
      acceptedQuantity: null,
      rejectedQuantity: null,
      batchNumber: null,
      manufacturedOn: null,
      expiresOn: null,
      stockMovementId: null,
    },
  ],
};

const checked: GoodsReceiptDetail = {
  ...detail,
  status: 'CHECKED',
  checkedAt: '2026-09-05T04:30:00Z',
  checkedByUserId: 'u1',
  visualInspectionPassed: true,
  purchaseReturnId: 'pr1',
  debitNoteNumber: 'DN/2026-27/BR01/00001',
  checklist: {
    packagingIntact: true,
    labelMatches: true,
    batchReadable: true,
    noDamage: true,
  },
  lines: [
    {
      ...detail.lines[0],
      acceptedQuantity: 6,
      rejectedQuantity: 4,
      batchNumber: 'LOT-QC',
      manufacturedOn: '2026-01-15',
      expiresOn: '2027-12-31',
      stockMovementId: 'mv1',
    },
  ],
};

function renderWorkspace(activeBranchId: string | null = 'br1') {
  function Page() {
    const [status, setStatus] = useState<PageStatus>('loading');
    return (
      <div>
        <InventoryStatusBanner
          status={status}
          statusId="qc-status"
          asAlert={status === 'denied'}
          view="qc"
        />
        <QualityCheckWorkspace allowed activeBranchId={activeBranchId} onStatusChange={setStatus} />
      </div>
    );
  }
  return render(<Page />);
}

async function fillHappyPath(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('button', { name: /GRN\/2026-27\/BR01\/00001/ });
  await user.click(screen.getByRole('button', { name: /GRN\/2026-27\/BR01\/00001/ }));
  await screen.findByLabelText('Accepted qty');
  await user.click(screen.getByLabelText('Visual inspection passed'));
  await user.click(screen.getByLabelText('Packaging intact'));
  await user.click(screen.getByLabelText('Label matches the indent'));
  await user.click(screen.getByLabelText('Batch number is readable'));
  await user.click(screen.getByLabelText('No damage or contamination'));
  await user.type(screen.getByLabelText('Accepted qty'), '6');
  await user.type(screen.getByLabelText('Rejected qty'), '4');
  await user.type(screen.getByLabelText('Batch number'), 'LOT-QC');
  await user.type(screen.getByLabelText('Manufactured on'), '2026-01-15');
  await user.type(screen.getByLabelText('Expires on'), '2027-12-31');
}

describe('quality check workspace', () => {
  beforeEach(() => {
    listGoodsReceiptsMock.mockReset();
    getGoodsReceiptMock.mockReset();
    submitQualityCheckMock.mockReset();
    listGoodsReceiptsMock.mockResolvedValue([]);
    vi.stubGlobal('crypto', { ...crypto, randomUUID: () => 'qc-key-1' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function qcUser() {
    return userEvent.setup({ delay: null });
  }

  it('loading: waits for deliveries pending a pharmacist check', () => {
    listGoodsReceiptsMock.mockReturnValue(new Promise(() => undefined));
    renderWorkspace();
    expect(
      screen.getByText('Loading deliveries waiting for a pharmacist check…'),
    ).toBeInTheDocument();
  });

  it('empty: no deliveries waiting', async () => {
    renderWorkspace();
    expect(
      await screen.findByText('No deliveries waiting for a pharmacist check.'),
    ).toBeInTheDocument();
  });

  it('validation: accepted plus rejected must match received qty', async () => {
    const user = qcUser();
    listGoodsReceiptsMock.mockResolvedValue([pending]);
    getGoodsReceiptMock.mockResolvedValue(detail);
    renderWorkspace();
    await fillHappyPath(user);
    await user.clear(screen.getByLabelText('Rejected qty'));
    await user.type(screen.getByLabelText('Rejected qty'), '3');
    await user.click(screen.getByRole('button', { name: 'Accept onto floor' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Accepted and rejected qty must add up to received, and accepting needs visual plus checklist.',
    );
    expect(submitQualityCheckMock).not.toHaveBeenCalled();
  });

  it('denied: inventory staff can see the queue but cannot submit', async () => {
    const user = qcUser();
    listGoodsReceiptsMock.mockResolvedValue([pending]);
    getGoodsReceiptMock.mockResolvedValue(detail);
    submitQualityCheckMock.mockRejectedValue(
      new ApiError('Pharmacist required', 403, 'PHARMACIST_REQUIRED'),
    );
    renderWorkspace();
    await fillHappyPath(user);
    await user.click(screen.getByRole('button', { name: 'Accept onto floor' }));
    await user.click(screen.getByRole('button', { name: 'Confirm accept' }));
    expect(
      await screen.findByText(
        'Only a pharmacist or owner can accept this delivery onto the floor.',
      ),
    ).toBeInTheDocument();
  });

  it('conflict: delivery already checked elsewhere', async () => {
    const user = qcUser();
    listGoodsReceiptsMock.mockResolvedValue([pending]);
    getGoodsReceiptMock.mockResolvedValue(detail);
    submitQualityCheckMock.mockRejectedValue(new ApiError('Stale', 409, 'STALE_STATE'));
    renderWorkspace();
    await fillHappyPath(user);
    await user.click(screen.getByRole('button', { name: 'Accept onto floor' }));
    await user.click(screen.getByRole('button', { name: 'Confirm accept' }));
    expect(
      await screen.findByText('This delivery was already checked. Refresh and open it again.'),
    ).toBeInTheDocument();
  });

  it('failure: no active outlet', async () => {
    renderWorkspace(null);
    expect(
      await screen.findByText(
        'Pick an outlet in the sidebar, or retry if the server could not be reached.',
      ),
    ).toBeInTheDocument();
  });

  it('success: accepted packs go on the floor and stay read-only', async () => {
    const user = qcUser();
    listGoodsReceiptsMock.mockResolvedValue([pending]);
    getGoodsReceiptMock.mockResolvedValue(detail);
    submitQualityCheckMock.mockResolvedValue(checked);
    renderWorkspace();
    await fillHappyPath(user);
    await user.click(screen.getByRole('button', { name: 'Accept onto floor' }));
    await user.click(screen.getByRole('button', { name: 'Confirm accept' }));
    expect(submitQualityCheckMock).toHaveBeenCalled();
    expect(
      await screen.findByText('Accepted onto the floor. Rejected packs stay off the shelf.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Checked')).toBeInTheDocument();
    expect(screen.getByText('Debit note DN/2026-27/BR01/00001')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept onto floor' })).not.toBeInTheDocument();
  });

  it('restores focus after the confirm dialog closes', async () => {
    const user = qcUser();
    listGoodsReceiptsMock.mockResolvedValue([pending]);
    getGoodsReceiptMock.mockResolvedValue(detail);
    renderWorkspace();
    await fillHappyPath(user);
    await user.click(screen.getByRole('button', { name: 'Accept onto floor' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Accept onto floor' })).toHaveFocus();
    });
  });
});
