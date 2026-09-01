import type { StoryScenario } from '@namma-medmate/story-generator';

export const authWidgetScenarios = [
  {
    id: 'loading',
    title: 'Loading',
    description: 'Session lookup in progress.',
    props: { title: 'Dispensary session', skipQuery: true },
    preloadedState: { session: { status: 'loading' } },
  },
  {
    id: 'authenticated',
    title: 'Authenticated',
    description: 'Valid chemist session with logout.',
    props: { title: 'Dispensary session', skipQuery: true },
    preloadedState: {
      session: {
        status: 'authenticated',
        sub: 'user-1',
        loginId: 'priya.cashier',
        role: 'Cashier',
      },
    },
  },
  {
    id: 'unauthenticated',
    title: 'Unauthenticated',
    description: 'Missing or invalid access token.',
    props: { title: 'Dispensary session', skipQuery: true },
    preloadedState: {
      session: { status: 'unauthenticated', message: 'Sign in to continue.' },
    },
  },
  {
    id: 'failure',
    title: 'Service failure',
    description: 'Auth API is unavailable.',
    props: { title: 'Dispensary session', skipQuery: true },
    preloadedState: {
      session: { status: 'error', message: 'Unable to verify your session.' },
    },
  },
] as const satisfies readonly StoryScenario[];

export const loginPageScenarios = [
  {
    id: 'both-methods',
    title: 'Both methods',
    description: 'Password and WhatsApp OTP are both available.',
    props: { passwordEnabled: true, otpEnabled: true },
  },
  {
    id: 'otp-only',
    title: 'OTP only',
    description: 'Password is disabled; WhatsApp OTP is the only path.',
    props: { passwordEnabled: false, otpEnabled: true },
  },
  {
    id: 'lockout',
    title: 'Lockout',
    description: 'Account locked after five failed attempts.',
    props: {
      passwordEnabled: true,
      otpEnabled: true,
      errorCode: 'ACCOUNT_LOCKED',
      lockedUntil: '2026-08-31T16:15:00.000Z',
    },
  },
  {
    id: 'undeliverable',
    title: 'Undeliverable OTP',
    description: 'WhatsApp could not deliver the login OTP.',
    props: {
      passwordEnabled: true,
      otpEnabled: true,
      errorCode: 'WHATSAPP_OTP_UNDELIVERABLE',
    },
  },
] as const satisfies readonly StoryScenario[];

export const pinUnlockScenarios = [
  {
    id: 'pin-unlock',
    title: 'PIN unlock',
    description: 'Saved device asks for the counter PIN.',
    props: { loginId: 'priya.cashier' },
  },
] as const satisfies readonly StoryScenario[];

export const authScenarios = authWidgetScenarios;
