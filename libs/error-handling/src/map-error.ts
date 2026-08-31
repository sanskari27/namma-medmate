import { ErrorCode, HttpStatus } from '@namma-medmate/constants';
import { AppError } from './app-error.ts';

export interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface StatusError {
  status: number;
  message?: string;
}

function isStatusError(error: unknown): error is StatusError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

export function toErrorBody(error: unknown): ErrorBody {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }
  if (isStatusError(error) && error.status < 500) {
    return {
      success: false,
      error: {
        code:
          error.status === HttpStatus.UNAUTHORIZED
            ? ErrorCode.UNAUTHORIZED
            : ErrorCode.VALIDATION_ERROR,
        message: error.message ?? 'Request failed',
      },
    };
  }
  return {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  };
}

export function getHttpStatus(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  if (isStatusError(error)) {
    return error.status;
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
