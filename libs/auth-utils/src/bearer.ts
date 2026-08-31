import { UnauthorizedError } from '@namma-medmate/error-handling';

export function extractBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader) {
    throw new UnauthorizedError('Missing Authorization header');
  }
  const [scheme, token, extra] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token || extra) {
    throw new UnauthorizedError('Invalid Authorization header');
  }
  return token;
}
