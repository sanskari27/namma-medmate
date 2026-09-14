import { Link } from 'react-router-dom';
import type { Ref } from 'react';
import { ROUTES } from '@/libs/constants/routes.const';

export type RegistersUpgradeProps = {
  hint: string;
  linkRef?: Ref<HTMLAnchorElement>;
};

export function RegistersUpgrade({ hint, linkRef }: RegistersUpgradeProps) {
  return (
    <div className="rg-card rg-card-pad" role="region" aria-label="Plan required for this register">
      <p style={{ margin: 0 }}>{hint}</p>
      <Link ref={linkRef} to={ROUTES.SUBSCRIPTION} className="rg-btn rg-btn-primary" style={{ marginTop: 12 }}>
        Open the plan
      </Link>
    </div>
  );
}
