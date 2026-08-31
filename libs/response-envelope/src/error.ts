export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    i18n_key?: string;
    details?: Record<string, unknown>;
  };
}

export function buildError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  i18nKey?: string,
): ErrorEnvelope {
  return {
    success: false,
    error: {
      code,
      message,
      ...(i18nKey ? { i18n_key: i18nKey } : {}),
      ...(details ? { details } : {}),
    },
  };
}
