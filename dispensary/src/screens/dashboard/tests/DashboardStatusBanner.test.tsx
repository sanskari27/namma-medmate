import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardStatusBanner } from '../components/dashboard-status-banner';

describe('DashboardStatusBanner', () => {
  it('renders an empty anchor when there is no status copy', () => {
    const { container } = render(
      <DashboardStatusBanner status={null} desk={null} statusId="dash-status" />,
    );
    expect(container.querySelector('#dash-status')).toHaveClass('min-h-0');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('omits refresh while loading or denied', () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <DashboardStatusBanner
        status="loading"
        desk={null}
        statusId="dash-status"
        onRefresh={onRefresh}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
    rerender(
      <DashboardStatusBanner
        status="denied"
        desk={null}
        statusId="dash-status"
        onRefresh={onRefresh}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
  });

  it('refresh stays disabled while busy', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(
      <DashboardStatusBanner
        status="failure"
        desk={null}
        statusId="dash-status"
        onRefresh={onRefresh}
        busy
      />,
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
