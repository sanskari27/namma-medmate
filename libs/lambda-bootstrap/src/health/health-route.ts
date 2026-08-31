import type { Express } from 'express';

export const HEALTH_PATH = '/health';

export function mountHealthRoute(app: Express): void {
  app.get(HEALTH_PATH, (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });
}
