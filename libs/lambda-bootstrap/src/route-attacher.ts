import type { Express, NextFunction, Request, Response } from 'express';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface EndpointDefinition {
  method: HttpMethod;
  path: string;
  operationId: string;
  successStatus?: number;
  responseType?: 'json' | 'raw';
}

export interface RawHttpBody {
  body: Buffer | string;
  contentType: string;
  filename?: string;
}

export type Parser<TInput> = (req: Request) => TInput | Promise<TInput>;
export type Validator<TInput> = (input: TInput) => TInput | Promise<TInput>;
export type Controller<TInput, TOutput> = (
  input: TInput,
  req: Request,
) => TOutput | Promise<TOutput>;
export type ResponseMetadataCustomization<TOutput> = (res: Response, output: TOutput) => void;

export type AttachedRoute = EndpointDefinition;

const attachedRoutes: AttachedRoute[] = [];

export function getAttachedRoutes(): readonly AttachedRoute[] {
  return attachedRoutes;
}

export function resetAttachedRoutes(): void {
  attachedRoutes.length = 0;
}

export function createRouteAttacher(app: Express) {
  return function attachRoute<TInput, TOutput>(
    endpoint: EndpointDefinition,
    parser: Parser<TInput>,
    validator: Validator<TInput>,
    controller: Controller<TInput, TOutput>,
    responseMetadataCustomization?: ResponseMetadataCustomization<TOutput>,
  ): void {
    attachedRoutes.push(endpoint);
    app[endpoint.method](
      endpoint.path,
      async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
          const parsed = await parser(req);
          const validated = await validator(parsed);
          const output = await controller(validated, req);
          res.status(endpoint.successStatus ?? 200);
          if (responseMetadataCustomization) {
            responseMetadataCustomization(res, output);
          }
          if (endpoint.responseType === 'raw') {
            const raw = output as RawHttpBody;
            res.setHeader('content-type', raw.contentType);
            if (raw.filename) {
              res.setHeader('content-disposition', `attachment; filename="${raw.filename}"`);
            }
            res.send(raw.body);
            return;
          }
          res.json(output);
        } catch (error) {
          next(error);
        }
      },
    );
  };
}
