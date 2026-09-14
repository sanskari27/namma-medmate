import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '@/libs/constants/routes.const';
import { ACCOUNT_CONTENT } from '../../AccountScreen.content';
import { roleTone } from '../../AccountScreen.utils';
import { selectAccountStaff, selectAccountTeam } from '../../store';

export function AccountTeam() {
  const staff = useSelector(selectAccountStaff);
  const team = useSelector(selectAccountTeam);
  const active = staff.filter((row) => row.status !== 'TERMINATED').length;
  const max = Math.max(1, ...team.map((row) => row.count));

  return (
    <div className="ac-card">
      <div className="ac-card-head">
        <h3>{ACCOUNT_CONTENT.team}</h3>
        <Link className="ac-btn ac-btn-ghost ac-btn-sm" to={ROUTES.USERS}>
          {ACCOUNT_CONTENT.manage} <ArrowRight size={13} />
        </Link>
      </div>
      <div className="ac-card-pad">
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Manrope, Inter, sans-serif', fontWeight: 800, fontSize: 26 }}>
            {staff.length}
          </div>
          <div className="ac-muted" style={{ fontSize: 12 }}>
            members · {active} active
          </div>
        </div>
        {team.map((row) => (
          <div key={row.label} style={{ marginBottom: 9 }}>
            <div className="ac-flex" style={{ justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
              <span className="ac-pill" data-tone={roleTone(row.label)}>
                {row.label}
              </span>
              <b>{row.count}</b>
            </div>
            <div className="ac-prog">
              <i style={{ width: `${Math.round((row.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
