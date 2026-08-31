import { useSelector } from 'react-redux';
import type { TenancyRootState } from '../store/index.ts';

export function useTenant() {
  return useSelector((state: TenancyRootState) => ({
    tenant_id: state.tenant.tenantId,
    location_id: state.tenant.locationId,
    display_name: state.tenant.displayName,
    status: state.tenant.status,
  }));
}
