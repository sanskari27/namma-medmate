import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerMergeDialog } from '@/components/templates/customer-merge-dialog/CustomerMergeDialog';
import { ApiError } from '@/services/axios';
import type { Customer } from '@/services/customers';

vi.mock('@/services/customers', async () => {
  const axios = await import('@/services/axios');
  return {
    previewCustomerMerge: vi.fn(),
    executeCustomerMerge: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { executeCustomerMerge, previewCustomerMerge } from '@/services/customers';

const previewMock = vi.mocked(previewCustomerMerge);
const executeMock = vi.mocked(executeCustomerMerge);

const survivor: Customer = {
  id: 'c1',
  tenantId: 't1',
  name: 'Ravi',
  phone: '9001000001',
  email: null,
  dateOfBirth: null,
  gender: null,
  address: null,
  bloodGroup: null,
  allergies: null,
  chronicConditions: null,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

const duplicate: Customer = {
  ...survivor,
  id: 'c2',
  name: 'Ravi Kumar',
  phone: '9001000002',
  allergies: 'Dust',
};

describe('CustomerMergeDialog', () => {
  beforeEach(() => {
    previewMock.mockReset();
    executeMock.mockReset();
  });

  it('empty: no other customers to merge', () => {
    render(
      <CustomerMergeDialog
        open
        survivor={survivor}
        candidates={[survivor]}
        onOpenChange={vi.fn()}
        onMerged={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No other customer');
  });

  it('loading then success merge with conflict resolution', async () => {
    const user = userEvent.setup();
    const onMerged = vi.fn();
    const onOpenChange = vi.fn();
    const onCloseFocus = vi.fn();
    previewMock.mockResolvedValue({
      mode: 'PREVIEW',
      survivor,
      duplicate,
      fields: [
        {
          field: 'name',
          status: 'CONFLICT',
          survivorValue: 'Ravi',
          duplicateValue: 'Ravi Kumar',
        },
        {
          field: 'phone',
          status: 'CONFLICT',
          survivorValue: '9001000001',
          duplicateValue: '9001000002',
        },
      ],
      conflicts: ['name', 'phone'],
      linkedRecords: { notificationEvents: 1 },
    });
    executeMock.mockResolvedValue({ ...survivor, name: 'Ravi Kumar' });

    render(
      <CustomerMergeDialog
        open
        survivor={survivor}
        candidates={[survivor, duplicate]}
        onOpenChange={onOpenChange}
        onMerged={onMerged}
        onCloseFocus={onCloseFocus}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Duplicate to deactivate'), 'c2');
    await waitFor(() => {
      expect(previewMock).toHaveBeenCalledWith('c1', 'c2');
    });
    expect(await screen.findByText(/notification event/)).toBeInTheDocument();

    await user.click(screen.getAllByRole('radio', { name: /Use duplicate/i })[0]!);
    await user.click(screen.getByRole('button', { name: 'Confirm merge' }));

    await waitFor(() => {
      expect(executeMock).toHaveBeenCalledWith(
        'c1',
        'c2',
        expect.objectContaining({ name: 'DUPLICATE', phone: 'SURVIVOR' }),
      );
    });
    expect(onMerged).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCloseFocus).toHaveBeenCalled();
  });

  it('denied: CRM gate from server', async () => {
    const user = userEvent.setup();
    previewMock.mockRejectedValue(new ApiError('no', 403, 'FORBIDDEN'));

    render(
      <CustomerMergeDialog
        open
        survivor={survivor}
        candidates={[survivor, duplicate]}
        onOpenChange={vi.fn()}
        onMerged={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Duplicate to deactivate'), 'c2');
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot merge customer profiles');
  });

  it('conflict: stale merge', async () => {
    const user = userEvent.setup();
    previewMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));

    render(
      <CustomerMergeDialog
        open
        survivor={survivor}
        candidates={[survivor, duplicate]}
        onOpenChange={vi.fn()}
        onMerged={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Duplicate to deactivate'), 'c2');
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer available');
  });

  it('failure: network error on confirm', async () => {
    const user = userEvent.setup();
    previewMock.mockResolvedValue({
      mode: 'PREVIEW',
      survivor,
      duplicate,
      fields: [],
      conflicts: [],
      linkedRecords: { notificationEvents: 0 },
    });
    executeMock.mockRejectedValue(new ApiError('down', 500, 'SERVER_ERROR'));

    render(
      <CustomerMergeDialog
        open
        survivor={survivor}
        candidates={[survivor, duplicate]}
        onOpenChange={vi.fn()}
        onMerged={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Duplicate to deactivate'), 'c2');
    await waitFor(() => expect(previewMock).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Confirm merge' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('validation: confirm without selecting duplicate', async () => {
    const user = userEvent.setup();
    render(
      <CustomerMergeDialog
        open
        survivor={survivor}
        candidates={[survivor, duplicate]}
        onOpenChange={vi.fn()}
        onMerged={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Confirm merge' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a duplicate');
  });
});
