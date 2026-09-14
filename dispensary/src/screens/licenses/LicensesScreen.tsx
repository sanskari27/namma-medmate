import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import './LicensesScreen.css';
import { LicenseFormPanel } from './components/license-form-panel';
import { LicenseListPanel } from './components/license-list-panel';
import { LicensesHeader } from './components/licenses-header';
import { LicensesStatusBanner } from './components/licenses-status-banner';
import { isOwner } from './LicensesScreen.utils';
import { accessDenied, loadLicenses } from './store';

export default function LicensesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const owner = isOwner(useSelector((state: RootState) => state.auth.user?.role));

  useEffect(() => {
    if (!owner) {
      dispatch(accessDenied('Only the owner can file licences at this counter. Ask the owner if a paper is due.'));
      return;
    }
    void dispatch(loadLicenses());
  }, [dispatch, owner]);

  return (
    <div className="lc" aria-label="Licences">
      <LicensesStatusBanner />
      <LicensesHeader denied={!owner} />
      {owner ? (
        <div className="lc-split">
          <LicenseListPanel />
          <LicenseFormPanel />
        </div>
      ) : null}
    </div>
  );
}
