import { useId } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { statusCopy, statusIcon } from '../../TrendsScreen.utils';
import { TRENDS_CONTENT } from '../../TrendsScreen.content';
import {
  selectTrendsPlanGate,
  selectTrendsStatus,
  selectTrendsStatusHint,
} from '../../store';

export function TrendsStatusBanner() {
  const status = useSelector(selectTrendsStatus);
  const hint = useSelector(selectTrendsStatusHint);
  const planGate = useSelector(selectTrendsPlanGate);
  const statusId = useId();
  const text = statusCopy(status, hint);

  if (!text) {
    return <div id={statusId} className="min-h-5" />;
  }

  const Icon = statusIcon(status);
  const tone = status === 'denied' || status === 'failure' || status === 'conflict' ? 'alert' : 'ok';

  return (
    <p
      id={statusId}
      role={status === 'denied' ? 'alert' : 'status'}
      className="tr-alert"
      data-tone={tone}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {text}
        {planGate ? (
          <>
            {' '}
            <Link to={ROUTES.SUBSCRIPTION}>{TRENDS_CONTENT.openPlan}</Link>
          </>
        ) : null}
      </span>
    </p>
  );
}
