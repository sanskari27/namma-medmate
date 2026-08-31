export const Patterns = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  bearer: /^Bearer\s+[^\s]+$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;
