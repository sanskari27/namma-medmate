import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HomePage } from '../../src/pages/home-page.tsx';
import { AppProviders } from '../../src/app/providers/app-providers.tsx';
import { getAccessToken, setAccessToken } from '../../src/services/api/token.ts';
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
    expect(appConfig.tokenStorageKey).toBe('namma.accessToken');
  });

  it('renders app routes', () => {
    render(
      <AppProviders>
        <AppRoutes />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'Session' })).toBeInTheDocument();
  });
});
