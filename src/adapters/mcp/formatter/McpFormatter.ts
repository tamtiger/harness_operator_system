import { HarnessError } from '../../../shared/errors/HarnessError';

export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpCallToolResult {
  content: McpTextContent[];
  isError: boolean;
}

export class McpFormatter {
  toToolResult(data: unknown, isError = false): McpCallToolResult {
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError,
    };
  }

  toErrorResult(error: unknown): McpCallToolResult {
    if (error instanceof HarnessError) {
      return this.toToolResult({
        error: {
          code: error.code,
          domain: error.domain,
          message: error.message,
          retryable: error.retryable,
          details: error.details
        }
      }, true);
    }
    
    const err = error as any;
    return this.toToolResult({
      error: {
        code: err.code || 'UNKNOWN',
        domain: 'SYSTEM',
        message: err.message || 'An unexpected error occurred',
        retryable: false,
        details: err.stack || err
      }
    }, true);
  }
}
