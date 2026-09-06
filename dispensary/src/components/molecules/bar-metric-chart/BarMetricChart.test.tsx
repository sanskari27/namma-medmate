import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarMetricChart } from './BarMetricChart';

describe('BarMetricChart', () => {
  it('shows empty copy before a series', () => {
    render(<BarMetricChart data={[]} emptyLabel="No top packs in this window." />);
    expect(screen.getByRole('status')).toHaveTextContent('No top packs in this window.');
  });
});
