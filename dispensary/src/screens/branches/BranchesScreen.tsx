import './BranchesScreen.css';
import { OutletsForm } from './components/outlets-form';
import { OutletsStats } from './components/outlets-stats';
import { OutletsStatusBanner, useOutletsAccess } from './components/outlets-status-banner';
import { OutletsTable } from './components/outlets-table';
import { OutletsToolbar } from './components/outlets-toolbar';

export default function BranchesScreen() {
  const allowed = useOutletsAccess();
  return (
    <div className="ot" aria-label="Outlets">
      <OutletsToolbar allowed={allowed} />
      <OutletsStatusBanner />
      {allowed ? (
        <>
          <OutletsStats />
          <OutletsTable />
          <OutletsForm />
        </>
      ) : null}
    </div>
  );
}
