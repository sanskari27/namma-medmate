import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaitingSignOffScreen from '@/screens/waiting-sign-off/WaitingSignOffScreen';
import { ApiError } from '@/services/axios';

vi.mock('@/services/approvals', () => ({
  listPendingApprovals: vi.fn(),
  decideApproval: vi.fn(),
}));

import { decideApproval, listPendingApprovals } from '@/services/approvals';

const listPending = vi.mocked(listPendingApprovals);
const decide = vi.mocked(decideApproval);

describe('WaitingSignOffScreen', () => {
  beforeEach(() => {
    listPending.mockReset();
    decide.mockReset();
  });

  it('shows loading then empty state', async () => {
    let resolveList: (value: never[]) => void = () => undefined;
    listPending.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve as (value: never[]) => void;
        }),
    );
    render(<WaitingSignOffScreen />);
    expect(screen.getByText(/Loading waiting sign-offs/i)).toBeInTheDocument();
    resolveList([]);
    expect(await screen.findByText(/Nothing waiting for your sign-off/i)).toBeInTheDocument();
  });

  it('shows denied when forbidden', async () => {
    listPending.mockRejectedValue(new ApiError('no', 403, 'FORBIDDEN'));
    render(<WaitingSignOffScreen />);
    expect(await screen.findByText(/not an approver for pending/i)).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    listPending.mockResolvedValue([]);
    render(<WaitingSignOffScreen />);
    expect(await screen.findByText(/Nothing waiting for your sign-off/i)).toBeInTheDocument();
  });

  it('approves a pending request', async () => {
    listPending
      .mockResolvedValueOnce([
        {
          id: 'req-1',
          tenantId: 't1',
          branchId: null,
          ruleId: 'rule-1',
          requesterUserId: 'u2',
          moduleCode: 'SALES',
          actionKey: 'SALES_DISCOUNT_PERCENT',
          amountValue: 1500,
          thresholdSnapshot: 1000,
          ruleVersionSnapshot: 1,
          contextJson: '{"invoiceId":"inv-1"}',
          status: 'PENDING',
          version: 1,
          createdAt: '2026-09-03T00:00:00Z',
          decisionOutcome: null,
          decisionActorUserId: null,
        },
      ])
      .mockResolvedValueOnce([]);
    decide.mockResolvedValue({
      id: 'req-1',
      tenantId: 't1',
      branchId: null,
      ruleId: 'rule-1',
      requesterUserId: 'u2',
      moduleCode: 'SALES',
      actionKey: 'SALES_DISCOUNT_PERCENT',
      amountValue: 1500,
      thresholdSnapshot: 1000,
      ruleVersionSnapshot: 1,
      contextJson: '{"invoiceId":"inv-1"}',
      status: 'APPROVED',
      version: 2,
      createdAt: '2026-09-03T00:00:00Z',
      decisionOutcome: 'APPROVED',
      decisionActorUserId: 'u1',
    });

    const user = userEvent.setup();
    render(<WaitingSignOffScreen />);
    await user.click(await screen.findByRole('button', { name: /Approve/i }));
    expect(await screen.findByText(/Sign-off recorded/i)).toBeInTheDocument();
  });

  it('shows conflict when threshold changed', async () => {
    listPending.mockResolvedValue([
      {
        id: 'req-1',
        tenantId: 't1',
        branchId: null,
        ruleId: 'rule-1',
        requesterUserId: 'u2',
        moduleCode: 'SALES',
        actionKey: 'SALES_DISCOUNT_PERCENT',
        amountValue: 1500,
        thresholdSnapshot: 1000,
        ruleVersionSnapshot: 1,
        contextJson: null,
        status: 'PENDING',
        version: 1,
        createdAt: '2026-09-03T00:00:00Z',
        decisionOutcome: null,
        decisionActorUserId: null,
      },
    ]);
    decide.mockRejectedValue(new ApiError('changed', 409, 'THRESHOLD_CHANGED'));
    const user = userEvent.setup();
    render(<WaitingSignOffScreen />);
    await user.click(await screen.findByRole('button', { name: /Approve/i }));
    expect(await screen.findByText(/request changed/i)).toBeInTheDocument();
  });

  it('shows failure state', async () => {
    listPending.mockRejectedValue(new ApiError('fail', 500, 'DOWN'));
    render(<WaitingSignOffScreen />);
    expect(await screen.findByText(/Could not load waiting sign-offs/i)).toBeInTheDocument();
  });
});
