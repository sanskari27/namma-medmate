/**
 * Route paths — the single source of truth for navigation.
 *
 * Screens never hard-code a path; they import `routes` from here. When the
 * backend lands, the same map drives the deep links.
 */

export const routes = {
  /* onboarding */
  splash: '/',
  login: '/login',
  otp: '/otp',
  consent: '/consent',
  location: '/location',

  /* app */
  home: '/home',
  search: '/search',
  cart: '/cart',
  orders: '/orders',
  prescriptions: '/prescriptions',
  consult: '/consult',
  account: '/account',
  notifications: '/notifications',
  help: '/help',
  offers: '/offers',
  pharmacies: '/pharmacies',
  uploadPrescription: '/upload-rx',
  schedule: '/schedule',
  terms: '/legal/terms',
  privacy: '/legal/privacy',

  /* parameterised */
  category: (id: string) => `/category/${id}`,
  product: (id: string) => `/product/${id}`,
  pharmacy: (id: string) => `/pharmacy/${id}`,
} as const;

export type RoutePath = (typeof routes)[keyof typeof routes];
