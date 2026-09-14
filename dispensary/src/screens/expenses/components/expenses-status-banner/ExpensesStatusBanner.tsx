import { useSelector } from 'react-redux';
import { statusCopy, statusIcon } from '../../ExpensesScreen.utils';
import { selectExpensesStatus, selectExpensesStatusHint } from '../../store';

export function ExpensesStatusBanner() {
  const status = useSelector(selectExpensesStatus);
  const hint = useSelector(selectExpensesStatusHint);
  const copy = statusCopy(status, hint);
  if (!copy || status === 'loading' || status === 'empty' || status === null) {
    return null;
  }
  const Icon = statusIcon(status);
  const tone = status === 'success' ? 'ok' : 'alert';
  return (
    <p className="ex-alert" data-tone={tone} role={status === 'success' ? 'status' : 'alert'}>
      <Icon size={16} aria-hidden />
      <span>{copy}</span>
    </p>
  );
}
