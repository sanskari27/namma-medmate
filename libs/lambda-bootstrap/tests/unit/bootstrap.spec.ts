import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ValidationError } from '@namma-medmate/error-handling';
import {
  createExpressApp,
  createLambdaHandler,
  getAttachedRoutes,
  listenLocal,
  parseAuthorizationHeader,
  resetAttachedRoutes,
  resolveCorsOrigins,
  validateAuthorizationHeader,
} from '../../src/index.ts';

const fixtureSpec = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/openapi.yaml');

describe('lambda-bootstrap', () => {
  beforeEach(() => {
    resetAttachedRoutes();
  });

  it('auto-mounts /health', async () => {
    const { complete } = createExpressApp({
      serviceName: 'auth-api',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
    });
    const response = await request(complete()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('attaches a route using the five-argument contract', async () => {
    const boot = createExpressApp({
      serviceName: 'auth-api',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
    });
    boot.attachRoute(
      { method: 'get', path: '/ping', operationId: 'ping' },
      () => ({ ok: true }),
      (input) => input,
      (input) => input,
      (res) => {
        res.setHeader('x-custom', '1');
      },
    );
    const response = await request(boot.complete()).get('/ping');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(response.headers['x-custom']).toBe('1');
    expect(getAttachedRoutes()).toHaveLength(1);
  });

  it('stores the raw JSON body for webhook signature checks', async () => {
    const boot = createExpressApp({
      serviceName: 'whatsapp-api',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
    });
    boot.attachRoute(
      { method: 'post', path: '/hook', operationId: 'hook' },
      (req) => ({ raw: (req as typeof req & { rawBody?: string }).rawBody }),
      (input) => input,
      (input) => input,
    );
    const response = await request(boot.complete()).post('/hook').send({ id: 'wamid.1' });
    expect(response.status).toBe(200);
    expect(response.body.raw).toContain('wamid.1');
  });

  it('lets response customization override the default success status', async () => {
    const boot = createExpressApp({
      serviceName: 'whatsapp-api',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
    });
    boot.attachRoute(
      { method: 'post', path: '/send', operationId: 'send', successStatus: 202 },
      () => ({ deduped: true }),
      (input) => input,
      (input) => input,
      (res, output) => {
        if (output.deduped) {
          res.status(200);
        }
      },
    );
    const response = await request(boot.complete()).post('/send');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deduped: true });
  });

  it('honors EndpointDefinition successStatus for creates', async () => {
    const boot = createExpressApp({
      serviceName: 'tenancy-api',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
    });
    boot.attachRoute(
      { method: 'post', path: '/items', operationId: 'createItem', successStatus: 201 },
      () => ({ id: '1' }),
      (input) => input,
      (input) => input,
    );
    const response = await request(boot.complete()).post('/items');
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: '1' });
  });

  it('forwards handler errors to the error mapper', async () => {
    const boot = createExpressApp({
      serviceName: 'auth-api',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
    });
    boot.attachRoute(
      { method: 'get', path: '/fail', operationId: 'fail' },
      () => ({}),
      () => {
        throw new ValidationError('bad payload');
      },
      () => ({}),
    );
    const response = await request(boot.complete()).get('/fail');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs 500s from unexpected errors and honors request ids', async () => {
    const error = vi.fn();
    const boot = createExpressApp({
      serviceName: 'auth-api',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error, child: vi.fn() },
    });
    boot.attachRoute(
      { method: 'post', path: '/boom', operationId: 'boom' },
      async () => {
        throw new Error('explode');
      },
      (input) => input,
      (input) => input,
    );
    const response = await request(boot.complete())
      .post('/boom')
      .set('x-request-id', 'req-1')
      .set('x-correlation-id', 'corr-1')
      .send({ hello: true });
    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalled();
  });

  it('maps non-error throws as unknown 500s', async () => {
    const error = vi.fn();
    const boot = createExpressApp({
      serviceName: 'auth-api',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error, child: vi.fn() },
    });
    boot.attachRoute(
      { method: 'get', path: '/unknown', operationId: 'unknown' },
      async () => {
        throw 'nope';
      },
      (input) => input,
      (input) => input,
    );
    const response = await request(boot.complete()).get('/unknown');
    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalledWith('request.failed', { err: 'unknown' });
  });

  it('creates a default logger when none is provided', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { complete } = createExpressApp({ serviceName: 'auth-api', logLevel: 'info' });
    await request(complete()).get('/health');
    write.mockRestore();
  });

  it('mounts OpenAPI validation from a module spec', async () => {
    const boot = createExpressApp({
      serviceName: 'auth-api',
      apiSpecPath: fixtureSpec,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
    });
    boot.attachRoute(
      { method: 'get', path: '/auth/ping', operationId: 'ping' },
      () => ({ ok: true }),
      (input) => input,
      (input) => input,
    );
    const app = boot.complete();
    const invalid = await request(app).get('/auth/ping');
    expect(invalid.status).toBe(400);
    const valid = await request(app).get('/auth/ping').query({ q: '1' });
    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({ ok: true });
  });

  it('parses and validates bearer authorization headers', () => {
    expect(
      parseAuthorizationHeader({
        header: (name: string) => (name === 'Authorization' ? 'Bearer a.b.c' : undefined),
      } as never),
    ).toEqual({ authorization: 'Bearer a.b.c' });
    expect(
      parseAuthorizationHeader({
        header: () => undefined,
      } as never),
    ).toEqual({ authorization: undefined });
    expect(() => validateAuthorizationHeader({})).toThrow(ValidationError);
    expect(validateAuthorizationHeader({ authorization: 'Bearer token' }).authorization).toBe(
      'Bearer token',
    );
  });

  it('creates a lambda handler and local listener', () => {
    const handler = createLambdaHandler(express());
    expect(typeof handler).toBe('function');

    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const listen = vi.fn((_port: number, cb: () => void) => {
      cb();
      return { close: vi.fn() };
    });
    listenLocal({ listen } as never, 3001, 'auth-api');
    expect(listen).toHaveBeenCalledWith(3001, expect.any(Function));
    expect(write).toHaveBeenCalledWith('auth-api listening on 3001\n');
    write.mockRestore();
  });

  it('allows configured CORS origins and answers preflight', async () => {
    const { complete } = createExpressApp({
      serviceName: 'auth-api',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
    });
    const app = complete();
    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const denied = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();

    const preflight = await request(app).options('/health').set('Origin', 'http://localhost:5173');
    expect(preflight.status).toBe(204);
  });

  it('appends extra CORS origins from the environment', () => {
    expect(resolveCorsOrigins({ CORS_ORIGINS: ' https://extra.example , ' })).toContain(
      'https://extra.example',
    );
    expect(resolveCorsOrigins({})).not.toContain('https://extra.example');
  });
});
