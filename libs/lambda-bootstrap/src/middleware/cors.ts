import type { NextFunction, Request, Response } from 'express';

export const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'https://dispensary.staging.nammamedmate.com',
  'https://dispensary.nammamedmate.com',
];

export function resolveCorsOrigins(
  source: Record<string, string | undefined> = process.env,
): string[] {
  const extra = (source.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return [...DEFAULT_CORS_ORIGINS, ...extra];
}

export function createCorsMiddleware(allowedOrigins: string[] = resolveCorsOrigins()) {
  const allowed = new Set(allowedOrigins);
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.header('origin');
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, x-request-id, x-correlation-id',
      );
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
}
