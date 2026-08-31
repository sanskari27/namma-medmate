export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function buildError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ErrorEnvelope {
  return details
    ? { success: false, error: { code, message, details } }
    : { success: false, error: { code, message } };
}
