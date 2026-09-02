import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import DashboardLayout from '@/layouts/DashboardLayout';
import { COUNTER_STORAGE_KEY, COUNTERS } from '@/libs/constants/counters.const';
import { MODULE_NAV_ITEMS, NAV_SECTIONS, ROUTES, STUB_PAGES } from '@/libs/constants/routes.const';
import { authReducer } from '@/store';

function renderDashboard(path = ROUTES.DASHBOARD, displayName = 'Chemist') {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'user-1',
          displayName,
          role: 'pharmacy_owner',
          tenantId: 'tenant-1',
        },
      },
    },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route path={ROUTES.DASHBOARD} element={<div>Counter overview</div>} />
                {STUB_PAGES.map((page) => (
                  <Route key={page.path} path={page.path} element={<div>{page.title} page</div>} />
                ))}
                <Route path={ROUTES.LOGIN} element={<div>Pharmacy sign in</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </Provider>,
    ),
  };
}

describe('dispensary counter rail', () => {
  it('shows the pharmacy name in the rail header', () => {
    renderDashboard();
    const rail = screen.getByRole('complementary', { name: 'Counter rail' });
    expect(within(rail).getByText('MedMate')).toBeInTheDocument();
    expect(within(rail).getByText('This pharmacy')).toBeInTheDocument();
  });

  it('lets the chemist pick a counter from the branch switcher', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /this counter/i }));
    await user.click(screen.getByRole('menuitemradio', { name: COUNTERS[1].name }));

    expect(screen.getByRole('button', { name: new RegExp(COUNTERS[1].name, 'i') })).toBeInTheDocument();
    expect(localStorage.getItem(COUNTER_STORAGE_KEY)).toBe(COUNTERS[1].id);
  });

  it('groups floor modules and marks the open one as current', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const nav = screen.getByRole('navigation', { name: 'On this floor' });

    for (const section of NAV_SECTIONS) {
      expect(within(nav).getByRole('button', { name: section.label })).toHaveAttribute('aria-expanded', 'true');
    }

    for (const item of MODULE_NAV_ITEMS) {
      const name = item.badge ? `${item.label}, ${item.badge.label}` : item.label;
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument();
    }

    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Orders, 1 held bill' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Prescriptions, 3 prescriptions waiting' })).toBeInTheDocument();

    await user.click(within(nav).getByRole('link', { name: 'Sales' }));
    expect(within(nav).getByRole('link', { name: 'Sales' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Sales page')).toBeInTheDocument();
  });

  it('can fold a section closed then open it again', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const nav = screen.getByRole('navigation', { name: 'On this floor' });
    const catalogue = within(nav).getByRole('button', { name: 'Catalogue' });

    await user.click(catalogue);
    expect(catalogue).toHaveAttribute('aria-expanded', 'false');
    expect(within(nav).queryByRole('link', { name: /self-order kiosk/i })).not.toBeInTheDocument();

    await user.click(catalogue);
    expect(catalogue).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getByRole('link', { name: /self-order kiosk/i })).toBeInTheDocument();
  });

  it('opens profile management and account settings from the footer dock', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /account for chemist/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }));
    expect(screen.getByRole('dialog', { name: 'Profile' })).toHaveTextContent('Chemist');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: /account for chemist/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Account settings' }));
    expect(screen.getByText('Settings page')).toBeInTheDocument();
  });

  it('signs the chemist out from the account footer', async () => {
    const user = userEvent.setup();
    const { store } = renderDashboard();

    await user.click(screen.getByRole('button', { name: /account for chemist/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(store.getState().auth.user).toBeNull();
  });
});
