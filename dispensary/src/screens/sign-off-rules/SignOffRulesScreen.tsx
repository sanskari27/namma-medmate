import { FormEvent, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import './SignOffRulesScreen.css';
import {
  accessDenied,
  actionKeyChanged,
  createSignOffRule,
  loadSignOff,
  selectSignOffActionKey,
  selectSignOffActions,
  selectSignOffBanner,
  selectSignOffFormError,
  selectSignOffRules,
  selectSignOffSelectedAction,
  selectSignOffStatus,
  selectSignOffThreshold,
  thresholdChanged,
} from './store';

function hasApprovals(modules: string[] | undefined): boolean {
  return modules?.includes('APPROVALS') === true;
}

export default function SignOffRulesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = user?.role === 'pharmacy_owner' || hasApprovals(user?.modules);
  const status = useSelector(selectSignOffStatus);
  const banner = useSelector(selectSignOffBanner);
  const formError = useSelector(selectSignOffFormError);
  const rules = useSelector(selectSignOffRules);
  const actions = useSelector(selectSignOffActions);
  const actionKey = useSelector(selectSignOffActionKey);
  const threshold = useSelector(selectSignOffThreshold);
  const selectedAction = useSelector(selectSignOffSelectedAction);
  const text =
    banner ??
    (status === 'loading'
      ? 'Loading sign-off rules'
      : status === 'empty'
        ? 'No sign-off rules yet. Add one when a till action needs another person to approve.'
        : status === 'denied'
          ? 'You need Approvals access to change sign-off rules.'
          : status === 'failure'
            ? 'Could not load sign-off rules. Try again.'
            : null);

  useEffect(() => {
    if (!allowed) {
      dispatch(accessDenied('You need Approvals access to change sign-off rules.'));
      return;
    }
    void dispatch(loadSignOff());
  }, [allowed, dispatch]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void dispatch(createSignOffRule());
  };

  return (
    <div className="so" aria-label="Sign-off rules">
      {text ? (
        <p className="so-alert" data-tone={status === 'failure' ? 'alert' : status === 'success' ? 'ok' : undefined} role="status">
          {text}
        </p>
      ) : null}
      <div className="so-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Sign-off rules</h2>
          <span className="so-muted">When a till action needs another person before it completes</span>
        </div>
      </div>
      {allowed && status !== 'denied' && status !== 'failure' ? (
        <form className="so-card so-card-pad so-form" onSubmit={onSubmit}>
          <div className="so-field">
            <label htmlFor="signoff-action">Action</label>
            <select
              id="signoff-action"
              className="so-select"
              value={actionKey}
              onChange={(event) => dispatch(actionKeyChanged(event.target.value))}
            >
              {actions.map((action) => (
                <option key={action.actionKey} value={action.actionKey}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>
          <div className="so-field">
            <label htmlFor="signoff-threshold">
              Threshold ({selectedAction?.unit === 'BPS' ? 'basis points' : 'paise'})
            </label>
            <input
              id="signoff-threshold"
              className="so-input"
              inputMode="numeric"
              value={threshold}
              onChange={(event) => dispatch(thresholdChanged(event.target.value))}
            />
          </div>
          <p className="so-muted">Approver: pharmacy owner (cannot self-approve).</p>
          {formError ? (
            <p className="so-alert" data-tone="alert" role="alert">
              {formError}
            </p>
          ) : null}
          <button type="submit" className="so-btn so-btn-primary">
            Save sign-off rule
          </button>
        </form>
      ) : null}
      {rules.length > 0 ? (
        <div className="so-card">
          <div className="so-tbl-wrap">
            <table className="so-tbl">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Threshold</th>
                  <th>Approver</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.moduleCode}</td>
                    <td>{rule.actionKey}</td>
                    <td className="num">{rule.thresholdValue ?? '—'}</td>
                    <td>{rule.approverAccountClass ?? rule.approverRoleId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
