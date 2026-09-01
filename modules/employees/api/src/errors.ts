import { AppError } from '@namma-medmate/error-handling';
import {
  ErrorCode,
  HttpStatus,
  type ErrorCodeValue,
  type HttpStatusCode,
} from '@namma-medmate/constants';

export function employeesError(
  code: ErrorCodeValue,
  status: HttpStatusCode,
  message: string,
  i18nKey: string,
  details?: Record<string, unknown>,
): AppError {
  return new AppError(message, code, status, details, i18nKey);
}

export const EmployeesErrors = {
  locationRequired: () =>
    employeesError(
      ErrorCode.LOCATION_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'location_id is required',
      'employees.errors.locationRequired',
    ),
  pharmacySessionRequired: () =>
    employeesError(
      ErrorCode.PHARMACY_SESSION_REQUIRED,
      HttpStatus.FORBIDDEN,
      'A pharmacy session is required',
      'employees.errors.pharmacySessionRequired',
    ),
  forbidden: () =>
    employeesError(
      ErrorCode.FORBIDDEN,
      HttpStatus.FORBIDDEN,
      'Forbidden',
      'employees.errors.forbidden',
    ),
  notFound: () =>
    employeesError(
      ErrorCode.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      'Employee not found',
      'employees.errors.notFound',
    ),
  validationError: (message = 'Validation failed') =>
    employeesError(
      ErrorCode.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      message,
      'employees.errors.validationError',
    ),
  planRequired: () =>
    employeesError(
      ErrorCode.PLAN_REQUIRED,
      HttpStatus.FORBIDDEN,
      'Employees requires Starter',
      'employees.errors.planRequired',
      { required_plan: 'starter' },
    ),
  employeeCodeTaken: () =>
    employeesError(
      ErrorCode.EMPLOYEE_CODE_TAKEN,
      HttpStatus.CONFLICT,
      'Employee code is already in use',
      'employees.errors.employeeCodeTaken',
    ),
  userAlreadyLinked: () =>
    employeesError(
      ErrorCode.USER_ALREADY_LINKED,
      HttpStatus.CONFLICT,
      'This user is already linked to an employee',
      'employees.errors.userAlreadyLinked',
    ),
  employeeAlreadyLinked: () =>
    employeesError(
      ErrorCode.EMPLOYEE_ALREADY_LINKED,
      HttpStatus.CONFLICT,
      'This employee is already linked to a user',
      'employees.errors.employeeAlreadyLinked',
    ),
  uploadKeyInvalid: () =>
    employeesError(
      ErrorCode.UPLOAD_KEY_INVALID,
      HttpStatus.BAD_REQUEST,
      'Upload key is not valid for this tenant',
      'employees.errors.uploadKeyInvalid',
    ),
  documentLimit: () =>
    employeesError(
      ErrorCode.DOCUMENT_LIMIT,
      HttpStatus.CONFLICT,
      'An employee may have at most 20 documents',
      'employees.errors.documentLimit',
    ),
  pharmacistRegIncomplete: () =>
    employeesError(
      ErrorCode.PHARMACIST_REG_INCOMPLETE,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'Pharmacist registration number and expiry are required together',
      'employees.errors.pharmacistRegIncomplete',
    ),
  methodNotAllowed: () =>
    employeesError(
      ErrorCode.FORBIDDEN,
      HttpStatus.METHOD_NOT_ALLOWED,
      'Hard delete is not allowed',
      'employees.errors.methodNotAllowed',
    ),
  idempotencyConflict: () =>
    employeesError(
      ErrorCode.IDEMPOTENCY_CONFLICT,
      HttpStatus.CONFLICT,
      'Idempotency key was reused with a different body',
      'employees.errors.idempotencyConflict',
    ),
};
