import { translate } from '@namma-medmate/i18n';
import { Badge, StatusBanner } from '@namma-medmate/shared-ui';
import { useSelector } from 'react-redux';
import { tenancyMessages } from '../i18n/en.ts';
import type { TenancyRootState } from '../store/index.ts';

export function ShopIdentityBadge() {
  const tenant = useSelector((state: TenancyRootState) => state.tenant);
  if (tenant.status === 'error') {
    return (
      <StatusBanner tone="error">
        {translate(tenancyMessages, tenant.message ?? 'tenancy.errors.locationIdRequired')}
      </StatusBanner>
    );
  }
  if (!tenant.displayName) {
    return null;
  }
  return (
    <Badge
      variant="secondary"
      role="status"
      aria-label={translate(tenancyMessages, 'tenancy.badge.shopName')}
      className="h-11 min-h-11 rounded-full border border-border px-4 py-2"
    >
      {tenant.displayName}
    </Badge>
  );
}
