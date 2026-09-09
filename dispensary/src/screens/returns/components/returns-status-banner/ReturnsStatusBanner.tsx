import { useDispatch, useSelector } from 'react-redux';
import { RETURNS_CONTENT } from '../../ReturnsScreen.content';
import { selectCreateHint, selectCreateStatus, selectReturnsStatus, selectReturnsStatusHint } from '../../store/returns.selectors';
import { loadReturns } from '../../store/returns.thunks';
import type { AppDispatch } from '@/store';

export function ReturnsStatusBanner() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectReturnsStatus);
  const hint = useSelector(selectReturnsStatusHint);
  const createStatus = useSelector(selectCreateStatus);
  const createHint = useSelector(selectCreateHint);

  if (status === 'denied') {
    return (
      <div className="returns-banner" data-tone="alert" role="alert">
        <strong>{RETURNS_CONTENT.denied}</strong>
      </div>
    );
  }

  if (status === 'no_branch') {
    return (
      <div className="returns-banner" data-tone="alert" role="alert">
        <strong>{RETURNS_CONTENT.noBranch}</strong>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="returns-banner" data-tone="alert" role="alert">
        {hint ?? RETURNS_CONTENT.loadFailed}{' '}
        <button type="button" className="returns-btn returns-btn-ghost" onClick={() => void dispatch(loadReturns())}>
          {RETURNS_CONTENT.retry}
        </button>
      </div>
    );
  }

  if (createStatus === 'success') {
    return (
      <div className="returns-banner" data-tone="ok" role="status">
        {RETURNS_CONTENT.status.success}
      </div>
    );
  }

  if (createHint && (createStatus === 'failure' || createStatus === 'conflict' || createStatus === 'validation')) {
    return (
      <div className="returns-banner" data-tone="alert" role="alert">
        {createHint}
      </div>
    );
  }

  return null;
}
