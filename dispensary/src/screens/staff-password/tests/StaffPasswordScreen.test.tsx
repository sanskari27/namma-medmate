import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffPasswordScreen from '@/screens/staff-password/StaffPasswordScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    adminResetPassword: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { adminResetPassword } from '@/services/auth';

const resetMock = vi.mocked(adminResetPassword);

function renderPage(role: string) {
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
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <StaffPasswordScreen />
    </Provider>,
  );
}

describe('counter staff password reset', () => {
  beforeEach(() => {
    resetMock.mockReset();
  });

  it('empty: owner sees the till form without a status', () => {
    renderPage('pharmacy_owner');
    expect(screen.getByRole('heading', { name: 'Reset a staff password' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('denied: staff cannot set another till password', () => {
    renderPage('pharmacy_staff');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'only the owner who created it can reset it',
    );
    expect(screen.getByRole('button', { name: 'Set till password' })).toBeDisabled();
  });

  it('validation: owner must enter email and an eight-character password', async () => {
    const user = userEvent.setup();
    renderPage('pharmacy_owner');
    await user.click(screen.getByRole('button', { name: 'Set till password' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter the staff email and a temporary password',
    );
    expect(resetMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the till button', async () => {
    const user = userEvent.setup();
    resetMock.mockReturnValue(new Promise(() => undefined));
    renderPage('pharmacy_owner');
    await user.type(screen.getByLabelText('Staff email'), 'clerk@pharmacy.local');
    await user.type(screen.getByLabelText('Temporary password'), 'temp-pass-9');
    await user.type(screen.getByLabelText('Confirm temporary password'), 'temp-pass-9');
    await user.click(screen.getByRole('button', { name: 'Set till password' }));
    expect(screen.getByRole('button', { name: 'Saving till password' })).toBeDisabled();
  });

  it('denied: unknown staff is not disclosed beyond a counter miss', async () => {
    const user = userEvent.setup();
    resetMock.mockRejectedValue(new ApiError('missing', 404, 'NOT_FOUND'));
    renderPage('pharmacy_owner');
    await user.type(screen.getByLabelText('Staff email'), 'gone@pharmacy.local');
    await user.type(screen.getByLabelText('Temporary password'), 'temp-pass-9');
    await user.type(screen.getByLabelText('Confirm temporary password'), 'temp-pass-9');
    await user.click(screen.getByRole('button', { name: 'Set till password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That staff login is not on this pharmacy',
    );
  });

  it('conflict: reused temporary password is rejected', async () => {
    const user = userEvent.setup();
    resetMock.mockRejectedValue(new ApiError('reuse', 422, 'PASSWORD_REUSED'));
    renderPage('pharmacy_owner');
    await user.type(screen.getByLabelText('Staff email'), 'clerk@pharmacy.local');
    await user.type(screen.getByLabelText('Temporary password'), 'counter-pass-1');
    await user.type(screen.getByLabelText('Confirm temporary password'), 'counter-pass-1');
    await user.click(screen.getByRole('button', { name: 'Set till password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That temporary password was already used',
    );
  });

  it('failure: network errors stay on the till form', async () => {
    const user = userEvent.setup();
    resetMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    renderPage('pharmacy_owner');
    await user.type(screen.getByLabelText('Staff email'), 'clerk@pharmacy.local');
    await user.type(screen.getByLabelText('Temporary password'), 'temp-pass-9');
    await user.type(screen.getByLabelText('Confirm temporary password'), 'temp-pass-9');
    await user.click(screen.getByRole('button', { name: 'Set till password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('success: owner is told staff must change the temporary password', async () => {
    const user = userEvent.setup();
    resetMock.mockResolvedValue({
      userId: 's1',
      displayName: 'Clerk',
      role: 'pharmacy_staff',
      tenantId: 't1',
      pinSet: false,
      mustChangePassword: true,
    });
    renderPage('pharmacy_owner');
    await user.type(screen.getByLabelText('Staff email'), 'clerk@pharmacy.local');
    await user.type(screen.getByLabelText('Temporary password'), 'temp-pass-9');
    await user.type(screen.getByLabelText('Confirm temporary password'), 'temp-pass-9');
    await user.click(screen.getByRole('button', { name: 'Set till password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The staff member must change it at next sign-in',
    );
  });
});
