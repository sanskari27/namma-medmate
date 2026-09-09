import { useSelector } from 'react-redux';
import { RX_CONTENT } from '../../PrescriptionsScreen.content';
import { selectRxActionHint, selectRxStatus, selectRxStatusHint } from '../../store/prescriptions.selectors';

export function PrescriptionsStatusBanner() {
  const status = useSelector(selectRxStatus);
  const statusHint = useSelector(selectRxStatusHint);
  const actionHint = useSelector(selectRxActionHint);

  if (status === 'denied') {
    return (
      <div className="rx-banner" data-tone="alert" role="alert">
        <strong>{RX_CONTENT.denied}</strong>
      </div>
    );
  }

  if (status === 'no_branch') {
    return (
      <div className="rx-banner" data-tone="alert" role="alert">
        <strong>{RX_CONTENT.noBranch}</strong>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rx-banner" data-tone="alert" role="alert">
        <strong>{statusHint || RX_CONTENT.loadFailed}</strong>
      </div>
    );
  }

  if (actionHint) {
    const tone = /could not|fail|still valid|changed/i.test(actionHint) ? 'alert' : 'ok';
    return (
      <div className="rx-banner" data-tone={tone} role="status">
        {actionHint}
      </div>
    );
  }

  return null;
}
