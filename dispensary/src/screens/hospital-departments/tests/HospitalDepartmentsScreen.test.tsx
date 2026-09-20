import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalDepartmentsScreen from '@/screens/hospital-departments/HospitalDepartmentsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { HospitalDepartment } from '@/services/hospital';

vi.mock('@/services/hospital', () => ({
  getHospitalDepartments: vi.fn(),
  getHospitalDoctors: vi.fn(),
  createHospitalDepartment: vi.fn(),
  updateHospitalDepartment: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

import {
  createHospitalDepartment,
  getHospitalDepartments,
  getHospitalDoctors,
  updateHospitalDepartment,
} from '@/services/hospital';

const listMock = vi.mocked(getHospitalDepartments);
const doctorsMock = vi.mocked(getHospitalDoctors);
const createMock = vi.mocked(createHospitalDepartment);
const updateMock = vi.mocked(updateHospitalDepartment);

const departments: HospitalDepartment[] = [
  {
    id: 'd1',
    name: 'General Medicine',
    type: 'OPD',
    headDoctorId: null,
    headDoctorName: null,
    version: 1,
  },
];

function renderPage(modules: string[] = ['HOSPITAL']) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Varshmaan',
          role: 'pharmacy_owner',
          tenantId: 't1',
          modules,
          pinSet: true,
          activeBranchId: 'b1',
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <HospitalDepartmentsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('HospitalDepartmentsScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    doctorsMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    doctorsMock.mockResolvedValue([]);
  });

  it('loading: waits for departments', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading departments');
  });

  it('empty: prompts to add the first department', async () => {
    listMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent('No departments yet');
  });

  it('validation: department name and type are required', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Add department' }));
    await user.click(screen.getByRole('button', { name: 'Save department' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Department name and type are required');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('denied: staff cannot open departments', async () => {
    listMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot manage hospital departments at this counter',
    );
  });

  it('conflict: stale update shows reload copy', async () => {
    listMock.mockResolvedValue(departments);
    renderPage();
    expect(await screen.findByText('General Medicine')).toBeInTheDocument();
    updateMock.mockRejectedValue(new ApiError('Conflict', 409, 'STALE_STATE'));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit department' }));
    await user.click(screen.getByRole('button', { name: 'Save department' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Someone else updated this department');
  });

  it('failure: cannot load departments', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load departments. Try again.');
  });

  it('success: create department and restore focus', async () => {
    listMock.mockResolvedValueOnce([]).mockResolvedValue(departments);
    createMock.mockResolvedValue(departments[0]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('status');
    const addButton = screen.getByRole('button', { name: 'Add department' });
    await user.click(addButton);
    await user.type(screen.getByLabelText('Department name'), 'General Medicine');
    await user.click(screen.getByRole('button', { name: 'Save department' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Department saved.');
    await waitFor(() => expect(addButton).toHaveFocus());
  });

  it('plan_limit: shows upgrade link without hospital module', async () => {
    renderPage([]);
    expect(await screen.findByRole('status')).toHaveTextContent('Hospital departments are on the Pro plan');
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute('href', '/subscription');
    expect(listMock).not.toHaveBeenCalled();
  });
});
