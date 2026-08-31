import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '@namma-medmate/context-propagation';
import type { Logger } from '@namma-medmate/logger';

export function createRequestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const started = Date.now();
    res.on('finish', () => {
      const context = getRequestContext();
      logger.info('request.completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - started,
        requestId: context?.requestId,
      });
    });
    next();
  };
}
