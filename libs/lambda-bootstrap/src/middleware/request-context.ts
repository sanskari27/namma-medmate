import type { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from '@namma-medmate/context-propagation';
import { createId } from '@namma-medmate/id-generator';

export function createRequestContextMiddleware(serviceName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const requestIdHeader = req.header('x-request-id');
    const correlationIdHeader = req.header('x-correlation-id');
    const requestId = requestIdHeader && requestIdHeader.length > 0 ? requestIdHeader : createId();
    const correlationId =
      correlationIdHeader && correlationIdHeader.length > 0 ? correlationIdHeader : requestId;
    runWithRequestContext({ requestId, correlationId, serviceName }, () => next());
  };
}
