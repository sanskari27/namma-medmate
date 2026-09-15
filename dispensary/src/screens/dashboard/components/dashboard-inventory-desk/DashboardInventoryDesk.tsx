import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import type { InventoryDesk } from '@/services/dashboards';
import { DASHBOARD_CONTENT } from '../../DashboardScreen.content';
import { DESK_BLURB, DESK_LABEL, formatQty } from '../../DashboardScreen.utils';

export type DashboardInventoryDeskProps = {
  desk: InventoryDesk;
};

export function DashboardInventoryDesk({ desk }: DashboardInventoryDeskProps) {
  return (
    <section className="dash-card" aria-label={DESK_LABEL.inventory}>
      <header className="dash-card-head">
        <div>
          <h2>{DESK_LABEL.inventory}</h2>
          <p>{DESK_BLURB.inventory}</p>
        </div>
        <Link to={desk.sources.stock || ROUTES.INVENTORY}>{DASHBOARD_CONTENT.openStock}</Link>
      </header>
      <div className="dash-grid-3 dash-desk-grid">
        <div className="dash-card-pad">
          <h3>{DASHBOARD_CONTENT.inventoryLow}</h3>
          {desk.lowStock.length === 0 ? (
            <p className="dash-muted">{DASHBOARD_CONTENT.emptyLowStock}</p>
          ) : (
            <ul className="dash-desk-list">
              {desk.lowStock.map((row) => (
                <li key={row.productId}>
                  <Link to={desk.sources.stock || ROUTES.INVENTORY}>{row.productName}</Link>
                  <span>
                    {formatQty(row.onHand)}
                    {row.reorderLevel != null ? ` / ${row.reorderLevel}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="dash-card-pad">
          <h3>{DASHBOARD_CONTENT.inventoryTransfers}</h3>
          {desk.pendingTransfers.length === 0 ? (
            <p className="dash-muted">{DASHBOARD_CONTENT.emptyTransfers}</p>
          ) : (
            <ul className="dash-desk-list">
              {desk.pendingTransfers.map((row) => (
                <li key={row.id}>
                  <Link to={row.href || desk.sources.transfers || ROUTES.INVENTORY}>{row.status}</Link>
                  <span>{row.direction}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="dash-card-pad">
          <h3>{DASHBOARD_CONTENT.inventoryGrn}</h3>
          {desk.pendingGrn.length === 0 ? (
            <p className="dash-muted">{DASHBOARD_CONTENT.emptyGrn}</p>
          ) : (
            <ul className="dash-desk-list">
              {desk.pendingGrn.map((row) => (
                <li key={row.id}>
                  <Link to={row.href || desk.sources.grn || ROUTES.PURCHASES}>{row.receiptNumber}</Link>
                  <span>{row.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
