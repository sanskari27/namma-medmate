import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalDoctorsScreen from '@/screens/hospital-doctors/HospitalDoctorsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { HospitalDoctor } from '@/services/hospital';

vi.mock('@/services/hospital', () => ({
  getHospitalDoctors: vi.fn(),
  getHospitalDepartments: vi.fn(),
  createHospitalDoctor: vi.fn(),
  updateHospitalDoctor: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

import {
  createHospitalDoctor,
  getHospitalDepartments,
  getHospitalDoctors,
  updateHospitalDoctor,
} from '@/services/hospital';

const listMock = vi.mocked(getHospitalDoctors);
const departmentsMock = vi.mocked(getHospitalDepartments);
const createMock = vi.mocked(createHospitalDoctor);
const updateMock = vi.mocked(updateHospitalDoctor);

const doctors: HospitalDoctor[] = [
  {
    id: 'hd1',
    doctorId: 'doc1',
    name: 'Dr. Mehta',
    registrationNumber: 'KA-12345',
    phone: '9888000001',
    departmentId: null,
    departmentName: null,
    qualification: 'MBBS',
    specialty: 'Cardiology',
    gender: 'Male',
    experienceYears: 10,
    email: null,
    opdRoom: 'OPD-2',
    consultingDays: 'Mon,Wed',
    consultingHours: '10:00-13:00',
    consultationFeePaise: 50000,
    status: 'AVAILABLE',
    languages: 'English',
    notes: null,
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
        <HospitalDoctorsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('HospitalDoctorsScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    departmentsMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    departmentsMock.mockResolvedValue([]);
  });

  it('loading: waits for doctors', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading doctors');
  });

  it('empty: prompts to add the first doctor', async () => {
    listMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent('No hospital doctors yet');
  });

  it('validation: doctor name is required', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Add doctor' }));
    await user.click(screen.getByRole('button', { name: 'Save doctor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Doctor name and status are required');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('denied: staff cannot open doctor directory', async () => {
    listMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot manage the hospital doctor directory at this counter',
    );
  });

  it('conflict: registration already on counter book', async () => {
    listMock.mockResolvedValue([]);
    createMock.mockRejectedValue(new ApiError('Conflict', 409, 'REGISTRATION_TAKEN'));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Add doctor' }));
    await user.type(screen.getByLabelText('Full name'), 'Dr. Duplicate');
    await user.type(screen.getByLabelText('Medical registration no.'), 'KA-99999');
    await user.click(screen.getByRole('button', { name: 'Save doctor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That registration is already on the counter book',
    );
  });

  it('failure: cannot load doctors', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load doctors. Try again.');
  });

  it('success: create doctor with no-login copy and focus restore', async () => {
    listMock.mockResolvedValueOnce([]).mockResolvedValue(doctors);
    createMock.mockResolvedValue(doctors[0]);
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText('Staff-managed hospital directory — no portal login in Phase 1.')).toBeInTheDocument();
    await screen.findByRole('status');
    const addButton = screen.getByRole('button', { name: 'Add doctor' });
    await user.click(addButton);
    await user.type(screen.getByLabelText('Full name'), 'Dr. Mehta');
    await user.click(screen.getByRole('button', { name: 'Save doctor' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Doctor saved.');
    await waitFor(() => expect(addButton).toHaveFocus());
  });

  it('plan_limit: shows upgrade link without hospital module', async () => {
    renderPage([]);
    expect(await screen.findByRole('status')).toHaveTextContent('Hospital doctors are on the Pro plan');
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute('href', '/subscription');
    expect(listMock).not.toHaveBeenCalled();
  });
});
