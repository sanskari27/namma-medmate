import { useSelector } from 'react-redux';
import { DISTRIBUTORS_CONTENT } from '../../DistributorsScreen.content';
import {
  selectDistributorsStatus,
  selectDistributorsStatusHint,
} from '../../store/distributors.selectors';
import { statusBannerText } from '../../DistributorsScreen.utils';

export function DistributorsStatusBanner() {
  const status = useSelector(selectDistributorsStatus);
  const hint = useSelector(selectDistributorsStatusHint);
  const text = statusBannerText(status, hint);

  if (!text || status === 'loading' || status === 'idle' || status === 'empty') {
    return null;
  }

  const tone =
    status === 'success' ? 'ok' : status === 'failure' || status === 'denied' ? 'alert' : 'ok';

  return (
    <div
      className="dist-banner"
      data-tone={status === 'validation' || status === 'conflict' ? 'alert' : tone}
      role={status === 'failure' || status === 'denied' ? 'alert' : 'status'}
    >
      {text}
    </div>
  );
}
