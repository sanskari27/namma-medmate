import {
  ClipboardCheck,
  FileBadge,
  MessageSquare,
  Share2,
  Shield,
  Users,
  Building2,
  Crown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { logout } from '@/store';
import { logoutSession } from '@/services/auth';
import { ACCOUNT_CONTENT, ACCOUNT_LINKS } from '../../AccountScreen.content';
import { selectAccountStaff, selectAccountSubscription } from '../../store';
import { formatIstDate, planLabel } from '../../AccountScreen.utils';

const ICONS = [Users, FileBadge, Shield, Crown, Building2, Share2, MessageSquare, ClipboardCheck];

export function AccountShortcuts() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const staff = useSelector(selectAccountStaff);
  const subscription = useSelector(selectAccountSubscription);

  const hintFor = (label: string, fallback: string) => {
    if (label === 'Staff accounts') {
      return `${staff.length} team members`;
    }
    if (label === 'Subscription' && subscription) {
      return `${planLabel(subscription.planCode)} · renews ${formatIstDate(subscription.expiresAt)}`;
    }
    return fallback;
  };

  return (
    <>
      <div className="ac-sec-head">
        <h2>{ACCOUNT_CONTENT.settings}</h2>
      </div>
      <div className="ac-links">
        {ACCOUNT_LINKS.map((row, index) => {
          const Icon = ICONS[index] ?? FileBadge;
          return (
            <Link key={row.path} className="ac-card ac-link" to={row.path}>
              <span className="ac-link-ico">
                <Icon size={20} />
              </span>
              <span style={{ flex: 1 }}>
                <b>{row.label}</b>
                <span className="ac-muted">{hintFor(row.label, row.hint)}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <div className="ac-utils">
        <div className="ac-spacer" />
        <button
          type="button"
          className="ac-btn ac-btn-line"
          onClick={() => {
            void logoutSession().catch(() => undefined);
            dispatch(logout());
            navigate(ROUTES.LOGIN);
          }}
        >
          {ACCOUNT_CONTENT.signOut}
        </button>
      </div>
    </>
  );
}
