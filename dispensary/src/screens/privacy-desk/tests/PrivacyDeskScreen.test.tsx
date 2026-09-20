import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PrivacyDeskScreen from '@/screens/privacy-desk/PrivacyDeskScreen';
import { privacyDeskReducer } from '@/screens/privacy-desk/store';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/dpdp', () => ({
  getDpdpMatrix: vi.fn(),
  listDpdpRequests: vi.fn(),
  createDpdpRequest: vi.fn(),
  acceptDpdpRequest: vi.fn(),
  decideDpdpRequest: vi.fn(),
}));

import {
  acceptDpdpRequest,
  createDpdpRequest,
  decideDpdpRequest,
  getDpdpMatrix,
  listDpdpRequests,
} from '@/services/dpdp';

const list = vi.mocked(listDpdpRequests);
const matrix = vi.mocked(getDpdpMatrix);
const create = vi.mocked(createDpdpRequest);
const accept = vi.mocked(acceptDpdpRequest);
const decide = vi.mocked(decideDpdpRequest);

function renderPage(role = 'pharmacy_owner') {
  const store = configureStore({
    reducer: { auth: authReducer, privacyDesk: privacyDeskReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Varshmaan',
          role,
          tenantId: 't1',
          pinSet: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <PrivacyDeskScreen />
    </Provider>,
  );
}

const sample = {
  id: 'r1',
  tenantId: 't1',
  principalType: 'CUSTOMER',
  principalId: null,
  requestType: 'ACCESS',
  status: 'RECEIVED',
  submittedName: 'Ravi',
  submittedPhone: '90000',
  notes: null,
  identityMethod: null,
  identityAttestedBy: null,
  identityAttestedAt: null,
  acceptedAt: null,
  deadlineAt: null,
  decision: null,
  decisionReason: null,
  legalRetention: false,
  exportJson: null,
  createdBy: 'u1',
  version: 1,
  createdAt: '2026-09-20T00:00:00Z',
};

describe('PrivacyDeskScreen', () => {
  beforeEach(() => {
    list.mockReset();
    matrix.mockReset();
    create.mockReset();
    accept.mockReset();
    decide.mockReset();
    matrix.mockResolvedValue([]);
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
    expect(screen.getByText(/Loading privacy requests/i)).toBeInTheDocument();
    resolveList([]);
    expect(await screen.findByText(/No privacy requests on this shop yet/i)).toBeInTheDocument();
  });

  it('shows denied for staff', async () => {
    renderPage('pharmacy_staff');
    expect(await screen.findByText(/Only the pharmacy owner can run the privacy desk/i)).toBeInTheDocument();
  });

  it('shows failure', async () => {
    list.mockRejectedValue(new ApiError('down', 500, 'DOWN'));
    renderPage();
    expect(await screen.findByText(/Could not load privacy requests/i)).toBeInTheDocument();
  });

  it('logs a request (success)', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([]);
    create.mockResolvedValue(sample);
    renderPage();
    await screen.findByText(/No privacy requests on this shop yet/i);
    await user.click(screen.getByRole('button', { name: /Log a shop request/i }));
    await user.click(screen.getByRole('button', { name: /Save this request/i }));
    expect(await screen.findByText(/Privacy request updated on this shop/i)).toBeInTheDocument();
  });

  it('shows validation when identity is missing', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([sample]);
    accept.mockRejectedValue(new ApiError('need', 400, 'VALIDATION_ERROR'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi' }));
    await user.click(screen.getByRole('button', { name: /Accept and start the 30 days/i }));
    expect(
      await screen.findByText(/Say how you checked who they are/i),
    ).toBeInTheDocument();
  });

  it('restores focus to Log a shop request after cancel', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([]);
    renderPage();
    await screen.findByText(/No privacy requests on this shop yet/i);
    const log = screen.getByRole('button', { name: /Log a shop request/i });
    await user.click(log);
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(log).toHaveFocus();
  });

  it('shows conflict when the request is already closed', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([sample]);
    accept.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi' }));
    await user.type(screen.getByLabelText(/How you checked them/i), 'Aadhaar at counter');
    await user.click(screen.getByRole('button', { name: /Accept and start the 30 days/i }));
    expect(await screen.findByText(/already accepted or closed/i)).toBeInTheDocument();
  });

  it('sends shop record id for an existing person', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([]);
    create.mockResolvedValue({ ...sample, principalId: 'cust-1' });
    renderPage();
    await screen.findByText(/No privacy requests on this shop yet/i);
    await user.click(screen.getByRole('button', { name: /Log a shop request/i }));
    await user.type(screen.getByLabelText(/Shop record id/i), 'cust-1');
    await user.click(screen.getByRole('button', { name: /Save this request/i }));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ principalId: 'cust-1', principalType: 'CUSTOMER' }),
    );
  });

  it('sends correction fields when fulfilling a correction', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([{ ...sample, requestType: 'CORRECTION', status: 'ACCEPTED' }]);
    decide.mockResolvedValue({
      ...sample,
      requestType: 'CORRECTION',
      status: 'FULFILLED',
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi' }));
    await user.type(screen.getByLabelText(/Corrected name/i), 'Ravi Kumar');
    await user.click(screen.getByRole('button', { name: /Mark fulfilled/i }));
    expect(decide).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({
        decision: 'FULFILLED',
        correction: { name: 'Ravi Kumar' },
      }),
    );
    expect(await screen.findByText(/Privacy request updated on this shop/i)).toBeInTheDocument();
  });
});
