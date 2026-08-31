import { translate } from '@namma-medmate/i18n';
import { tenancyMessages } from '../i18n/en.ts';
import { ShopIdentityBadge } from './shop-identity-badge.tsx';
import { TenantBootstrap } from './tenant-bootstrap.tsx';

export interface TenantShellProps {
  skipQuery?: boolean;
}

export function TenantShell({ skipQuery = false }: TenantShellProps) {
  return (
    <div className="flex h-[72px] w-full items-center justify-between gap-4">
      <TenantBootstrap skipQuery={skipQuery} />
      <div>
        <p className="text-[32px] font-bold leading-10 tracking-tight text-primary">
          {translate(tenancyMessages, 'tenancy.shell.product')}
        </p>
        <p className="font-mono text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          {translate(tenancyMessages, 'tenancy.shell.channel')}
        </p>
      </div>
      <ShopIdentityBadge />
    </div>
  );
}
