import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreditSettleDialog } from '@/components/templates/credit-settle-dialog/CreditSettleDialog';
import { ApiError } from '@/services/axios';

vi.mock('@/services/credit', async () => {
  const axios = await import('@/services/axios');
  return {
    settleCustomerCredit: vi.fn(),
    formatPaise: (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`,
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { settleCustomerCredit } from '@/services/credit';

const settleMock = vi.mocked(settleCustomerCredit);

describe('CreditSettleDialog', () => {
  beforeEach(() => {
    settleMock.mockReset();
  });

  it('empty: nothing due', async () => {
    render(
      <CreditSettleDialog
        open
        customerId="c1"
        customerName="Ravi"
        balancePaise={0}
        version={1}
        onOpenChange={vi.fn()}
        onSettled={vi.fn()}
      />,
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Nothing due on this khata yet.');
    expect(screen.getByRole('button', { name: 'Post settlement' })).toBeDisabled();
  });

  it('validation: amount required', async () => {
    const user = userEvent.setup();
    render(
      <CreditSettleDialog
        open
        customerId="c1"
        customerName="Ravi"
        balancePaise={10000}
        version={2}
        onOpenChange={vi.fn()}
        onSettled={vi.fn()}
      />,
    );
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Enter a payoff amount in rupees and pick how they paid.',
    );
    expect(settleMock).not.toHaveBeenCalled();
  });

  it('loading: posts settlement', async () => {
    const user = userEvent.setup();
    let resolveSettle: (value: {
      customerId: string;
      limitPaise: number;
      balancePaise: number;
      availablePaise: number;
      version: number;
      entries: [];
    }) => void = () => undefined;
    settleMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSettle = resolve;
      }),
    );
    render(
      <CreditSettleDialog
        open
        customerId="c1"
        customerName="Ravi"
        balancePaise={10000}
        version={2}
        onOpenChange={vi.fn()}
        onSettled={vi.fn()}
      />,
    );
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '50');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Recording settlement on this khata…',
    );
    resolveSettle({
      customerId: 'c1',
      limitPaise: 50000,
      balancePaise: 5000,
      availablePaise: 45000,
      version: 3,
      entries: [],
    });
    await waitFor(() => expect(settleMock).toHaveBeenCalled());
  });

  it('denied: CRM forbidden', async () => {
    const user = userEvent.setup();
    settleMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    render(
      <CreditSettleDialog
        open
        customerId="c1"
        customerName="Ravi"
        balancePaise={10000}
        version={2}
        onOpenChange={vi.fn()}
        onSettled={vi.fn()}
      />,
    );
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '50');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This till cannot settle khata. Ask the owner for CRM access.',
    );
  });

  it('conflict: stale balance', async () => {
    const user = userEvent.setup();
    settleMock.mockRejectedValue(new ApiError('Stale', 409, 'STALE_STATE'));
    render(
      <CreditSettleDialog
        open
        customerId="c1"
        customerName="Ravi"
        balancePaise={10000}
        version={2}
        onOpenChange={vi.fn()}
        onSettled={vi.fn()}
      />,
    );
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '50');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Khata balance changed on another till. Close and open settle again.',
    );
  });

  it('failure: network', async () => {
    const user = userEvent.setup();
    settleMock.mockRejectedValue(new Error('network'));
    render(
      <CreditSettleDialog
        open
        customerId="c1"
        customerName="Ravi"
        balancePaise={10000}
        version={2}
        onOpenChange={vi.fn()}
        onSettled={vi.fn()}
      />,
    );
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '50');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not record this settlement. Try again from the counter.',
    );
  });

  it('success: posts settlement', async () => {
    const user = userEvent.setup();
    const onSettled = vi.fn();
    const onOpenChange = vi.fn();
    const onCloseFocus = vi.fn();
    settleMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 50000,
      balancePaise: 5000,
      availablePaise: 45000,
      version: 3,
      entries: [],
    });
    render(
      <CreditSettleDialog
        open
        customerId="c1"
        customerName="Ravi"
        balancePaise={10000}
        version={2}
        onOpenChange={onOpenChange}
        onSettled={onSettled}
        onCloseFocus={onCloseFocus}
      />,
    );
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '50');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    await waitFor(() => {
      expect(onSettled).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onCloseFocus).toHaveBeenCalled();
    });
    expect(settleMock).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        amountPaise: 5000,
        mode: 'CASH',
        expectedVersion: 2,
      }),
    );
  });

  it('cancel restores focus', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onCloseFocus = vi.fn();
    render(
      <CreditSettleDialog
        open
        customerId="c1"
        customerName="Ravi"
        balancePaise={10000}
        version={2}
        onOpenChange={onOpenChange}
        onSettled={vi.fn()}
        onCloseFocus={onCloseFocus}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCloseFocus).toHaveBeenCalled();
  });
});
