import { ILogger, LogLevel } from '@harness/contracts';

export class StructuredLogger implements ILogger {
  public readonly serviceName = 'Logger';

  public log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const output = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta || {})
    };
    if (level === 'error' || level === 'fatal') {
      console.error(JSON.stringify(output));
    } else {
      console.log(JSON.stringify(output));
    }
  }

  public trace(message: string, meta?: Record<string, any>): void {
    this.log('trace', message, meta);
  }

  public debug(message: string, meta?: Record<string, any>): void {
    this.log('debug', message, meta);
  }

  public info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  public warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  public error(message: string, error?: Error, meta?: Record<string, any>): void {
    const errorMeta = error ? { error: { message: error.message, stack: error.stack } } : {};
    this.log('error', message, { ...errorMeta, ...(meta || {}) });
  }

  public fatal(message: string, error?: Error, meta?: Record<string, any>): void {
    const errorMeta = error ? { error: { message: error.message, stack: error.stack } } : {};
    this.log('fatal', message, { ...errorMeta, ...(meta || {}) });
  }
}
