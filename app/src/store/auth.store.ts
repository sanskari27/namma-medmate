import { create } from 'zustand';

import { authService } from '@/services';
import type { User } from '@/types';
import { normalizePhone } from '@/utils';

type AuthStatus = 'idle' | 'requesting' | 'verifying';

interface AuthState {
  user: User | null;
  token: string | null;
  /** The number currently being verified, shared with the OTP screen. */
  phone: string;
  status: AuthStatus;
  error: string | null;

  requestCode: (phone: string) => Promise<boolean>;
  verifyCode: (code: string) => Promise<boolean>;
  setAdultConfirmed: (confirmed: boolean) => void;
  clearError: () => void;
  signOut: () => void;
}

/**
 * Session state for the customer app.
 *
 * The token is issued by the API (mocked today) and will be persisted to
 * secure storage once the backend lands.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  phone: '',
  status: 'idle',
  error: null,

  async requestCode(phone) {
    const digits = normalizePhone(phone);
    set({ status: 'requesting', error: null, phone: digits });

    const result = await authService.requestOtp(digits);
    if (!result.ok) {
      set({ status: 'idle', error: result.error.message });
      return false;
    }

    set({ status: 'idle' });
    return true;
  },

  async verifyCode(code) {
    set({ status: 'verifying', error: null });

    const result = await authService.verifyOtp(get().phone, code);
    if (!result.ok) {
      set({ status: 'idle', error: result.error.message });
      return false;
    }

    set({
      status: 'idle',
      token: result.data.token,
      user: result.data.user,
    });
    return true;
  },

  setAdultConfirmed(confirmed) {
    const user = get().user;
    if (!user) return;
    set({ user: { ...user, isAdultConfirmed: confirmed } });
  },

  clearError() {
    set({ error: null });
  },

  signOut() {
    set({ user: null, token: null, phone: '', status: 'idle', error: null });
  },
}));
