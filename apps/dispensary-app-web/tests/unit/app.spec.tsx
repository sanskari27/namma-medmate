import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HomePage } from '../../src/pages/home-page.tsx';
import { AppProviders } from '../../src/app/providers/app-providers.tsx';
import {
  getAccessToken,
  getLocationId,
  setAccessToken,
  setLocationId,
} from '../../src/services/api/token.ts';
import { appConfig } from '../../src/config/app-config.ts';
import { AppRoutes } from '../../src/app/routes/app-routes.tsx';

describe('dispensary app', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the session heading and skip link', () => {
    render(
      <AppProviders>
        <HomePage />
      </AppProviders>,
    );
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('heading', { name: 'Session' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dispensary session' })).toBeInTheDocument();
  });

  it('exposes token helpers', () => {
    expect(getAccessToken()).toBeUndefined();
    setAccessToken('abc');
    expect(getAccessToken()).toBe('abc');
    expect(getAccessToken(null)).toBeUndefined();
    expect(getAccessToken({ getItem: () => null })).toBeUndefined();
    expect(getLocationId()).toBeUndefined();
    setLocationId('1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809');
    expect(getLocationId()).toBe('1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809');
    expect(getLocationId(null)).toBeUndefined();
    expect(appConfig.tokenStorageKey).toBe('namma.accessToken');
    expect(appConfig.locationStorageKey).toBe('namma.locationId');
  });

  it('renders app routes', () => {
    render(
      <AppProviders>
        <AppRoutes />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'Session' })).toBeInTheDocument();
  });

  it('renders the WhatsApp inbox on /whatsapp', () => {
    render(
      <AppProviders>
        <AppRoutes pathname="/whatsapp" />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'WhatsApp' })).toBeInTheDocument();
  });

  it('renders Free orders without a paywall', () => {
    render(
      <AppProviders>
        <AppRoutes pathname="/orders" />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View plans' })).not.toBeInTheDocument();
  });

  it('renders the Kiosk paywall on Free', () => {
    render(
      <AppProviders>
        <AppRoutes pathname="/kiosk" />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'Unlock Pro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View plans' })).toHaveAttribute(
      'href',
      '/subscription',
    );
  });

  it('renders inventory without a paywall', () => {
    render(
      <AppProviders>
        <AppRoutes pathname="/inventory" />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
  });

  it('renders reports paywall on Free', () => {
    render(
      <AppProviders>
        <AppRoutes pathname="/reports" />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'Unlock Growth' })).toBeInTheDocument();
  });

  it('renders the subscription stub', () => {
    render(
      <AppProviders>
        <AppRoutes pathname="/subscription" />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'Subscription' })).toBeInTheDocument();
  });

  it('renders the HQ master catalogue without the shop badge', async () => {
    render(
      <AppProviders>
        <AppRoutes pathname="/hq/master-catalogue" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Master catalogue' })).toBeInTheDocument();
    expect(screen.getAllByText('Platform HQ').length).toBeGreaterThan(0);
    expect(screen.queryByText('Dispensary')).not.toBeInTheDocument();
  });
});
