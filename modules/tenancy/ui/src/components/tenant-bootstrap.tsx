import { useGetCurrentQuery } from '../store/api/tenancy-api.ts';
import { useTenantEvents } from '../hooks/use-tenant-events.ts';
import type { TenantBootstrapProps } from '../types/tenant-bootstrap.ts';

export function TenantBootstrap({ skipQuery = false }: TenantBootstrapProps) {
  useGetCurrentQuery(undefined, { skip: skipQuery });
  useTenantEvents();
  return null;
}
