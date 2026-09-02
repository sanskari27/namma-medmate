import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignOffRulesScreen from '@/screens/sign-off-rules/SignOffRulesScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/approvals', () => ({
  listApprovalRules: vi.fn(),
  listApprovalActions: vi.fn(),
  createApprovalRule: vi.fn(),
}));

import { createApprovalRule, listApprovalActions, listApprovalRules } from '@/services/approvals';

const listRules = vi.mocked(listApprovalRules);
const listActions = vi.mocked(listApprovalActions);
const createRule = vi.mocked(createApprovalRule);

function renderPage(role: string, modules?: string[]) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Varshmaan',
          role,
          tenantId: 't1',
          pinSet: true,
          modules,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <SignOffRulesScreen />
    </Provider>,
  );
}

describe('SignOffRulesScreen', () => {
  beforeEach(() => {
    listRules.mockReset();
    listActions.mockReset();
    createRule.mockReset();
    listActions.mockResolvedValue([
      {
        actionKey: 'SALES_DISCOUNT_PERCENT',
        moduleCode: 'SALES',
        unit: 'BPS',
        label: 'Sales discount percent',
        thresholdUnit: 'BPS',
      },
    ]);
  });

  it('shows denied without approvals access', async () => {
    renderPage('pharmacy_staff', ['SALES']);
    expect(await screen.findByText(/need Approvals access/i)).toBeInTheDocument();
  });

  it('shows empty then saves a rule for owner', async () => {
    listRules.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'rule-1',
        tenantId: 't1',
        scope: 'TENANT',
        moduleCode: 'SALES',
        actionKey: 'SALES_DISCOUNT_PERCENT',
        thresholdValue: 1000,
        approverType: 'ACCOUNT_CLASS',
        approverAccountClass: 'pharmacy_owner',
        approverRoleId: null,
        allowSelfApproval: false,
        version: 1,
      },
    ]);
    createRule.mockResolvedValue({
      id: 'rule-1',
      tenantId: 't1',
      scope: 'TENANT',
      moduleCode: 'SALES',
      actionKey: 'SALES_DISCOUNT_PERCENT',
      thresholdValue: 1000,
      approverType: 'ACCOUNT_CLASS',
      approverAccountClass: 'pharmacy_owner',
      approverRoleId: null,
      allowSelfApproval: false,
      version: 1,
    });

    const user = userEvent.setup();
    renderPage('pharmacy_owner', ['APPROVALS', 'SALES']);
    expect(await screen.findByText(/No sign-off rules yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Save sign-off rule/i }));
    expect(await screen.findByText(/Sign-off rule saved/i)).toBeInTheDocument();
    expect(createRule).toHaveBeenCalled();
  });

  it('shows validation for bad threshold', async () => {
    listRules.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage('pharmacy_owner');
    await screen.findByLabelText(/Threshold/i);
    await user.clear(screen.getByLabelText(/Threshold/i));
    await user.type(screen.getByLabelText(/Threshold/i), '-1');
    await user.click(screen.getByRole('button', { name: /Save sign-off rule/i }));
    expect(await screen.findByText(/threshold of zero or more/i)).toBeInTheDocument();
  });

  it('shows loading then empty', async () => {
    let resolveRules: (value: never[]) => void = () => undefined;
    listRules.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRules = resolve as (value: never[]) => void;
        }),
    );
    renderPage('pharmacy_owner');
    expect(screen.getByText(/Loading sign-off rules/i)).toBeInTheDocument();
    resolveRules([]);
    expect(await screen.findByText(/No sign-off rules yet/i)).toBeInTheDocument();
  });

  it('shows conflict when rule already exists', async () => {
    listRules.mockResolvedValue([]);
    createRule.mockRejectedValue(new ApiError('exists', 409, 'DUPLICATE_RULE'));
    const user = userEvent.setup();
    renderPage('pharmacy_owner');
    await screen.findByRole('button', { name: /Save sign-off rule/i });
    await user.click(screen.getByRole('button', { name: /Save sign-off rule/i }));
    expect(await screen.findByText(/rule already exists/i)).toBeInTheDocument();
  });

  it('shows failure state', async () => {
    listRules.mockRejectedValue(new ApiError('fail', 500, 'DOWN'));
    renderPage('pharmacy_owner');
    expect(await screen.findByText(/Could not load sign-off rules/i)).toBeInTheDocument();
  });
});
