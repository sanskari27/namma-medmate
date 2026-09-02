import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HqSignOffsScreen from '@/screens/hq-sign-offs/HqSignOffsScreen';
import { ApiError } from '@/services/axios';

vi.mock('@/services/workflows', () => ({
  listHqSignOffs: vi.fn(),
  decideHqSignOff: vi.fn(),
}));

import { decideHqSignOff, listHqSignOffs } from '@/services/workflows';

const listPending = vi.mocked(listHqSignOffs);
const decide = vi.mocked(decideHqSignOff);

describe('HqSignOffsScreen', () => {
  beforeEach(() => {
    listPending.mockReset();
    decide.mockReset();
  });

  it('shows loading then empty queue', async () => {
    let resolveList: (value: never[]) => void = () => undefined;
    listPending.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve as (value: never[]) => void;
        }),
    );
    render(<HqSignOffsScreen />);
    expect(screen.getByText(/Loading HQ sign-offs/i)).toBeInTheDocument();
    resolveList([]);
    expect(await screen.findByText(/No requests await this HQ desk/i)).toBeInTheDocument();
  });

  it('shows denied when forbidden', async () => {
    listPending.mockRejectedValue(new ApiError('no', 403, 'FORBIDDEN'));
    render(<HqSignOffsScreen />);
    expect(await screen.findByText(/not an approver for pending/i)).toBeInTheDocument();
  });

  it('shows conflict when threshold changed', async () => {
    listPending.mockResolvedValue([
      {
        id: 'req-1',
        tenantId: '11111111-1111-1111-1111-111111111111',
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
    render(<HqSignOffsScreen />);
    await user.click(await screen.findByRole('button', { name: /Approve/i }));
    expect(await screen.findByText(/Stale request/i)).toBeInTheDocument();
  });

  it('shows empty queue', async () => {
    listPending.mockResolvedValue([]);
    render(<HqSignOffsScreen />);
    expect(await screen.findByText(/No requests await this HQ desk/i)).toBeInTheDocument();
  });

  it('records an approval', async () => {
    listPending
      .mockResolvedValueOnce([
        {
          id: 'req-1',
          tenantId: '11111111-1111-1111-1111-111111111111',
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
      ])
      .mockResolvedValueOnce([]);
    decide.mockResolvedValue({
      id: 'req-1',
      tenantId: '11111111-1111-1111-1111-111111111111',
      branchId: null,
      ruleId: 'rule-1',
      requesterUserId: 'u2',
      moduleCode: 'SALES',
      actionKey: 'SALES_DISCOUNT_PERCENT',
      amountValue: 1500,
      thresholdSnapshot: 1000,
      ruleVersionSnapshot: 1,
      contextJson: null,
      status: 'APPROVED',
      version: 2,
      createdAt: '2026-09-03T00:00:00Z',
      decisionOutcome: 'APPROVED',
      decisionActorUserId: 'm1',
    });
    const user = userEvent.setup();
    render(<HqSignOffsScreen />);
    await user.click(await screen.findByRole('button', { name: /Approve/i }));
    expect(await screen.findByText(/HQ decision recorded/i)).toBeInTheDocument();
  });

  it('shows failure', async () => {
    listPending.mockRejectedValue(new ApiError('fail', 500, 'DOWN'));
    render(<HqSignOffsScreen />);
    expect(await screen.findByText(/Could not load HQ sign-offs/i)).toBeInTheDocument();
  });
});
