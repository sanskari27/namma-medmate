import { KeyRound, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectStaffItems } from '../../store';

export function StaffStats() {
  const items = useSelector(selectStaffItems);
  const active = items.filter((row) => row.status !== 'TERMINATED' && row.status !== 'PENDING').length;
  const pending = items.filter((row) => row.status === 'PENDING').length;
  const owners = items.filter((row) => row.role === 'pharmacy_owner').length;
  return (
    <div className="st-stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
      <div className="st-stat">
        <div className="ic ic-green">
          <Users size={18} />
        </div>
        <div className="lbl">Team members</div>
        <div className="val">{items.length}</div>
        <div className="split">{active} active</div>
      </div>
      <div className="st-stat">
        <div className="ic ic-blue">
          <UserCheck size={18} />
        </div>
        <div className="lbl">Login enabled</div>
        <div className="val">{active}</div>
        <div className="split">have ID & password</div>
      </div>
      <div className="st-stat">
        <div className="ic ic-gold">
          <KeyRound size={18} />
        </div>
        <div className="lbl">Waiting</div>
        <div className="val">{pending}</div>
        <div className="split">pending approval</div>
      </div>
      <div className="st-stat">
        <div className="ic ic-teal">
          <ShieldCheck size={18} />
        </div>
        <div className="lbl">Owners</div>
        <div className="val">{owners}</div>
        <div className="split">full access</div>
      </div>
    </div>
  );
}
