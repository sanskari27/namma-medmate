import { describe, expect, it } from 'vitest';
import type { AgingReport } from '@/services/aging';
import { csvRows } from '../AgingScreen.utils';

const report: AgingReport = {
  asOf: '2026-09-06',
  scope: 'branch',
  branchId: 'b1',
  totalPaise: 12000,
  sourceBalancePaise: 12000,
  buckets: [
    { key: 'D0_30', label: '0–30', totalPaise: 4000 },
    { key: 'D31_60', label: '31–60', totalPaise: 8000 },
    { key: 'D61_90', label: '61–90', totalPaise: 0 },
    { key: 'D90_PLUS', label: '90+', totalPaise: 0 },
  ],
  items: [
    {
      partyId: 'c1',
      name: 'Khata Buyer',
      amountPaise: 12000,
      days: 45,
      ageOn: '2026-07-23',
      branchId: 'b1',
    },
  ],
};

describe('AgingScreen.utils csvRows', () => {
  it('exports FIFO columns from server buckets instead of parking the party total in oldestBucket', () => {
    const rows = csvRows(report);
    expect(rows[0]).toEqual(['FIFO remaining', 'D0_30', 'D31_60', 'D61_90', 'D90_PLUS']);
    expect(rows[1][0]).toBe('');
    expect(rows[1][1]).toContain('40');
    expect(rows[1][2]).toContain('80');
    expect(rows[1][3]).toMatch(/₹0/);
    expect(rows[1][4]).toMatch(/₹0/);
    const party = rows.find((row) => row[0] === 'Khata Buyer');
    expect(party).toEqual(['Khata Buyer', expect.stringContaining('120'), '45']);
    expect(party).not.toContain('31–60');
  });
});
