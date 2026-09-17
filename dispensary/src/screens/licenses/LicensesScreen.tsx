import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import './LicensesScreen.css';
import { LicenseFormPanel } from './components/license-form-panel';
import { LicenseListPanel } from './components/license-list-panel';
import { LicensesHeader } from './components/licenses-header';
import { LicensesStatusBanner } from './components/licenses-status-banner';
import { isOwner } from './LicensesScreen.utils';
import { loadLicenses, selectLicensesItems, selectLicensesStatus } from './store';

export default function LicensesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const owner = isOwner(useSelector((state: RootState) => state.auth.user?.role));
  const status = useSelector(selectLicensesStatus);
  const items = useSelector(selectLicensesItems);

  useEffect(() => {
    void dispatch(loadLicenses());
  }, [dispatch]);

  const showList = status !== 'denied' && (owner || items.length > 0);

  return (
    <div className="lc" aria-label="Licences">
      <LicensesStatusBanner />
      <LicensesHeader denied={!owner} />
      {showList ? (
        <div className="lc-split">
          <LicenseListPanel />
          {owner ? <LicenseFormPanel /> : null}
        </div>
      ) : null}
    </div>
  );
}
