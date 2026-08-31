import {
  ErrorCode,
  HttpStatus,
  type ErrorCodeValue,
  type HttpStatusCode,
} from '@namma-medmate/constants';

export class AppError extends Error {
  readonly code: ErrorCodeValue;
  readonly statusCode: HttpStatusCode;
  readonly details?: Record<string, unknown>;
  readonly i18nKey?: string;

  constructor(
    message: string,
    code: ErrorCodeValue,
    statusCode: HttpStatusCode,
    details?: Record<string, unknown>,
    i18nKey?: string,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.i18nKey = i18nKey;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(message, ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', details?: Record<string, unknown>) {
    super(message, ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super(message, ErrorCode.CONFLICT, HttpStatus.CONFLICT, details);
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred', details?: Record<string, unknown>) {
    super(message, ErrorCode.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}
