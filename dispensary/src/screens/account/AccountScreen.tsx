import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { sessionStarted } from '@/store';
import { ACCOUNT_CONTENT } from './AccountScreen.content';
import { isOwner } from './AccountScreen.utils';
import './AccountScreen.css';
import { AccountCompleteness } from './components/account-completeness';
import { AccountHero } from './components/account-hero';
import { AccountKycForm } from './components/account-kyc-form';
import { AccountPlanCard } from './components/account-plan-card';
import { AccountShortcuts } from './components/account-shortcuts';
import { AccountStats } from './components/account-stats';
import { AccountStatusBanner } from './components/account-status-banner';
import { AccountTeam } from './components/account-team';
import { AccountVerification } from './components/account-verification';
import {
  accessDenied,
  loadAccount,
  selectAccountPack,
  selectCanSubmitKyc,
} from './store';

export default function AccountScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const owner = isOwner(user?.role);
  const pack = useSelector(selectAccountPack);
  const canSubmit = useSelector(selectCanSubmitKyc);

  useEffect(() => {
    if (!owner || !user?.tenantId) {
      dispatch(accessDenied('Only the pharmacy owner can open this account desk.'));
      return;
    }
    void dispatch(loadAccount());
  }, [dispatch, owner, user?.tenantId]);

  useEffect(() => {
    if (user && pack?.tenantStatus && pack.tenantStatus !== user.tenantStatus) {
      dispatch(
        sessionStarted({
          ...user,
          tenantStatus: pack.tenantStatus,
          emailVerified: pack.emailVerified,
        }),
      );
    }
  }, [dispatch, pack, user]);

  return (
    <div className="ac" aria-label={ACCOUNT_CONTENT.regionLabel}>
      <AccountStatusBanner />
      {owner ? (
        <>
          <AccountHero />
          <AccountStats />
          <div className="ac-grid-2">
            <AccountPlanCard />
            <AccountCompleteness />
          </div>
          <div className="ac-grid-2">
            <AccountVerification />
            <AccountTeam />
          </div>
          {canSubmit ? <AccountKycForm /> : null}
          <AccountShortcuts />
        </>
      ) : null}
    </div>
  );
}
