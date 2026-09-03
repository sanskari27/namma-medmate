import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterScreen from '@/screens/register/RegisterScreen';
import { ApiError } from '@/services/axios';

vi.mock('@/services/tenant', async () => {
  const axios = await import('@/services/axios');
  return {
    registerPharmacy: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { registerPharmacy } from '@/services/tenant';

const registerMock = vi.mocked(registerPharmacy);

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/login" element={<div>Pharmacy sign in</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('dispensary pharmacy registration', () => {
  beforeEach(() => {
    registerMock.mockReset();
  });

  it('empty: shows the register form without a status', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: 'Register this pharmacy' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Pharmacy name')).toHaveValue('');
  });

  it('validation: empty submit asks for the required counter fields', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.click(screen.getByRole('button', { name: 'Register pharmacy' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter the pharmacy name, owner email, phone, and an eight-character password.',
    );
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the button while the counter waits', async () => {
    const user = userEvent.setup();
    registerMock.mockReturnValue(new Promise(() => undefined));
    renderRegister();
    await user.type(screen.getByLabelText('Pharmacy name'), 'Asha Chemist');
    await user.type(screen.getByLabelText('Owner email'), 'asha@chemist.local');
    await user.type(screen.getByLabelText('Phone'), '9876543210');
    await user.type(screen.getByLabelText('Password'), 'counter-pass-1');
    await user.click(screen.getByRole('button', { name: 'Register pharmacy' }));
    expect(screen.getByRole('button', { name: 'Opening pharmacy' })).toBeDisabled();
  });

  it('denied: 403 tells staff to ask the owner', async () => {
    const user = userEvent.setup();
    registerMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderRegister();
    await user.type(screen.getByLabelText('Pharmacy name'), 'Asha Chemist');
    await user.type(screen.getByLabelText('Owner email'), 'asha@chemist.local');
    await user.type(screen.getByLabelText('Phone'), '9876543210');
    await user.type(screen.getByLabelText('Password'), 'counter-pass-1');
    await user.click(screen.getByRole('button', { name: 'Register pharmacy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This counter cannot open a new pharmacy',
    );
  });

  it('conflict: 409 says the owner email is already taken', async () => {
    const user = userEvent.setup();
    registerMock.mockRejectedValue(new ApiError('Taken', 409, 'EMAIL_TAKEN'));
    renderRegister();
    await user.type(screen.getByLabelText('Pharmacy name'), 'Asha Chemist');
    await user.type(screen.getByLabelText('Owner email'), 'asha@chemist.local');
    await user.type(screen.getByLabelText('Phone'), '9876543210');
    await user.type(screen.getByLabelText('Password'), 'counter-pass-1');
    await user.click(screen.getByRole('button', { name: 'Register pharmacy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That owner email is already on a pharmacy',
    );
  });

  it('failure: network error asks to try again', async () => {
    const user = userEvent.setup();
    registerMock.mockRejectedValue(new Error('offline'));
    renderRegister();
    await user.type(screen.getByLabelText('Pharmacy name'), 'Asha Chemist');
    await user.type(screen.getByLabelText('Owner email'), 'asha@chemist.local');
    await user.type(screen.getByLabelText('Phone'), '9876543210');
    await user.type(screen.getByLabelText('Password'), 'counter-pass-1');
    await user.click(screen.getByRole('button', { name: 'Register pharmacy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('success: tells the owner to check email', async () => {
    const user = userEvent.setup();
    registerMock.mockResolvedValue({ tenantId: 't1', email: 'asha@chemist.local' });
    renderRegister();
    await user.type(screen.getByLabelText('Pharmacy name'), 'Asha Chemist');
    await user.type(screen.getByLabelText('Owner email'), 'asha@chemist.local');
    await user.type(screen.getByLabelText('Phone'), '9876543210');
    await user.type(screen.getByLabelText('Password'), 'counter-pass-1');
    await user.click(screen.getByRole('button', { name: 'Register pharmacy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Check the owner email for a verification link',
    );
    expect(registerMock).toHaveBeenCalledWith({
      businessName: 'Asha Chemist',
      email: 'asha@chemist.local',
      phone: '9876543210',
      password: 'counter-pass-1',
    });
  });
});
