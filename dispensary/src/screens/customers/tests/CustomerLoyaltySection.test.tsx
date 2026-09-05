import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerLoyaltySection } from '@/screens/customers/components/customer-loyalty-section';
import { ApiError } from '@/services/axios';
import type { CustomerLoyalty } from '@/services/loyalty';

vi.mock('@/services/loyalty', async () => {
  const axios = await import('@/services/axios');
  const actual = await vi.importActual<typeof import('@/services/loyalty')>('@/services/loyalty');
  return {
    ...actual,
    getCustomerLoyalty: vi.fn(),
    adjustCustomerLoyalty: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { adjustCustomerLoyalty } from '@/services/loyalty';

const adjustMock = vi.mocked(adjustCustomerLoyalty);

const sample: CustomerLoyalty = {
  customerId: 'c1',
  balancePoints: 21,
  version: 1,
  entries: [
    {
      id: 'le1',
      type: 'EARN',
      points: 21,
      deltaPoints: 21,
      balanceAfterPoints: 21,
      invoiceId: 'inv-1',
      salesReturnId: null,
      taxablePaise: 210000,
      reason: null,
      occurredAt: '2026-09-04T05:30:00Z',
    },
  ],
};

describe('customer loyalty section', () => {
  beforeEach(() => {
    adjustMock.mockReset();
  });

  it('loading: reserved status while points load', () => {
    render(
      <CustomerLoyaltySection
        loyalty={null}
        loading
        entitled
        canAdjust
        onAdjusted={() => undefined}
      />,
    );
    expect(screen.getByText('Loading points…')).toBeInTheDocument();
  });

  it('empty: zero balance has no ledger rows', () => {
    render(
      <CustomerLoyaltySection
        loyalty={{ customerId: 'c1', balancePoints: 0, version: 0, entries: [] }}
        loading={false}
        entitled
        canAdjust
        onAdjusted={() => undefined}
      />,
    );
    expect(screen.getByText('No points on this patient yet.')).toBeInTheDocument();
    expect(screen.getByText('0 pts')).toBeInTheDocument();
  });

  it('denied: not on this plan keeps the frozen balance without leaking another pharmacy', () => {
    render(
      <CustomerLoyaltySection
        loyalty={sample}
        loading={false}
        entitled={false}
        canAdjust={false}
        onAdjusted={() => undefined}
      />,
    );
    expect(screen.getByText(/Not on this plan/)).toBeInTheDocument();
    expect(screen.getByText('21 pts')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjust points' })).not.toBeInTheDocument();
  });

  it('validation: adjust needs signed points and a reason', async () => {
    const user = userEvent.setup();
    render(
      <CustomerLoyaltySection
        loyalty={sample}
        loading={false}
        entitled
        canAdjust
        onAdjusted={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Adjust points' }));
    await user.click(screen.getByRole('button', { name: 'Post adjustment' }));
    expect(
      screen.getByText('Enter a non-zero points amount and a reason the floor can audit.'),
    ).toBeInTheDocument();
    expect(adjustMock).not.toHaveBeenCalled();
  });

  it('conflict: stale version surfaces floor copy', async () => {
    const user = userEvent.setup();
    adjustMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    render(
      <CustomerLoyaltySection
        loyalty={sample}
        loading={false}
        entitled
        canAdjust
        onAdjusted={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Adjust points' }));
    await user.type(screen.getByLabelText('Points (+ or −)'), '5');
    await user.type(screen.getByLabelText('Reason'), 'Promo correction');
    await user.click(screen.getByRole('button', { name: 'Post adjustment' }));
    expect(
      await screen.findByText('Points changed on another till. Close and open adjust again.'),
    ).toBeInTheDocument();
  });

  it('failure: network error on adjust', async () => {
    const user = userEvent.setup();
    adjustMock.mockRejectedValue(new Error('network'));
    render(
      <CustomerLoyaltySection
        loyalty={sample}
        loading={false}
        entitled
        canAdjust
        onAdjusted={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Adjust points' }));
    await user.type(screen.getByLabelText('Points (+ or −)'), '5');
    await user.type(screen.getByLabelText('Reason'), 'Promo correction');
    await user.click(screen.getByRole('button', { name: 'Post adjustment' }));
    expect(
      await screen.findByText('Could not adjust points. Try again from this counter.'),
    ).toBeInTheDocument();
  });

  it('denied: PLAN_LIMIT on owner adjust', async () => {
    const user = userEvent.setup();
    adjustMock.mockRejectedValue(
      new ApiError('Points earn and redeem need Growth or Pro.', 422, 'PLAN_LIMIT'),
    );
    render(
      <CustomerLoyaltySection
        loyalty={sample}
        loading={false}
        entitled
        canAdjust
        onAdjusted={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Adjust points' }));
    await user.type(screen.getByLabelText('Points (+ or −)'), '5');
    await user.type(screen.getByLabelText('Reason'), 'Promo correction');
    await user.click(screen.getByRole('button', { name: 'Post adjustment' }));
    expect(
      await screen.findByText('Not on this plan, or only the owner can adjust points.'),
    ).toBeInTheDocument();
  });

  it('success: owner adjust restores focus to Adjust points', async () => {
    const user = userEvent.setup();
    const adjustRef = createRef<HTMLButtonElement>();
    const onAdjusted = vi.fn();
    adjustMock.mockResolvedValue({
      ...sample,
      balancePoints: 26,
      version: 2,
    });
    render(
      <CustomerLoyaltySection
        loyalty={sample}
        loading={false}
        entitled
        canAdjust
        adjustButtonRef={adjustRef}
        onAdjusted={onAdjusted}
      />,
    );
    expect(screen.getByLabelText('Points ledger')).toHaveTextContent('Earned');
    await user.click(screen.getByRole('button', { name: 'Adjust points' }));
    await user.type(screen.getByLabelText('Points (+ or −)'), '5');
    await user.type(screen.getByLabelText('Reason'), 'Promo correction');
    await user.click(screen.getByRole('button', { name: 'Post adjustment' }));
    await waitFor(() => {
      expect(adjustMock).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({
          points: 5,
          reason: 'Promo correction',
          expectedVersion: 1,
        }),
      );
    });
    expect(onAdjusted).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Adjust points' })).toHaveFocus();
    });
  });
});
