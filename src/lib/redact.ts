/**
 * Utility to redact sensitive information from logs and outputs.
 */

const SENSITIVE_KEYS = /token|secret|password|auth|jwt|cookie|key|passphrase/i;

export function redactSecrets(obj: any, maxDepth = 10): any {
  if (maxDepth <= 0) {
    return "[MAX_DEPTH_REACHED]";
  }

  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSecrets(item, maxDepth - 1));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof key === "string" && SENSITIVE_KEYS.test(key)) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = redactSecrets(value, maxDepth - 1);
    }
  }

  return redacted;
}
