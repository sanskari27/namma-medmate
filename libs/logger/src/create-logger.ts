export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(message: string, extra?: Record<string, unknown>): void;
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface CreateLoggerOptions {
  serviceName: string;
  level?: LogLevel;
  write?: (line: string) => void;
  bindings?: Record<string, unknown>;
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const min = LEVELS[options.level ?? 'info'];
  const write =
    options.write ??
    ((line: string) => {
      process.stdout.write(`${line}\n`);
    });
  const bindings = options.bindings ?? {};

  const log = (level: LogLevel, message: string, extra?: Record<string, unknown>): void => {
    if (LEVELS[level] < min) {
      return;
    }
    write(
      JSON.stringify({
        level,
        msg: message,
        service: options.serviceName,
        time: new Date().toISOString(),
        ...bindings,
        ...extra,
      }),
    );
  };

  return {
    debug: (message, extra) => log('debug', message, extra),
    info: (message, extra) => log('info', message, extra),
    warn: (message, extra) => log('warn', message, extra),
    error: (message, extra) => log('error', message, extra),
    child(childBindings) {
      return createLogger({
        ...options,
        bindings: { ...bindings, ...childBindings },
      });
    },
  };
}
