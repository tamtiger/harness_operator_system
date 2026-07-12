const SENSITIVE_PATTERNS = [
  /password[=:]\s*\S+/gi,
  /token[=:]\s*\S+/gi,
  /secret[=:]\s*\S+/gi,
  /api.?key[=:]\s*\S+/gi,
  /authorization:\s*\S+/gi,
  /bearer\s+\S+/gi,
];

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

function getConfigLevel(): LogLevel {
  const env = process.env.HARNESS_LOG_LEVEL?.toLowerCase();
  if (env === 'debug') return LogLevel.DEBUG;
  if (env === 'info') return LogLevel.INFO;
  if (env === 'warn') return LogLevel.WARN;
  if (env === 'error') return LogLevel.ERROR;
  return LogLevel.INFO;
}

function sanitize(obj: unknown): unknown {
  if (typeof obj === 'string') {
    let s = obj;
    for (const pattern of SENSITIVE_PATTERNS) {
      s = s.replace(pattern, (match) => {
        const idx = match.indexOf('=') !== -1 ? match.indexOf('=') + 1 : match.indexOf(':') + 1;
        if (idx <= 0) return match;
        return match.substring(0, idx) + '***';
      });
    }
    return s;
  }
  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_PATTERNS.some(p => p.test(key))) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    return sanitized;
  }
  return obj;
}

let currentLevel = getConfigLevel();

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  details?: unknown;
}

function log(level: LogLevel, message: string, details?: unknown): void {
  if (level < currentLevel) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LEVEL_NAMES[level],
    message,
    details: details ? sanitize(details) : undefined,
  };

  const line = JSON.stringify(entry);
  switch (level) {
    case LogLevel.ERROR:
      process.stderr.write(line + '\n');
      break;
    default:
      process.stdout.write(line + '\n');
      break;
  }
}

export const logger = {
  debug: (message: string, details?: unknown) => log(LogLevel.DEBUG, message, details),
  info: (message: string, details?: unknown) => log(LogLevel.INFO, message, details),
  warn: (message: string, details?: unknown) => log(LogLevel.WARN, message, details),
  error: (message: string, details?: unknown) => log(LogLevel.ERROR, message, details),
};
