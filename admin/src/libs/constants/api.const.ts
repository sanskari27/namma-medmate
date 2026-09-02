export const API = {
  HEALTH: '/api/v1/health',
  LOGIN: '/api/v1/auth/login',
  PIN: '/api/v1/auth/pin',
  PIN_UNLOCK: '/api/v1/auth/pin/unlock',
  PASSWORD: '/api/v1/auth/password',
  PASSWORD_RESET_REQUEST: '/api/v1/auth/password/reset-request',
  PASSWORD_RESET: '/api/v1/auth/password/reset',
  PASSWORD_ADMIN_RESET: '/api/v1/auth/password/admin-reset',
  NOTIFICATIONS: '/api/v1/notifications',
  NOTIFICATIONS_UNREAD: '/api/v1/notifications/unread-count',
} as const;
