import type { StoryScenario } from '@namma-medmate/story-generator';

export const authScenarios = [
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
    description: 'Valid session identity from GET /auth/session.',
    props: { title: 'Dispensary session', skipQuery: true },
    preloadedState: { session: { status: 'authenticated', sub: 'user-1' } },
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
