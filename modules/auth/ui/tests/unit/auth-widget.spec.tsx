import { Provider } from 'react-redux';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthWidget, createAuthStore } from '../../src/index.ts';
import { resetSession } from '../../src/store/slices/session-slice.ts';
import { authApi } from '../../src/store/api/auth-api.ts';

function renderWidget(
  fetchImpl: typeof fetch,
  preloadedState?: {
    session?: {
      status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
      sub?: string;
      message?: string;
    };
  },
  skipQuery = false,
) {
  const store = createAuthStore(
    { baseUrl: 'http://localhost:3001', getAccessToken: () => 'token', fetchImpl },
    preloadedState,
  );
  return {
    store,
    ...render(
      <Provider store={store}>
        <AuthWidget skipQuery={skipQuery} />
      </Provider>,
    ),
  };
}

describe('AuthWidget', () => {
  afterEach(() => {
    cleanup();
  });
  it('shows an authenticated session', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { authenticated: true, sub: 'user-1' } }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    renderWidget(fetchImpl);
    expect(await screen.findByText('Signed in as user-1.')).toBeInTheDocument();
  });

  it('shows unauthenticated copy for 401 responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'nope' } }),
        {
          status: 401,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    renderWidget(fetchImpl);
    expect(await screen.findByText('Sign in to continue.')).toBeInTheDocument();
  });

  it('shows a service failure message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    renderWidget(fetchImpl);
    expect(await screen.findByText('Unable to verify your session.')).toBeInTheDocument();
  });

  it('uses default copy when session messages are missing', () => {
    const fetchImpl = vi.fn().mockImplementation(() => new Promise(() => undefined));
    renderWidget(fetchImpl, { session: { status: 'unauthenticated' } }, true);
    expect(screen.getByText('Sign in to continue.')).toBeInTheDocument();
  });

  it('uses default error copy and a custom title', () => {
    const fetchImpl = vi.fn().mockImplementation(() => new Promise(() => undefined));
    const store = createAuthStore(
      { baseUrl: 'http://localhost:3001', fetchImpl },
      { session: { status: 'error' } },
    );
    render(
      <Provider store={store}>
        <AuthWidget title="Pharmacy session" skipQuery />
      </Provider>,
    );
    expect(screen.getByRole('heading', { name: 'Pharmacy session' })).toBeInTheDocument();
    expect(screen.getByText('Unable to verify your session.')).toBeInTheDocument();
  });

  it('renders loading copy from preloaded state and supports reset', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => new Promise(() => undefined));
    const { store } = renderWidget(fetchImpl, { session: { status: 'loading' } }, true);
    expect(screen.getByText('Checking your session.')).toBeInTheDocument();
    store.dispatch(resetSession());
    await waitFor(() => {
      expect(store.getState().session.status).toBe('idle');
    });
    store.dispatch(authApi.util.resetApiState());
  });

  it('treats a rejected fetch as an error session', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    renderWidget(fetchImpl);
    expect(await screen.findByText('Unable to verify your session.')).toBeInTheDocument();
  });
});
