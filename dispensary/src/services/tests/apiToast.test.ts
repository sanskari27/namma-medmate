import { afterEach, describe, expect, it, vi } from 'vitest';
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    promise: vi.fn((pending: Promise<unknown>) => pending),
  },
  Toaster: () => null,
}));

import { apiClient } from '@/services/axios';

const errorToast = vi.mocked(toast.error);
const promiseToast = vi.mocked(toast.promise);

function httpError(config: InternalAxiosRequestConfig, status: number, message: string, code: string) {
  return Promise.reject(
    new axios.AxiosError(
      `Request failed with status code ${status}`,
      axios.AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      {
        status,
        statusText: 'Error',
        headers: {},
        config,
        data: { success: false, data: null, message, code },
      },
    ),
  );
}

describe('api error toasts', () => {
  const originalAdapter = apiClient.defaults.adapter;

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    errorToast.mockClear();
    promiseToast.mockClear();
  });

  it('toasts the server message and still rejects', async () => {
    apiClient.defaults.adapter = (config) => httpError(config, 409, 'Batch is closed', 'CONFLICT');

    await expect(apiClient.get('/api/v1/batches')).rejects.toMatchObject({
      message: 'Batch is closed',
      status: 409,
      code: 'CONFLICT',
    });

    expect(errorToast).toHaveBeenCalledWith(
      'Batch is closed',
      expect.objectContaining({
        id: 'Batch is closed',
        ariaProps: { role: 'alert', 'aria-live': 'assertive' },
      }),
    );
  });

  it('toasts when the server is unreachable', async () => {
    apiClient.defaults.adapter = () =>
      Promise.reject(new axios.AxiosError('Network Error', axios.AxiosError.ERR_NETWORK));

    await expect(apiClient.get('/api/v1/batches')).rejects.toMatchObject({
      message: 'Could not reach the server',
      code: 'NETWORK',
    });
    expect(errorToast).toHaveBeenCalledWith(
      'Could not reach the server',
      expect.objectContaining({ id: 'Could not reach the server' }),
    );
  });

  it('uses toast.promise for an opted-in request and does not toast twice', async () => {
    apiClient.defaults.adapter = async (config) =>
      ({
        data: { success: false, data: null, message: 'Drawer is short', code: 'VALIDATION' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }) as AxiosResponse;

    let caught: unknown;
    try {
      await apiClient.post(
        '/api/v1/sales',
        {},
        { toast: { loading: 'Saving sale…', success: 'Sale saved' } },
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ message: 'Drawer is short', code: 'VALIDATION' });
    expect(errorToast).not.toHaveBeenCalled();
    expect(promiseToast).toHaveBeenCalledTimes(1);
    const messages = promiseToast.mock.calls[0][1];
    expect(typeof messages.error).toBe('function');
    if (typeof messages.error === 'function') {
      expect(messages.error(caught)).toBe('Drawer is short');
    }
  });
});
