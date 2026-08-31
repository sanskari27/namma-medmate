import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, StatusBanner } from '../../src/index.ts';

describe('shared-ui', () => {
  it('renders an accessible button', () => {
    render(
      <Button variant="secondary" className="extra">
        Continue
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveClass('extra');
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('uses alert for error banners and status otherwise', () => {
    const { rerender } = render(<StatusBanner tone="error">Failed</StatusBanner>);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    rerender(<StatusBanner tone="info">Working</StatusBanner>);
    expect(screen.getByRole('status')).toHaveTextContent('Working');
    rerender(<StatusBanner tone="success">Saved</StatusBanner>);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });
});
