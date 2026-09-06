import { BooksDeskPanel } from './components/books-desk-panel';
import { DashboardDeskSwitch } from './components/dashboard-desk-switch';
import { DashboardHeader } from './components/dashboard-header';
import { DashboardOutletFilter } from './components/dashboard-outlet-filter';
import { DashboardStatusBanner } from './components/dashboard-status-banner';
import { ShopGlancePanel } from './components/shop-glance-panel';
import { StockDeskPanel } from './components/stock-desk-panel';
import { TillTodayPanel } from './components/till-today-panel';
import { useDashboardPage } from './useDashboardPage';

export default function DashboardScreen() {
  const page = useDashboardPage();
  const busy = page.status === 'loading';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <DashboardHeader
        desk={page.desk}
        denied={!page.allowed}
        busy={busy}
        refreshRef={page.refreshRef}
        onRefresh={page.onRefresh}
      />
      <DashboardStatusBanner
        status={page.status}
        desk={page.desk}
        statusId={page.statusId}
        hint={page.statusHint}
      />
      {page.allowed && page.desk ? (
        <>
          <DashboardDeskSwitch
            desks={page.permitted}
            selected={page.desk}
            disabled={busy}
            onSelect={page.onDesk}
          />
          {page.owner && page.desk === 'owner' ? (
            <DashboardOutletFilter scope={page.scope} disabled={busy} onScope={page.onScope} />
          ) : null}
          {page.desk === 'cashier' ? <TillTodayPanel data={page.view?.cashier} /> : null}
          {page.desk === 'inventory' ? <StockDeskPanel data={page.view?.inventory} /> : null}
          {page.desk === 'accountant' ? <BooksDeskPanel data={page.view?.accountant} /> : null}
          {page.desk === 'owner' ? <ShopGlancePanel data={page.view?.owner} /> : null}
        </>
      ) : null}
    </div>
  );
}
