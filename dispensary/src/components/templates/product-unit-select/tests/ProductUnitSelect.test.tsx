import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductUnitSelect } from '../ProductUnitSelect';

describe('ProductUnitSelect', () => {
  it('changes unit for PO/GRN/POS reuse', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ProductUnitSelect
        id="unit"
        label="Sale unit"
        value="strip"
        options={['Tablet', 'strip', 'box']}
        onChange={onChange}
        hint="= 10 Tablet"
      />,
    );
    expect(screen.getByText('= 10 Tablet')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Sale unit'), 'box');
    expect(onChange).toHaveBeenCalledWith('box');
  });
});
