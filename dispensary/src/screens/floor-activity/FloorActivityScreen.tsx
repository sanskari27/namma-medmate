import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import './FloorActivityScreen.css';
import {
  accessDenied,
  loadActivity,
  selectActivityEvents,
  selectActivityStatus,
} from './store';

function hasApprovals(modules: string[] | undefined): boolean {
  return modules?.includes('APPROVALS') === true;
}

function formatWhen(value: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function FloorActivityScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = user?.role === 'pharmacy_owner' || hasApprovals(user?.modules);
  const status = useSelector(selectActivityStatus);
  const events = useSelector(selectActivityEvents);
  const text =
    status === 'loading'
      ? 'Loading floor activity'
      : status === 'empty'
        ? 'No recent floor activity in the last 90 days.'
        : status === 'denied'
          ? 'You need Approvals access to view floor activity.'
          : status === 'failure'
            ? 'Could not load floor activity. Try again.'
            : null;

  useEffect(() => {
    if (!allowed) {
      dispatch(accessDenied());
      return;
    }
    void dispatch(loadActivity());
  }, [allowed, dispatch]);

  return (
    <div className="fa" aria-label="Floor activity">
      {text ? (
        <p className="fa-alert" data-tone={status === 'failure' ? 'alert' : undefined} role="status">
          {text}
        </p>
      ) : null}
      <div className="fa-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Floor activity</h2>
          <span className="fa-muted">Sign-ins and business actions for this pharmacy, kept for 90 days</span>
        </div>
      </div>
      {events.length > 0 ? (
        <div className="fa-card">
          <div className="fa-tbl-wrap">
            <table className="fa-tbl">
              <thead>
                <tr>
                  <th>When (IST)</th>
                  <th>Action</th>
                  <th>Outcome</th>
                  <th>Who / from</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="fa-mono">{formatWhen(event.createdAt)}</td>
                    <td>{event.action}</td>
                    <td>
                      <span className="fa-pill" data-tone={event.outcome === 'SUCCESS' ? 'green' : 'tag'}>
                        {event.outcome}
                      </span>
                    </td>
                    <td>
                      {event.attemptedIdentity ?? event.userId ?? '—'}
                      {event.sourceIp ? ` · ${event.sourceIp}` : ''}
                    </td>
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
