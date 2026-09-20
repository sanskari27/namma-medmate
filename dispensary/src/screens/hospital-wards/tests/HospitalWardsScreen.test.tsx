import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalWardsScreen from '@/screens/hospital-wards/HospitalWardsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { HospitalWardOccupancy } from '@/services/hospital';

vi.mock('@/services/hospital', () => ({
  getHospitalWards: vi.fn(),
  createHospitalWard: vi.fn(),
  updateHospitalWard: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

import { createHospitalWard, getHospitalWards, updateHospitalWard } from '@/services/hospital';

const listMock = vi.mocked(getHospitalWards);
const createMock = vi.mocked(createHospitalWard);
const updateMock = vi.mocked(updateHospitalWard);

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

  it('success: shows KPI strip and bed map grouped by ward', async () => {
    listMock.mockResolvedValue(occupancy);
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
