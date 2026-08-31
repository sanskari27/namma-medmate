import { translate } from '@namma-medmate/i18n';
import { tenancyMessages } from '../i18n/en.ts';

export interface PharmacyIdentityReadOnlyProps {
  displayName: string;
  tenantId: string;
  locationId: string;
}

export function PharmacyIdentityReadOnly({
  displayName,
  tenantId,
  locationId,
}: PharmacyIdentityReadOnlyProps) {
  return (
    <section
      aria-label={translate(tenancyMessages, 'tenancy.identity.title')}
      className="flex flex-col gap-1"
    >
      <p className="text-lg font-semibold text-ink">{displayName}</p>
      <p className="text-sm text-ink-muted">{tenantId}</p>
      <p className="text-sm text-ink-muted">{locationId}</p>
    </section>
  );
}
