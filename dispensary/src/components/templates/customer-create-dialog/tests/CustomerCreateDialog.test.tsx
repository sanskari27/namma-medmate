import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerCreateDialog } from '@/components/templates/customer-create-dialog/CustomerCreateDialog';
import { ApiError } from '@/services/axios';

vi.mock('@/services/customers', async () => {
  const axios = await import('@/services/axios');
  return {
    createCustomer: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { createCustomer } from '@/services/customers';

const createMock = vi.mocked(createCustomer);

describe('CustomerCreateDialog', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('creates a customer and restores focus on success', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    const onCloseFocus = vi.fn();
    createMock.mockResolvedValue({
      id: 'c1',
      tenantId: 't1',
      name: 'Meera',
      phone: '9111100001',
      email: null,
      dateOfBirth: null,
      gender: null,
      address: null,
      bloodGroup: null,
      allergies: null,
      chronicConditions: null,
      createdAt: '2026-09-04T00:00:00Z',
      updatedAt: '2026-09-04T00:00:00Z',
    });

    render(
      <CustomerCreateDialog
        open
        onOpenChange={onOpenChange}
        onCreated={onCreated}
        onCloseFocus={onCloseFocus}
      />,
    );

    await user.type(screen.getByLabelText('Name'), 'Meera');
    await user.type(screen.getByLabelText('Phone'), '9111100001');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Meera', phone: '9111100001' }),
      );
    });
    expect(onCreated).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCloseFocus).toHaveBeenCalled();
  });

  it('surfaces PHONE_TAKEN conflict with search action', async () => {
    const user = userEvent.setup();
    const onPhoneConflict = vi.fn();
    createMock.mockRejectedValue(new ApiError('taken', 409, 'PHONE_TAKEN'));

    render(
      <CustomerCreateDialog
        open
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onPhoneConflict={onPhoneConflict}
      />,
    );

    await user.type(screen.getByLabelText('Name'), 'Dup');
    await user.type(screen.getByLabelText('Phone'), '9000000001');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('phone already exists');
    await user.click(screen.getByRole('button', { name: 'Search this phone' }));
    expect(onPhoneConflict).toHaveBeenCalledWith('9000000001');
  });
});
