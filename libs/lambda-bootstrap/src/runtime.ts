import serverlessExpress from '@codegenie/serverless-express';
import type { Handler } from 'aws-lambda';
import type { Express } from 'express';

export function createLambdaHandler(app: Express): Handler {
  return serverlessExpress({ app });
}

export function listenLocal(app: Express, port: number, serviceName: string) {
  return app.listen(port, () => {
    process.stdout.write(`${serviceName} listening on ${port}\n`);
  });
}
