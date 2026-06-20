export enum ErrorCode {
  ERR_SESSION_NOT_FOUND = "ERR_SESSION_NOT_FOUND",
  ERR_OUT_OF_SCOPE = "ERR_OUT_OF_SCOPE",
  ERR_CIRCUIT_BREAKER = "ERR_CIRCUIT_BREAKER",
  ERR_LOOP_DETECTED = "ERR_LOOP_DETECTED",
  ERR_COMMAND_INJECTION = "ERR_COMMAND_INJECTION",
  ERR_TASK_NOT_FOUND = "ERR_TASK_NOT_FOUND",
  ERR_VERIFY_FAILED = "ERR_VERIFY_FAILED",
  ERR_PARALLEL_CONFLICT = "ERR_PARALLEL_CONFLICT"
}

export interface HarnessError {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
}

export function createError(code: ErrorCode, message: string, details?: any): HarnessError {
  return {
    error: {
      code,
      message,
      details,
    },
  };
}
