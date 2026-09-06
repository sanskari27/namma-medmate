import { Link } from 'react-router-dom';
import type { Ref } from 'react';
import { ROUTES } from '@/libs/constants/routes.const';

export type RegistersUpgradeProps = {
  hint: string;
  linkRef?: Ref<HTMLAnchorElement>;
};

export function RegistersUpgrade({ hint, linkRef }: RegistersUpgradeProps) {
  return (
    <div
      className="border border-line bg-surface px-3 py-6"
      role="region"
      aria-label="Plan required for this register"
    >
      <p className="text-sm text-ink">{hint}</p>
      <Link
        ref={linkRef}
        to={ROUTES.SUBSCRIPTION}
        className="mt-2 inline-block text-sm font-medium text-brand underline-offset-2 hover:underline"
      >
        Open the plan
      </Link>
    </div>
  );
}
