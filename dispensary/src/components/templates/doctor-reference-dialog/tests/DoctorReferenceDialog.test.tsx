import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DoctorReferenceDialog } from '@/components/templates/doctor-reference-dialog/DoctorReferenceDialog';
import { ApiError } from '@/services/axios';

vi.mock('@/services/doctors', async () => {
  const axios = await import('@/services/axios');
  return {
    createDoctor: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { createDoctor } from '@/services/doctors';

const createMock = vi.mocked(createDoctor);

describe('DoctorReferenceDialog', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('validation: name required', async () => {
    const user = userEvent.setup();
    render(<DoctorReferenceDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Save doctor' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Name is required for a doctor reference.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('loading: shows saving status while request is in flight', async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: {
      id: string;
      tenantId: string;
      name: string;
      registrationNumber: string | null;
      phone: string | null;
      notes: string | null;
      createdAt: string;
      updatedAt: string;
    }) => void = () => undefined;
    createMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );

    render(<DoctorReferenceDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Dr. Loading');
    await user.click(screen.getByRole('button', { name: 'Save doctor' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Saving doctor reference…');
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();

    resolveCreate({
      id: 'd1',
      tenantId: 't1',
      name: 'Dr. Loading',
      registrationNumber: null,
      phone: null,
      notes: null,
      createdAt: '2026-09-04T00:00:00Z',
      updatedAt: '2026-09-04T00:00:00Z',
    });
    await waitFor(() => expect(createMock).toHaveBeenCalled());
  });

  it('denied: CRM forbidden', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    render(<DoctorReferenceDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Dr. Denied');
    await user.click(screen.getByRole('button', { name: 'Save doctor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This till cannot manage doctor references.',
    );
  });

  it('failure: network error on save', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new Error('network'));
    render(<DoctorReferenceDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Dr. Fail');
    await user.click(screen.getByRole('button', { name: 'Save doctor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save the doctor. Try again.',
    );
  });

  it('conflict: registration taken', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError('taken', 409, 'REGISTRATION_TAKEN'));
    render(<DoctorReferenceDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Dr. Dup');
    await user.type(screen.getByLabelText('Registration'), 'DUP-1');
    await user.click(screen.getByRole('button', { name: 'Save doctor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That registration number is already on file.',
    );
  });

  it('success: saves and restores focus', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();
    const onCloseFocus = vi.fn();
    createMock.mockResolvedValue({
      id: 'd2',
      tenantId: 't1',
      name: 'Dr. Rao',
      registrationNumber: 'KA-9',
      phone: null,
      notes: null,
      createdAt: '2026-09-04T00:00:00Z',
      updatedAt: '2026-09-04T00:00:00Z',
    });

    render(
      <DoctorReferenceDialog
        open
        onOpenChange={onOpenChange}
        onSaved={onSaved}
        onCloseFocus={onCloseFocus}
      />,
    );
    await user.type(screen.getByLabelText('Name'), 'Dr. Rao');
    await user.click(screen.getByRole('button', { name: 'Save doctor' }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onCloseFocus).toHaveBeenCalled();
    });
  });

  it('cancel restores focus', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onCloseFocus = vi.fn();
    render(
      <DoctorReferenceDialog
        open
        onOpenChange={onOpenChange}
        onSaved={vi.fn()}
        onCloseFocus={onCloseFocus}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCloseFocus).toHaveBeenCalled();
  });
});
