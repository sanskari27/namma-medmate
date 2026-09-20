import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PrincipalRequestsScreen from '@/screens/principal-requests/PrincipalRequestsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/dpdp', () => ({
  listHqDpdpRequests: vi.fn(),
  getHqDpdpMatrix: vi.fn(),
  createHqDpdpRequest: vi.fn(),
  acceptHqDpdpRequest: vi.fn(),
  decideHqDpdpRequest: vi.fn(),
}));

import {
  acceptHqDpdpRequest,
  createHqDpdpRequest,
  decideHqDpdpRequest,
  listHqDpdpRequests,
} from '@/services/dpdp';

const list = vi.mocked(listHqDpdpRequests);
const create = vi.mocked(createHqDpdpRequest);
const accept = vi.mocked(acceptHqDpdpRequest);
const decide = vi.mocked(decideHqDpdpRequest);

function renderPage(role = 'admin_super') {
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
      <PrincipalRequestsScreen />
    </Provider>,
  );
}

const sample = {
  id: 'p1',
  tenantId: null,
  principalType: 'MASTER',
  principalId: 'm2',
  requestType: 'ACCESS',
  status: 'RECEIVED',
  submittedName: null,
  notes: null,
  identityMethod: null,
  deadlineAt: null,
  decision: null,
  decisionReason: null,
  legalRetention: false,
  exportJson: null,
  createdAt: '2026-09-20T00:00:00Z',
};

describe('PrincipalRequestsScreen', () => {
  beforeEach(() => {
    list.mockReset();
    create.mockReset();
    accept.mockReset();
    decide.mockReset();
  });

  it('shows loading then empty', async () => {
    let resolveList: (value: []) => void = () => undefined;
    list.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve as (value: []) => void;
        }),
    );
    renderPage();
    expect(screen.getByText(/Loading HQ principal requests/i)).toBeInTheDocument();
    resolveList([]);
    expect(await screen.findByText(/No principal requests on the platform file/i)).toBeInTheDocument();
  });

  it('denies non-master', async () => {
    renderPage('admin_verification');
    expect(
      await screen.findByText(/Only MASTER desks can fulfill platform privacy requests/i),
    ).toBeInTheDocument();
  });

  it('shows failure', async () => {
    list.mockRejectedValue(new ApiError('down', 500, 'DOWN'));
    renderPage();
    expect(await screen.findByText(/Could not load principal requests/i)).toBeInTheDocument();
  });

  it('files a platform request (success)', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([]);
    create.mockResolvedValue(sample);
    renderPage();
    await screen.findByText(/No principal requests on the platform file/i);
    await user.click(screen.getByRole('button', { name: /Record HQ request/i }));
    await user.click(screen.getByRole('button', { name: /File on the platform/i }));
    expect(await screen.findByText(/Platform privacy request updated/i)).toBeInTheDocument();
  });

  it('shows validation when HQ verification is missing', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([sample]);
    accept.mockRejectedValue(new ApiError('need', 400, 'VALIDATION_ERROR'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'MASTER' }));
    await user.click(screen.getByRole('button', { name: /Accept clock/i }));
    expect(
      await screen.findByText(/Record how HQ verified the requester/i),
    ).toBeInTheDocument();
  });

  it('restores focus to Record HQ request after cancel', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([]);
    renderPage();
    await screen.findByText(/No principal requests on the platform file/i);
    const log = screen.getByRole('button', { name: /Record HQ request/i });
    await user.click(log);
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(log).toHaveFocus();
  });

  it('shows conflict when the request is already closed', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([sample]);
    accept.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'MASTER' }));
    await user.type(screen.getByLabelText(/HQ verification note/i), 'HQ badge');
    await user.click(screen.getByRole('button', { name: /Accept clock/i }));
    expect(await screen.findByText(/already accepted or closed/i)).toBeInTheDocument();
  });

  it('sends correction fields when fulfilling an HQ correction', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([{ ...sample, requestType: 'CORRECTION', status: 'ACCEPTED' }]);
    decide.mockResolvedValue({
      ...sample,
      requestType: 'CORRECTION',
      status: 'FULFILLED',
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'MASTER' }));
    await user.type(screen.getByLabelText(/Corrected display name/i), 'Desk Two');
    await user.click(screen.getByRole('button', { name: /^Fulfill$/i }));
    expect(decide).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        decision: 'FULFILLED',
        correction: { displayName: 'Desk Two' },
      }),
    );
    expect(await screen.findByText(/Platform privacy request updated/i)).toBeInTheDocument();
  });
});
