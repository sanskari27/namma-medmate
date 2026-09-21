import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalWardsScreen from '@/screens/hospital-wards/HospitalWardsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { HospitalAdmission, HospitalWardOccupancy } from '@/services/hospital';

vi.mock('@/services/hospital', () => ({
  getHospitalWards: vi.fn(),
  createHospitalWard: vi.fn(),
  updateHospitalWard: vi.fn(),
  listHospitalAdmissions: vi.fn(),
  getNextHospitalUhid: vi.fn(),
  admitHospitalPatient: vi.fn(),
  getHospitalDoctors: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

import {
  admitHospitalPatient,
  createHospitalWard,
  getHospitalDoctors,
  getHospitalWards,
  getNextHospitalUhid,
  listHospitalAdmissions,
  updateHospitalWard,
} from '@/services/hospital';

const listMock = vi.mocked(getHospitalWards);
const createMock = vi.mocked(createHospitalWard);
const updateMock = vi.mocked(updateHospitalWard);
const admissionsMock = vi.mocked(listHospitalAdmissions);
const nextUhidMock = vi.mocked(getNextHospitalUhid);
const admitMock = vi.mocked(admitHospitalPatient);
const doctorsMock = vi.mocked(getHospitalDoctors);

const admission: HospitalAdmission = {
  id: 'a1',
  uhid: 'UHID-00001',
  patientName: 'Ravi Kumar',
  phone: null,
  age: null,
  gender: null,
  customerId: null,
  wardId: 'w1',
  wardName: 'General A',
  bedId: 'b1',
  bedLabel: 'GA-1',
  attendingDoctorId: null,
  attendingDoctorName: null,
  diagnosis: 'Observation',
  payerType: 'SELF_PAY',
  insurerName: null,
  policyNumber: null,
  status: 'ACTIVE',
  admittedAt: '2026-09-20T10:00:00Z',
  version: 0,
};

const occupancy: HospitalWardOccupancy = {
  wardCount: 1,
  totalBeds: 2,
  occupiedBeds: 1,
  freeBeds: 1,
  occupancyPercent: 50,
  admittedCount: 1,
  wards: [
    {
      id: 'w1',
      name: 'General A',
      code: 'GA',
      floor: '2',
      category: 'GENERAL',
      capacity: 2,
      nurseInCharge: 'Sister Meena',
      version: 1,
      beds: [
        { id: 'b1', sequenceNo: 1, label: 'GA-1', occupancyStatus: 'OCCUPIED', version: 0 },
        { id: 'b2', sequenceNo: 2, label: 'GA-2', occupancyStatus: 'FREE', version: 0 },
      ],
    },
  ],
};

function renderPage(modules: string[] = ['HOSPITAL'], activeBranchId: string | null = 'b1') {
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
          activeBranchId,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <HospitalWardsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('HospitalWardsScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    admissionsMock.mockReset();
    nextUhidMock.mockReset();
    admitMock.mockReset();
    doctorsMock.mockReset();
    admissionsMock.mockResolvedValue([]);
    doctorsMock.mockResolvedValue([]);
    nextUhidMock.mockResolvedValue('UHID-00001');
  });

  it('loading: waits for ward occupancy', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading ward occupancy');
  });

  it('empty: prompts to add the first ward', async () => {
    listMock.mockResolvedValue({
      wardCount: 0,
      totalBeds: 0,
      occupiedBeds: 0,
      freeBeds: 0,
      occupancyPercent: 0,
      admittedCount: 0,
      wards: [],
    });
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent('No wards on this outlet yet');
  });

  it('validation: ward name and code are required', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      wardCount: 0,
      totalBeds: 0,
      occupiedBeds: 0,
      freeBeds: 0,
      occupancyPercent: 0,
      admittedCount: 0,
      wards: [],
    });
    renderPage();
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Manage wards' }));
    await user.click(screen.getByRole('button', { name: 'Save ward' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ward name, code, and capacity are required');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('denied: staff cannot open IPD wards', async () => {
    listMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot manage IPD wards at this counter',
    );
  });

  it('conflict: duplicate ward code', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      wardCount: 0,
      totalBeds: 0,
      occupiedBeds: 0,
      freeBeds: 0,
      occupancyPercent: 0,
      admittedCount: 0,
      wards: [],
    });
    createMock.mockRejectedValue(new ApiError('dup', 409, 'DUPLICATE_CODE'));
    renderPage();
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Manage wards' }));
    await user.type(screen.getByRole('textbox', { name: 'Ward name' }), 'General');
    await user.type(screen.getByRole('textbox', { name: 'Bed prefix / code' }), 'GEN');
    await user.click(screen.getByRole('button', { name: 'Save ward' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A ward with this code already exists');
  });

  it('failure: cannot load ward occupancy', async () => {
    listMock.mockRejectedValue(new ApiError('down', 500, 'INTERNAL_ERROR'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load ward occupancy. Try again.',
    );
  });

  it('empty admissions: shows admissions empty copy', async () => {
    listMock.mockResolvedValue(occupancy);
    admissionsMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('General A')).toBeInTheDocument();
    expect(
      screen.getByText('No admitted patients on this outlet yet. Select a free bed to admit.'),
    ).toBeInTheDocument();
  });

  it('success: shows KPI strip and bed map grouped by ward', async () => {
    listMock.mockResolvedValue(occupancy);
    admissionsMock.mockResolvedValue([admission]);
    renderPage();
    expect(await screen.findByText('General A')).toBeInTheDocument();
    expect(screen.getByText('50% occupied')).toBeInTheDocument();
    expect(screen.getByText('1 admitted')).toBeInTheDocument();
    const map = screen.getByRole('region', { name: 'Bed map' });
    expect(within(map).getByText('GA-1')).toBeInTheDocument();
    expect(within(map).getByText('Occupied')).toBeInTheDocument();
    expect(within(map).getByText('GA-2')).toBeInTheDocument();
    expect(within(map).getByText('Free')).toBeInTheDocument();
  });

  it('success: edits an existing ward', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce(occupancy).mockResolvedValueOnce({
      ...occupancy,
      wards: [{ ...occupancy.wards[0], name: 'General A — revised', nurseInCharge: 'Sister Anu' }],
    });
    updateMock.mockResolvedValue({
      ...occupancy.wards[0],
      name: 'General A — revised',
      nurseInCharge: 'Sister Anu',
      version: 2,
    });
    renderPage();
    await screen.findByText('General A');
    await user.click(screen.getByRole('button', { name: 'Edit ward' }));
    const nameField = screen.getByRole('textbox', { name: 'Ward name' });
    await user.clear(nameField);
    await user.type(nameField, 'General A — revised');
    const nurseField = screen.getByLabelText('Nurse in-charge');
    await user.clear(nurseField);
    await user.type(nurseField, 'Sister Anu');
    await user.click(screen.getByRole('button', { name: 'Save ward' }));
    expect(updateMock).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({
        name: 'General A — revised',
        nurseInCharge: 'Sister Anu',
        expectedVersion: 1,
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Ward saved.');
  });

  it('success: saves a new ward and restores focus', async () => {
    const user = userEvent.setup();
    listMock
      .mockResolvedValueOnce({
        wardCount: 0,
        totalBeds: 0,
        occupiedBeds: 0,
        freeBeds: 0,
        occupancyPercent: 0,
        admittedCount: 0,
        wards: [],
      })
      .mockResolvedValueOnce(occupancy);
    createMock.mockResolvedValue(occupancy.wards[0]);
    renderPage();
    await screen.findByRole('status');
    const manageButton = screen.getByRole('button', { name: 'Manage wards' });
    await user.click(manageButton);
    await user.type(screen.getByRole('textbox', { name: 'Ward name' }), 'General A');
    await user.type(screen.getByRole('textbox', { name: 'Bed prefix / code' }), 'GA');
    const saveButton = screen.getByRole('button', { name: 'Save ward' });
    await user.click(saveButton);
    expect(createMock).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('Ward saved.');
    await waitFor(() => expect(manageButton).toHaveFocus());
  });

  it('validation: admit requires patient name and UHID', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(occupancy);
    renderPage();
    await screen.findByText('General A');
    await user.click(screen.getByRole('button', { name: 'GA-2 Free' }));
    await user.click(screen.getByRole('button', { name: 'Admit to this bed' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Patient name and patient ID are required',
    );
    expect(admitMock).not.toHaveBeenCalled();
  });

  it('conflict: duplicate UHID shows taken copy', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(occupancy);
    admitMock.mockRejectedValue(new ApiError('taken', 409, 'UHID_TAKEN'));
    renderPage();
    await screen.findByText('General A');
    await user.click(screen.getByRole('button', { name: 'GA-2 Free' }));
    await user.type(screen.getByRole('textbox', { name: 'Patient name' }), 'Ravi Kumar');
    await user.click(screen.getByRole('button', { name: 'Admit to this bed' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This patient ID is already in use on this pharmacy',
    );
  });

  it('validation: TPA payer needs insurer and policy', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(occupancy);
    renderPage();
    await screen.findByText('General A');
    await user.click(screen.getByRole('button', { name: 'GA-2 Free' }));
    await user.type(screen.getByRole('textbox', { name: 'Patient name' }), 'TPA patient');
    await user.click(screen.getByRole('radio', { name: 'Insurance / TPA' }));
    await user.click(screen.getByRole('button', { name: 'Admit to this bed' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Insurance/TPA needs insurer name and policy number',
    );
    expect(admitMock).not.toHaveBeenCalled();
  });

  it('success: admits from free bed and shows occupied header', async () => {
    const user = userEvent.setup();
    listMock
      .mockResolvedValueOnce(occupancy)
      .mockResolvedValueOnce({
        ...occupancy,
        occupiedBeds: 2,
        freeBeds: 0,
        occupancyPercent: 100,
        admittedCount: 2,
        wards: [
          {
            ...occupancy.wards[0],
            beds: [
              occupancy.wards[0].beds[0],
              { ...occupancy.wards[0].beds[1], occupancyStatus: 'OCCUPIED' },
            ],
          },
        ],
      });
    admissionsMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        admission,
        {
          ...admission,
          id: 'a2',
          uhid: 'UHID-00002',
          bedId: 'b2',
          bedLabel: 'GA-2',
          patientName: 'Second',
        },
      ]);
    admitMock.mockResolvedValue({
      ...admission,
      id: 'a2',
      uhid: 'UHID-00001',
      bedId: 'b2',
      bedLabel: 'GA-2',
      patientName: 'Second',
    });
    renderPage();
    await screen.findByText('General A');
    const freeBed = screen.getByRole('button', { name: 'GA-2 Free' });
    await user.click(freeBed);
    await user.type(screen.getByRole('textbox', { name: 'Patient name' }), 'Second');
    const admitButton = screen.getByRole('button', { name: 'Admit to this bed' });
    await user.click(admitButton);
    expect(admitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Second',
        uhid: 'UHID-00001',
        wardId: 'w1',
        bedId: 'b2',
        payerType: 'SELF_PAY',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Patient admitted.');
    expect(screen.getByLabelText('Occupied bed')).toHaveTextContent('Second · UHID-00001');
  });

  it('success: occupied bed opens header from bed map', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(occupancy);
    admissionsMock.mockResolvedValue([admission]);
    renderPage();
    await screen.findByText('General A');
    await user.click(screen.getByRole('button', { name: 'GA-1 Occupied' }));
    expect(screen.getByLabelText('Occupied bed')).toHaveTextContent('Ravi Kumar · UHID-00001');
    expect(screen.getByText('Observation')).toBeInTheDocument();
  });

  it('success: occupied bed bills medicines on the till', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(occupancy);
    admissionsMock.mockResolvedValue([admission]);
    renderPage();
    await screen.findByText('General A');
    const occupied = screen.getByRole('button', { name: 'GA-1 Occupied' });
    await user.click(occupied);
    const bill = screen.getByRole('link', { name: 'Bill medicines' });
    expect(bill).toHaveAttribute('href', '/pos?saleSource=WARD&admissionId=a1');
    const discharge = screen.getByRole('link', { name: 'Final bill & discharge' });
    expect(discharge).toHaveAttribute('href', '/hospital-patients?admissionId=a1');
    bill.focus();
    expect(bill).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByLabelText('Occupied bed')).not.toBeInTheDocument();
    occupied.focus();
    expect(occupied).toHaveFocus();
  });

  it('plan_limit: shows upgrade link without hospital module', async () => {
    renderPage([]);
    expect(await screen.findByRole('alert')).toHaveTextContent('IPD wards are on the Pro plan');
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute(
      'href',
      '/subscription',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('no_branch: asks to select an outlet first', async () => {
    listMock.mockRejectedValue(new ApiError('branch', 422, 'NO_ACTIVE_BRANCH'));
    renderPage(['HOSPITAL'], null);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Select an outlet before opening IPD wards',
    );
  });
});
