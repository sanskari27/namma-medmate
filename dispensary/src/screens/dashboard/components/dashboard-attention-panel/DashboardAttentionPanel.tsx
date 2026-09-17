import { Link } from 'react-router-dom';
import type { HomeDashboardView } from '@/services/homeDashboard';
import { ROUTES } from '@/libs/constants/routes.const';
import { DASHBOARD_CONTENT } from '../../DashboardScreen.content';
import { attentionKindIcon } from '../../DashboardScreen.icons';

export type DashboardAttentionPanelProps = {
  items: HomeDashboardView['attention'];
};

export function DashboardAttentionPanel({ items }: DashboardAttentionPanelProps) {
  return (
    <section className="dash-card" aria-labelledby="dash-attention">
      <div className="dash-card-head">
        <div>
          <h3 id="dash-attention">{DASHBOARD_CONTENT.attentionTitle}</h3>
        </div>
        <Link to={ROUTES.INVENTORY}>{DASHBOARD_CONTENT.linkViewAll}</Link>
      </div>
      <div className="dash-card-pad">
        {items.length === 0 ? (
          <p className="dash-empty">{DASHBOARD_CONTENT.emptyAttention}</p>
        ) : (
          items.map((row) => {
            const Icon = attentionKindIcon(row.kind);
            return (
              <div key={row.id} className="dash-row">
                <span className="em" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div className="gw">
                  <div className="t">{row.title}</div>
                  <div className="s">{row.detail}</div>
                </div>
                <Link
                  to={
                    row.href === ROUTES.INVENTORY ? `${ROUTES.INVENTORY}?view=guidance` : row.href
                  }
                  className="dash-chipbtn"
                >
                  {row.actionLabel}
                </Link>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
