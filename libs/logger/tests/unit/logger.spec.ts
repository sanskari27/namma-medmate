import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../src/index.ts';

describe('createLogger', () => {
  it('writes json lines at or above the configured level', () => {
    const write = vi.fn();
    const logger = createLogger({ serviceName: 'auth-api', level: 'info', write });
    logger.debug('hidden');
    logger.info('hello', { requestId: 'r1' });
    logger.warn('careful');
    logger.error('fail');
    expect(write).toHaveBeenCalledTimes(3);
    const firstCall = write.mock.calls[0]?.[0];
    expect(firstCall).toEqual(expect.any(String));
    const payload = JSON.parse(firstCall as string);
    expect(payload).toMatchObject({
      level: 'info',
      msg: 'hello',
      service: 'auth-api',
      requestId: 'r1',
    });
    expect(typeof payload.time).toBe('string');
  });

  it('child loggers inherit bindings', () => {
    const write = vi.fn();
    const child = createLogger({ serviceName: 'api', write }).child({ requestId: 'abc' });
    child.info('ok');
    const childCall = write.mock.calls[0]?.[0];
    expect(childCall).toEqual(expect.any(String));
    expect(JSON.parse(childCall as string).requestId).toBe('abc');
  });

  it('writes to stdout by default', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    createLogger({ serviceName: 'api', level: 'debug' }).debug('plain');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
