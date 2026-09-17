import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PosDueRefills } from '@/screens/pos/components/pos-due-refills';

vi.mock('@/services/customerRefills', async () => {
  const axios = await import('@/services/axios');
  return {
    listDueRefills: vi.fn(),
    formatDueDate: (isoDate: string) => isoDate,
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { listDueRefills } from '@/services/customerRefills';

const listDueMock = vi.mocked(listDueRefills);

describe('POS due refills strip', () => {
  beforeEach(() => {
    listDueMock.mockReset();
  });

  it('empty: stays quiet when nothing is due', async () => {
    listDueMock.mockResolvedValue([]);
    render(<PosDueRefills />);
    await waitFor(() => expect(listDueMock).toHaveBeenCalled());
    expect(screen.queryByLabelText('Due refills')).not.toBeInTheDocument();
  });

  it('success: shows due patients on the till cart', async () => {
    listDueMock.mockResolvedValue([
      {
        refillId: 'r1',
        customerId: 'c1',
        customerName: 'Ravi Kumar',
        customerPhone: '9876500001',
        medicineName: 'Metformin 500',
        intervalDays: 30,
        nextDueOn: '2026-09-17',
        version: 0,
      },
    ]);
    render(<PosDueRefills />);
    expect(await screen.findByLabelText('Due refills')).toHaveTextContent('Metformin 500');
    expect(screen.getByText(/Ravi Kumar/)).toBeInTheDocument();
  });
});
