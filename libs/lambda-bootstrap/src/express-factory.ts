import express, { type Express } from 'express';
import { createLogger, type LogLevel, type Logger } from '@namma-medmate/logger';
import { mountHealthRoute } from './health/health-route.ts';
import { createCorsMiddleware } from './middleware/cors.ts';
import { createErrorHandler } from './middleware/error-handler.ts';
import { createRequestContextMiddleware } from './middleware/request-context.ts';
import { createRequestLogger } from './middleware/request-logger.ts';
import { mountOpenApi } from './openapi.ts';
import { createRouteAttacher } from './route-attacher.ts';

export interface BootstrapOptions {
  serviceName: string;
  logLevel?: LogLevel;
  logger?: Logger;
  apiSpecPath?: string;
}

export interface BootstrappedApp {
  app: Express;
  logger: Logger;
  attachRoute: ReturnType<typeof createRouteAttacher>;
  complete: () => Express;
}

export function createExpressApp(options: BootstrapOptions): BootstrappedApp {
  const logger =
    options.logger ?? createLogger({ serviceName: options.serviceName, level: options.logLevel });
  const app = express();
  app.disable('x-powered-by');
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '1mb' }));
  app.use(createRequestContextMiddleware(options.serviceName));
  app.use(createRequestLogger(logger));
  mountHealthRoute(app);
  if (options.apiSpecPath) {
    mountOpenApi(app, options.apiSpecPath);
  }

  return {
    app,
    logger,
    attachRoute: createRouteAttacher(app),
    complete() {
      app.use(createErrorHandler(logger));
      return app;
    },
  };
}
