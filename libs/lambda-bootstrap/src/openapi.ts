import type { Express } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';

export function mountOpenApi(app: Express, apiSpecPath: string): void {
  app.use(
    OpenApiValidator.middleware({
      apiSpec: apiSpecPath,
      validateRequests: true,
      validateResponses: true,
      ignorePaths: /\/health$/,
    }),
  );
}
