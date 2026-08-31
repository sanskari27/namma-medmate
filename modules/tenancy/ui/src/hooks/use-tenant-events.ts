import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useEventEmitter } from '@namma-medmate/event-bus';
import type { TenancyRootState } from '../store/index.ts';
import '../events/events.contract.ts';

export function useTenantEvents(): void {
  const emit = useEventEmitter();
  const tenant = useSelector((state: TenancyRootState) => state.tenant);

  useEffect(() => {
    if (tenant.status === 'idle') {
      return;
    }
    emit('tenancy.context.changed', {
      status:
        tenant.status === 'loading' ? 'loading' : tenant.status === 'ready' ? 'ready' : 'error',
      tenant_id: tenant.tenantId,
      location_id: tenant.locationId,
      display_name: tenant.displayName,
    });
  }, [emit, tenant.status, tenant.tenantId, tenant.locationId, tenant.displayName]);
}
