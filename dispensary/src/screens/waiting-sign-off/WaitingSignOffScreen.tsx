import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import './WaitingSignOffScreen.css';
import {
  decideSignOff,
  loadWaiting,
  selectWaitingBanner,
  selectWaitingRequests,
  selectWaitingRowError,
  selectWaitingStatus,
} from './store';

export default function WaitingSignOffScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectWaitingStatus);
  const banner = useSelector(selectWaitingBanner);
  const rowError = useSelector(selectWaitingRowError);
  const requests = useSelector(selectWaitingRequests);
  const text =
    banner ??
    (status === 'loading'
      ? 'Loading waiting sign-offs'
      : status === 'empty'
        ? 'Nothing waiting for your sign-off at this counter.'
        : status === 'denied'
          ? 'You are not an approver for pending till requests.'
          : status === 'failure'
            ? 'Could not load waiting sign-offs. Try again.'
            : null);

  useEffect(() => {
    void dispatch(loadWaiting());
  }, [dispatch]);

  return (
    <div className="wt" aria-label="Waiting for sign-off">
      {text ? (
        <p className="wt-alert" data-tone={status === 'failure' ? 'alert' : status === 'success' ? 'ok' : undefined} role="status">
          {text}
        </p>
      ) : null}
      {rowError ? (
        <p className="wt-alert" data-tone="alert" role="alert">
          {rowError}
        </p>
      ) : null}
      <div className="wt-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Waiting for sign-off</h2>
          <span className="wt-muted">Approve or send back till requests assigned to you</span>
        </div>
      </div>
      {requests.length > 0 ? (
        <div className="wt-card">
          <div className="wt-tbl-wrap">
            <table className="wt-tbl">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Amount</th>
                  <th>Threshold</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <b>{request.actionKey}</b>
                    </td>
                    <td className="num">{request.amountValue ?? '—'}</td>
                    <td className="num">{request.thresholdSnapshot ?? '—'}</td>
                    <td>
                      <div className="wt-flex">
                        <button
                          type="button"
                          className="wt-btn wt-btn-primary wt-btn-sm"
                          onClick={() => {
                            if (
                              !window.confirm(
                                'Approve this till request? The original action will continue.',
                              )
                            ) {
                              return;
                            }
                            void dispatch(decideSignOff({ request, outcome: 'APPROVED' }));
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="wt-btn wt-btn-ghost wt-btn-sm"
                          onClick={() => {
                            if (
                              !window.confirm(
                                'Send this till request back? The cashier will need to retry.',
                              )
                            ) {
                              return;
                            }
                            void dispatch(decideSignOff({ request, outcome: 'REJECTED' }));
                          }}
                        >
                          Send back
                        </button>
                      </div>
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
