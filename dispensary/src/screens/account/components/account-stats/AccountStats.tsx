import { Building2, Crown, FileBadge, ShieldCheck, Users, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '@/libs/constants/routes.const';
import { planLabel, seatsLabel } from '../../AccountScreen.utils';
import {
  selectAccountBranches,
  selectAccountLicenses,
  selectAccountStaff,
  selectAccountSubscription,
  selectAccountTodos,
} from '../../store';

export function AccountStats() {
  const subscription = useSelector(selectAccountSubscription);
  const staff = useSelector(selectAccountStaff);
  const licenses = useSelector(selectAccountLicenses);
  const branches = useSelector(selectAccountBranches);
  const todos = useSelector(selectAccountTodos);
  const activeStaff = staff.filter((row) => row.status !== 'TERMINATED').length;
  const done = todos.filter((row) => row.done).length;
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;

  return (
    <div className="ac-stats">
      <Link className="ac-stat" to={ROUTES.SUBSCRIPTION}>
        <div className="ic ic-gold">
          <Crown size={18} />
        </div>
        <div className="lbl">Plan</div>
        <div className="val">{planLabel(subscription?.planCode)}</div>
        <div className="split">{subscription?.status?.toLowerCase() ?? '—'}</div>
      </Link>
      <Link className="ac-stat" to={ROUTES.USERS}>
        <div className="ic ic-green">
          <Users size={18} />
        </div>
        <div className="lbl">Team members</div>
        <div className="val">{staff.length}</div>
        <div className="split">{activeStaff} active</div>
      </Link>
      <div className="ac-stat">
        <div className="ic ic-blue">
          <WalletCards size={18} />
        </div>
        <div className="lbl">Seats used</div>
        <div className="val">{seatsLabel(subscription)}</div>
        <div className="split">{planLabel(subscription?.planCode)} plan</div>
      </div>
      <Link className="ac-stat" to={ROUTES.LICENSES}>
        <div className="ic ic-teal">
          <FileBadge size={18} />
        </div>
        <div className="lbl">Licences</div>
        <div className="val">{licenses.length}</div>
        <div className="split">{licenses.filter((row) => row.due).length} due</div>
      </Link>
      <Link className="ac-stat" to={ROUTES.BRANCHES}>
        <div className="ic ic-green">
          <Building2 size={18} />
        </div>
        <div className="lbl">Outlets</div>
        <div className="val">{branches.length}</div>
        <div className="split">
          {subscription ? `${subscription.branchesUsed} / ${subscription.effectiveBranchLimit}` : 'on file'}
        </div>
      </Link>
      <div className="ac-stat">
        <div className="ic ic-gold">
          <ShieldCheck size={18} />
        </div>
        <div className="lbl">Profile complete</div>
        <div className="val">{pct}%</div>
        <div className="split">
          {done}/{todos.length} done
        </div>
      </div>
    </div>
  );
}
