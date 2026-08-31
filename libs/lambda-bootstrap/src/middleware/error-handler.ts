import type { NextFunction, Request, Response } from 'express';
import { getHttpStatus, toErrorBody } from '@namma-medmate/error-handling';
import type { Logger } from '@namma-medmate/logger';

export function createErrorHandler(logger: Logger) {
  return (error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    const status = getHttpStatus(error);
    if (status >= 500) {
      logger.error('request.failed', { err: error instanceof Error ? error.message : 'unknown' });
    }
    res.status(status).json(toErrorBody(error));
  };
}
