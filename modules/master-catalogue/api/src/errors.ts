import { AppError } from '@namma-medmate/error-handling';
import {
  ErrorCode,
  HttpStatus,
  type ErrorCodeValue,
  type HttpStatusCode,
} from '@namma-medmate/constants';

export function masterCatalogueError(
  code: ErrorCodeValue,
  status: HttpStatusCode,
  message: string,
  i18nKey: string,
): AppError {
  return new AppError(message, code, status, undefined, i18nKey);
}

export const MasterCatalogueErrors = {
  validationFailed: (message = 'Validation failed') =>
    masterCatalogueError(
      ErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      message,
      'masterCatalogue.errors.validationFailed',
    ),
  invalidCeiling: () =>
    masterCatalogueError(
      ErrorCode.INVALID_CEILING,
      HttpStatus.BAD_REQUEST,
      'DPCO ceiling cannot be negative',
      'masterCatalogue.errors.invalidCeiling',
    ),
  invalidGstSlab: () =>
    masterCatalogueError(
      ErrorCode.INVALID_GST_SLAB,
      HttpStatus.BAD_REQUEST,
      'GST slab must be 0, 5, 12, 18, or 28',
      'masterCatalogue.errors.invalidGstSlab',
    ),
  notFound: () =>
    masterCatalogueError(
      ErrorCode.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      'Master SKU not found',
      'masterCatalogue.errors.notFound',
    ),
  hqOnly: () =>
    masterCatalogueError(
      ErrorCode.HQ_ONLY,
      HttpStatus.FORBIDDEN,
      'This endpoint is for Platform Admin HQ principals',
      'masterCatalogue.errors.hqOnly',
    ),
  forbidden: () =>
    masterCatalogueError(
      ErrorCode.FORBIDDEN,
      HttpStatus.FORBIDDEN,
      'A pharmacy, HQ, or service principal is required',
      'masterCatalogue.errors.forbidden',
    ),
};
