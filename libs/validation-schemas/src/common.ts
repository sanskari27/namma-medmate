import { z } from 'zod';
import { Patterns } from '@namma-medmate/constants';

export const uuidSchema = z.string().regex(Patterns.uuid, 'Must be a UUID');
export const emailSchema = z.string().regex(Patterns.email, 'Must be an email');
export const nonEmptyStringSchema = z.string().trim().min(1);
export const bearerHeaderSchema = z.string().regex(Patterns.bearer, 'Must be a Bearer token');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
