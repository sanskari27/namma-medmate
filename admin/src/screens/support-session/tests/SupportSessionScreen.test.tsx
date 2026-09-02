import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@atoms';
import SupportSessionScreen from '@/screens/support-session/SupportSessionScreen';
import { authReducer, inboxReducer, type ImpersonationState } from '@/store';
import { ApiError } from '@/services/axios';

const startImpersonation = vi.fn();

vi.mock('@/services/impersonation', () => ({
  startImpersonation: (...args: unknown[]) => startImpersonation(...args),
  exitImpersonation: vi.fn(),
  fetchSession: vi.fn(),
}));

function renderScreen(role = 'admin_super', impersonation: ImpersonationState | null = null) {
  const store = configureStore({
    reducer: { auth: authReducer, inbox: inboxReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'm1',
          displayName: 'Sanskar',
          role,
          tenantId: null,
          pinSet: true,
          impersonation,
        },
      },
      inbox: {
        rows: [],
        unread: 0,
        page: 0,
        pageSize: 6,
        pageCount: 0,
        rowCount: 0,
      },
    },
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <TooltipProvider>
          <SupportSessionScreen />
        </TooltipProvider>
      </Provider>,
    ),
  };
}

describe('Support session screen', () => {
  beforeEach(() => {
    startImpersonation.mockReset();
  });

  it('empty: prompts for a tenant user email', () => {
    renderScreen();
    expect(
      screen.getByText('Enter a tenant user email to diagnose their pharmacy context.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Tenant user email')).toBeInTheDocument();
  });

  it('validation: rejects blank email', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: 'Enter support session' }));
    expect(screen.getByText('Enter a valid tenant user email.')).toBeInTheDocument();
  });

  it('denied: verification agents cannot open a session', () => {
    renderScreen('admin_verification');
    expect(screen.getByText('Only MASTER can open a support session.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Tenant user email')).not.toBeInTheDocument();
  });

  it('conflict: nested attempt is blocked when a session is active', () => {
    renderScreen('pharmacy_owner', {
      originalUserId: 'm1',
      originalDisplayName: 'Sanskar',
      effectiveUserId: 'o1',
      effectiveDisplayName: 'Varshmaan',
      effectiveRole: 'pharmacy_owner',
      tenantId: 't1',
      tenantName: 'varshmaan',
    });
    expect(screen.getByText(/Active:/)).toBeInTheDocument();
    expect(screen.getByText(/Varshmaan/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Tenant user email')).not.toBeInTheDocument();
  });

  it('failure: surfaces API outage copy', async () => {
    const user = userEvent.setup();
    startImpersonation.mockRejectedValue(new ApiError('down', 500, 'SERVER'));
    renderScreen();
    await user.type(screen.getByLabelText('Tenant user email'), 'owner@varshmaan.local');
    await user.click(screen.getByRole('button', { name: 'Enter support session' }));
    await waitFor(() => {
      expect(
        screen.getByText('Could not open the support session. Try again.'),
      ).toBeInTheDocument();
    });
  });

  it('loading then success: enters support context', async () => {
    const user = userEvent.setup();
    let resolve!: (value: unknown) => void;
    startImpersonation.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { store } = renderScreen();
    await user.type(screen.getByLabelText('Tenant user email'), 'owner@varshmaan.local');
    await user.click(screen.getByRole('button', { name: 'Enter support session' }));
    expect(screen.getByText('Opening support session…')).toBeInTheDocument();

    resolve({
      userId: 'o1',
      displayName: 'Varshmaan',
      role: 'pharmacy_owner',
      tenantId: 't1',
      pinSet: true,
      impersonation: {
        originalUserId: 'm1',
        originalDisplayName: 'Sanskar',
        effectiveUserId: 'o1',
        effectiveDisplayName: 'Varshmaan',
        effectiveRole: 'pharmacy_owner',
        tenantId: 't1',
        tenantName: 'varshmaan',
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Entered Varshmaan in varshmaan/)).toBeInTheDocument();
    });
    expect(store.getState().auth.user?.impersonation?.tenantName).toBe('varshmaan');
  });

  it('denied: maps 403 from API', async () => {
    const user = userEvent.setup();
    startImpersonation.mockRejectedValue(new ApiError('Access denied', 403, 'FORBIDDEN'));
    renderScreen();
    await user.type(screen.getByLabelText('Tenant user email'), 'owner@x.local');
    await user.click(screen.getByRole('button', { name: 'Enter support session' }));
    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
