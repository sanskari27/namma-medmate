import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkflowDesksScreen from '@/screens/workflow-desks/WorkflowDesksScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/workflows', () => ({
  listWorkflowRules: vi.fn(),
  listWorkflowActions: vi.fn(),
  createWorkflowRule: vi.fn(),
}));

import { createWorkflowRule, listWorkflowActions, listWorkflowRules } from '@/services/workflows';

const listRules = vi.mocked(listWorkflowRules);
const listActions = vi.mocked(listWorkflowActions);
const createRule = vi.mocked(createWorkflowRule);

function renderPage(role: string) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'm1',
          displayName: 'Sanskar',
          role,
          tenantId: null,
          pinSet: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <WorkflowDesksScreen />
    </Provider>,
  );
}

describe('WorkflowDesksScreen', () => {
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

  it('shows loading then empty', async () => {
    let resolveRules: (value: never[]) => void = () => undefined;
    listRules.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRules = resolve as (value: never[]) => void;
        }),
    );
    renderPage('admin_super');
    expect(screen.getByText(/Loading workflow desks/i)).toBeInTheDocument();
    resolveRules([]);
    expect(await screen.findByText(/No platform workflow rules yet/i)).toBeInTheDocument();
  });

  it('validates threshold', async () => {
    listRules.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage('admin_super');
    await screen.findByLabelText(/Threshold/i);
    await user.clear(screen.getByLabelText(/Threshold/i));
    await user.type(screen.getByLabelText(/Threshold/i), '-5');
    await user.click(screen.getByRole('button', { name: /Store workflow rule/i }));
    expect(await screen.findByText(/zero or greater/i)).toBeInTheDocument();
  });

  it('shows conflict on duplicate', async () => {
    listRules.mockResolvedValue([]);
    createRule.mockRejectedValue(new ApiError('dup', 409, 'DUPLICATE_RULE'));
    const user = userEvent.setup();
    renderPage('admin_super');
    await screen.findByRole('button', { name: /Store workflow rule/i });
    await user.click(screen.getByRole('button', { name: /Store workflow rule/i }));
    expect(await screen.findByText(/already exists for this action/i)).toBeInTheDocument();
  });

  it('denies non-master operators', async () => {
    renderPage('admin_verification');
    expect(await screen.findByText(/Only the HQ administrator/i)).toBeInTheDocument();
  });

  it('stores a workflow rule for master', async () => {
    listRules.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'wr-1',
        tenantId: null,
        scope: 'PLATFORM',
        moduleCode: 'SALES',
        actionKey: 'SALES_DISCOUNT_PERCENT',
        thresholdValue: 1000,
        approverType: 'ACCOUNT_CLASS',
        approverAccountClass: 'admin_super',
        approverRoleId: null,
        allowSelfApproval: false,
        version: 1,
      },
    ]);
    createRule.mockResolvedValue({
      id: 'wr-1',
      tenantId: null,
      scope: 'PLATFORM',
      moduleCode: 'SALES',
      actionKey: 'SALES_DISCOUNT_PERCENT',
      thresholdValue: 1000,
      approverType: 'ACCOUNT_CLASS',
      approverAccountClass: 'admin_super',
      approverRoleId: null,
      allowSelfApproval: false,
      version: 1,
    });
    const user = userEvent.setup();
    renderPage('admin_super');
    expect(await screen.findByText(/No platform workflow rules yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Store workflow rule/i }));
    expect(await screen.findByText(/Workflow rule stored/i)).toBeInTheDocument();
  });

  it('shows failure', async () => {
    listRules.mockRejectedValue(new ApiError('fail', 500, 'DOWN'));
    renderPage('admin_super');
    expect(await screen.findByText(/Could not load workflow desks/i)).toBeInTheDocument();
  });
});
