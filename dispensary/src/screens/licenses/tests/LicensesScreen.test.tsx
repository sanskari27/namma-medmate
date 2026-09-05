import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LicensesScreen from '@/screens/licenses/LicensesScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { ComplianceLicense } from '@/services/licenses';

vi.mock('@/services/licenses', async () => {
  const axios = await import('@/services/axios');
  return {
    listLicenses: vi.fn(),
    listDueLicenses: vi.fn(),
    createLicense: vi.fn(),
    renewLicense: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/branches', () => ({
  listBranches: vi.fn(async () => []),
}));

vi.mock('@/services/staff', () => ({
  listStaff: vi.fn(async () => []),
}));

import { createLicense, listLicenses, renewLicense } from '@/services/licenses';

const listMock = vi.mocked(listLicenses);
const createMock = vi.mocked(createLicense);
const renewMock = vi.mocked(renewLicense);

const sample: ComplianceLicense = {
  id: 'lic-1',
  tenantId: 't1',
  branchId: null,
  staffUserId: null,
  docType: 'DRUG_LICENSE',
  scope: 'TENANT',
  licenseNumber: 'KA-DL-100',
  issuedOn: '2025-09-01',
  expiresOn: '2026-09-20',
  currentEvidenceId: 'ev-1',
  version: 1,
  due: true,
  evidence: [
    {
      id: 'ev-1',
      licenseNumber: 'KA-DL-100',
      issuedOn: '2025-09-01',
      expiresOn: '2026-09-20',
      contentType: 'application/pdf',
      byteSize: 12,
      uploadedAt: '2026-09-05T00:00:00Z',
    },
  ],
};

function renderPage(role = 'pharmacy_owner') {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role,
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
          modules: ['STAFF'],
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <LicensesScreen />
      </MemoryRouter>
    </Provider>,
  );
}

function pdfFile(): File {
  return new File(['%PDF-1.4'], 'licence.pdf', { type: 'application/pdf' });
}

describe('pharmacy licences', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    renewMock.mockReset();
  });

  it('loading: waits for licences', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading licences for this pharmacy…')).toBeInTheDocument();
  });

  it('empty: no licences on file', async () => {
    listMock.mockResolvedValue({ items: [] });
    renderPage();
    expect(
      await screen.findByText(
        'No licences on file. File the drug licence, GST, FSSAI, or a pharmacist registration.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Licences' })).toBeInTheDocument();
  });

  it('denied: staff cannot file licences', () => {
    renderPage('pharmacy_staff');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only the owner can file licences at this counter. Ask the owner if a paper is due.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: number dates and evidence before save', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [] });
    renderPage();
    await screen.findByRole('heading', { name: 'Licences' });
    await user.click(screen.getByRole('button', { name: 'File a licence' }));
    await user.click(screen.getByRole('button', { name: 'File this licence' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Number, issue date, expiry, and an evidence file are needed before filing.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: duplicate paper already on file', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [] });
    createMock.mockRejectedValue(new ApiError('taken', 409, 'CONFLICT'));
    renderPage();
    await screen.findByRole('heading', { name: 'Licences' });
    await user.click(screen.getByRole('button', { name: 'File a licence' }));
    fireEvent.change(screen.getByLabelText('Licence number'), { target: { value: 'KA-DL-100' } });
    fireEvent.change(screen.getByLabelText('Issued on'), { target: { value: '2025-09-01' } });
    fireEvent.change(screen.getByLabelText('Expires on'), { target: { value: '2027-09-01' } });
    fireEvent.change(screen.getByLabelText('Current paper'), { target: { files: [pdfFile()] } });
    await user.click(screen.getByRole('button', { name: 'File this licence' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'That paper is already on file for this outlet or chemist.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load licences. Check the connection and try again.',
    );
  });

  it('success: file a drug licence', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce({ items: [] }).mockResolvedValue({ items: [sample] });
    createMock.mockResolvedValue(sample);
    renderPage();
    await screen.findByRole('heading', { name: 'Licences' });
    await user.click(screen.getByRole('button', { name: 'File a licence' }));
    fireEvent.change(screen.getByLabelText('Licence number'), { target: { value: 'KA-DL-100' } });
    fireEvent.change(screen.getByLabelText('Issued on'), { target: { value: '2025-09-01' } });
    fireEvent.change(screen.getByLabelText('Expires on'), { target: { value: '2027-09-01' } });
    fireEvent.change(screen.getByLabelText('Current paper'), { target: { files: [pdfFile()] } });
    await user.click(screen.getByRole('button', { name: 'File this licence' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Licence filed.');
    expect(screen.getByText('KA-DL-100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'File a licence' })).toHaveFocus();
  });
});
