import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '@/libs/constants/routes.const';
import type { RootState } from '@/store';
import { ACCOUNT_CONTENT } from '../../AccountScreen.content';
import {
  pharmacyAddress,
  planLabel,
  tenantLabel,
  tenantTone,
} from '../../AccountScreen.utils';
import { selectAccountOutlet, selectAccountSubscription } from '../../store';

export function AccountHero() {
  const outlet = useSelector(selectAccountOutlet);
  const subscription = useSelector(selectAccountSubscription);
  const tenantStatus = useSelector((state: RootState) => state.auth.user?.tenantStatus);
  const name = outlet?.name ?? 'This pharmacy';

  return (
    <div className="ac-card ac-card-pad ac-hero">
      <span className="ac-av" aria-hidden>
        <Plus size={28} strokeWidth={2.4} />
      </span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <h2>{name}</h2>
        <p className="ac-muted">{pharmacyAddress(outlet)}</p>
        <div className="ac-pills">
          <span className="ac-pill" data-tone={tenantTone(tenantStatus)} data-live="true">
            {tenantLabel(tenantStatus)}
          </span>
          {subscription ? (
            <span className="ac-pill" data-tone="gold">
              {planLabel(subscription.planCode)} plan
            </span>
          ) : null}
          <span className="ac-pill" data-tone="tag">
            {outlet?.branchType === 'KIOSK' ? 'Kiosk' : 'Retail Pharmacy'}
          </span>
          {outlet ? (
            <span className="ac-pill" data-tone="tag">
              Opened {outlet.openingDate}
            </span>
          ) : null}
        </div>
      </div>
      <div className="ac-flex">
        <Link className="ac-btn ac-btn-primary" to={ROUTES.LICENSES}>
          {ACCOUNT_CONTENT.editProfile}
        </Link>
      </div>
    </div>
  );
}
