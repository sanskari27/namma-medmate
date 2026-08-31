import type { Request } from 'express';
import { ValidationError } from '@namma-medmate/error-handling';
import { bearerHeaderSchema } from '@namma-medmate/validation-schemas';

export interface AuthorizationInput {
  authorization?: string;
}

export function parseAuthorizationHeader(req: Request): AuthorizationInput {
  const authorization = req.header('authorization') ?? req.header('Authorization');
  return { authorization };
}

export function validateAuthorizationHeader(input: AuthorizationInput): AuthorizationInput {
  const result = bearerHeaderSchema.safeParse(input.authorization ?? '');
  if (!result.success) {
    throw new ValidationError('Must be a Bearer token');
  }
  return { authorization: result.data };
}
