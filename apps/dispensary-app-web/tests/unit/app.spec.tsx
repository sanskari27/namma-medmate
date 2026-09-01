import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../../src/pages/home-page.tsx';
import { AppProviders } from '../../src/app/providers/app-providers.tsx';
import {
  clearChemistSession,
  clearDeviceToken,
  getAccessToken,
  getDeviceToken,
  getLocationId,
  getStoredLoginId,
  navigateTo,
  persistChemistSession,
  setAccessToken,
  setLocationId,
} from '../../src/services/api/token.ts';
import { appConfig } from '../../src/config/app-config.ts';
import { AppRoutes } from '../../src/app/routes/app-routes.tsx';

describe('dispensary app', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the session heading and skip link when signed in', () => {
    setAccessToken('token');
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
    persistChemistSession({
      session_token: 'nm_sess_x',
      location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
      login_id: 'priya.cashier',
      device_token: 'nm_dev_x',
    });
    expect(getDeviceToken()).toBe('nm_dev_x');
    expect(getStoredLoginId()).toBe('priya.cashier');
    expect(getDeviceToken({ getItem: () => 'stored-device' })).toBe('stored-device');
    expect(getStoredLoginId({ getItem: () => 'stored-login' })).toBe('stored-login');
    clearDeviceToken();
    expect(getDeviceToken()).toBeUndefined();
    persistChemistSession({
      session_token: 'nm_sess_y',
      location_id: 'loc',
      login_id: 'priya.owner',
      device_token: null,
    });
    expect(getStoredLoginId()).toBe('priya.owner');
    expect(getDeviceToken(null)).toBeUndefined();
    expect(getStoredLoginId(null)).toBeUndefined();
    expect(appConfig.deviceStorageKey).toBe('namma.deviceToken');
    expect(appConfig.loginIdStorageKey).toBe('namma.loginId');
    clearChemistSession();
    expect(getAccessToken()).toBeUndefined();
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    navigateTo('/login');
    expect(assign).toHaveBeenCalledWith('/login');
    vi.unstubAllGlobals();
  });

  it('sends visitors without a session to login', () => {
    render(
      <AppProviders>
        <AppRoutes />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WhatsApp OTP' })).toBeInTheDocument();
  });

  it('opens PIN unlock when a device token is stored', async () => {
    persistChemistSession({
      session_token: 'nm_sess_x',
      location_id: 'loc',
      login_id: 'priya.cashier',
      device_token: 'nm_dev_x',
    });
    window.sessionStorage.clear();
    render(
      <AppProviders>
        <AppRoutes pathname="/login/pin" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Unlock this device' })).toBeInTheDocument();
  });

  it('hides PIN unlock when device storage is cleared', async () => {
    render(
      <AppProviders>
        <AppRoutes pathname="/login/pin" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders chemist login on /login and PIN unlock when only a device is stored', async () => {
    render(
      <AppProviders>
        <AppRoutes pathname="/login" />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    cleanup();
    persistChemistSession({
      session_token: 'nm_sess_x',
      location_id: 'loc',
      login_id: 'priya.cashier',
      device_token: 'nm_dev_x',
    });
    window.sessionStorage.clear();
    render(
      <AppProviders>
        <AppRoutes pathname="/" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Unlock this device' })).toBeInTheDocument();
  });

  it('clears the saved device when PIN unlock switches to password', async () => {
    persistChemistSession({
      session_token: 'nm_sess_x',
      location_id: 'loc',
      login_id: 'priya.cashier',
      device_token: 'nm_dev_x',
    });
    window.sessionStorage.clear();
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    render(
      <AppProviders>
        <AppRoutes pathname="/login/pin" />
      </AppProviders>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Use password or OTP instead' }));
    expect(getDeviceToken()).toBeUndefined();
    expect(getStoredLoginId()).toBeUndefined();
    expect(assign).toHaveBeenCalledWith('/login');
    vi.unstubAllGlobals();
  });

  it('renders home from the default route when signed in', async () => {
    setAccessToken('token');
    render(
      <AppProviders>
        <AppRoutes pathname="/" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Session' })).toBeInTheDocument();
  });

  it('renders the WhatsApp inbox on /whatsapp', async () => {
    setAccessToken('token');
    render(
      <AppProviders>
        <AppRoutes pathname="/whatsapp" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'WhatsApp' })).toBeInTheDocument();
  });

  it('renders Free orders without a paywall', async () => {
    setAccessToken('token');
    render(
      <AppProviders>
        <AppRoutes pathname="/orders" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Orders' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View plans' })).not.toBeInTheDocument();
  });

  it('renders the Kiosk paywall on Free', async () => {
    setAccessToken('token');
    render(
      <AppProviders>
        <AppRoutes pathname="/kiosk" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Unlock Pro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View plans' })).toHaveAttribute(
      'href',
      '/subscription',
    );
  });

  it('renders inventory without a paywall', async () => {
    setAccessToken('token');
    render(
      <AppProviders>
        <AppRoutes pathname="/inventory" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
  });

  it('renders reports paywall on Free', async () => {
    setAccessToken('token');
    render(
      <AppProviders>
        <AppRoutes pathname="/reports" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Unlock Growth' })).toBeInTheDocument();
  });

  it('renders the subscription stub', async () => {
    setAccessToken('token');
    render(
      <AppProviders>
        <AppRoutes pathname="/subscription" />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Subscription' })).toBeInTheDocument();
  });

  it('renders the HQ master catalogue without the shop badge', async () => {
    setAccessToken('token');
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
