import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerFamilyDialog } from '@/components/templates/customer-family-dialog/CustomerFamilyDialog';
import { ApiError } from '@/services/axios';
import type { Customer } from '@/services/customers';

vi.mock('@/services/customerFamilies', async () => {
  const axios = await import('@/services/axios');
  return {
    createCustomerFamily: vi.fn(),
    addFamilyMember: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { addFamilyMember, createCustomerFamily } from '@/services/customerFamilies';

const createMock = vi.mocked(createCustomerFamily);
const addMock = vi.mocked(addFamilyMember);

const primary: Customer = {
  id: 'c1',
  tenantId: 't1',
  name: 'Parent',
  phone: '9101000001',
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

const dependent: Customer = {
  ...primary,
  id: 'c2',
  name: 'Child',
  phone: '9101000002',
};

describe('CustomerFamilyDialog', () => {
  beforeEach(() => {
    createMock.mockReset();
    addMock.mockReset();
  });

  it('empty: no other customers to link', () => {
    render(
      <CustomerFamilyDialog
        open
        primary={primary}
        candidates={[primary]}
        existingFamily={null}
        onOpenChange={vi.fn()}
        onLinked={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No other customer');
  });

  it('validation: submit without selecting a dependent', async () => {
    const user = userEvent.setup();
    render(
      <CustomerFamilyDialog
        open
        primary={primary}
        candidates={[primary, dependent]}
        existingFamily={null}
        onOpenChange={vi.fn()}
        onLinked={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Link member' }));
    expect(screen.getByRole('status')).toHaveTextContent('Choose a dependent');
  });

  it('loading: shows checking status while link request is in flight', async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: {
      id: string;
      label: string | null;
      members: { id: string; name: string; phone: string }[];
      createdAt: string;
    }) => void = () => undefined;
    createMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );

    render(
      <CustomerFamilyDialog
        open
        primary={primary}
        candidates={[primary, dependent]}
        existingFamily={null}
        onOpenChange={vi.fn()}
        onLinked={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Dependent to link'), 'c2');
    await user.click(screen.getByRole('button', { name: 'Link member' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Checking family link');

    resolveCreate({
      id: 'f1',
      label: null,
      members: [
        { id: 'c1', name: 'Parent', phone: '9101000001' },
        { id: 'c2', name: 'Child', phone: '9101000002' },
      ],
      createdAt: '2026-09-04T00:00:00Z',
    });

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(['c1', 'c2']);
    });
  });

  it('success: creates a family from primary and dependent', async () => {
    const user = userEvent.setup();
    const onLinked = vi.fn();
    const onOpenChange = vi.fn();
    const onCloseFocus = vi.fn();
    createMock.mockResolvedValue({
      id: 'f1',
      label: null,
      members: [
        { id: 'c1', name: 'Parent', phone: '9101000001' },
        { id: 'c2', name: 'Child', phone: '9101000002' },
      ],
      createdAt: '2026-09-04T00:00:00Z',
    });

    render(
      <CustomerFamilyDialog
        open
        primary={primary}
        candidates={[primary, dependent]}
        existingFamily={null}
        onOpenChange={onOpenChange}
        onLinked={onLinked}
        onCloseFocus={onCloseFocus}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Dependent to link'), 'c2');
    await user.click(screen.getByRole('button', { name: 'Link member' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(['c1', 'c2']);
    });
    expect(onLinked).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCloseFocus).toHaveBeenCalled();
  });

  it('conflict: already in another family', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError('Taken', 409, 'ALREADY_IN_FAMILY'));

    render(
      <CustomerFamilyDialog
        open
        primary={primary}
        candidates={[primary, dependent]}
        existingFamily={null}
        onOpenChange={vi.fn()}
        onLinked={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Dependent to link'), 'c2');
    await user.click(screen.getByRole('button', { name: 'Link member' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already belongs');
  });

  it('denied: missing CRM access', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError('No', 403, 'FORBIDDEN'));

    render(
      <CustomerFamilyDialog
        open
        primary={primary}
        candidates={[primary, dependent]}
        existingFamily={null}
        onOpenChange={vi.fn()}
        onLinked={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Dependent to link'), 'c2');
    await user.click(screen.getByRole('button', { name: 'Link member' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('CRM access');
  });

  it('failure: unexpected error', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new Error('network'));

    render(
      <CustomerFamilyDialog
        open
        primary={primary}
        candidates={[primary, dependent]}
        existingFamily={null}
        onOpenChange={vi.fn()}
        onLinked={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Dependent to link'), 'c2');
    await user.click(screen.getByRole('button', { name: 'Link member' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update');
  });

  it('success: adds to an existing family', async () => {
    const user = userEvent.setup();
    addMock.mockResolvedValue({
      id: 'f1',
      label: null,
      members: [
        { id: 'c1', name: 'Parent', phone: '9101000001' },
        { id: 'c2', name: 'Child', phone: '9101000002' },
      ],
      createdAt: '2026-09-04T00:00:00Z',
    });

    render(
      <CustomerFamilyDialog
        open
        primary={primary}
        candidates={[primary, dependent]}
        existingFamily={{
          id: 'f1',
          label: null,
          members: [{ id: 'c1', name: 'Parent', phone: '9101000001' }],
          createdAt: '2026-09-04T00:00:00Z',
        }}
        onOpenChange={vi.fn()}
        onLinked={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Dependent to link'), 'c2');
    await user.click(screen.getByRole('button', { name: 'Link member' }));

    await waitFor(() => {
      expect(addMock).toHaveBeenCalledWith('f1', 'c2');
    });
  });
});
