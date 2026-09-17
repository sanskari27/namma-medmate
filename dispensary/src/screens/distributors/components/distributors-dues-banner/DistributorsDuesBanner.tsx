import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '@/libs/constants/routes.const';
import { DISTRIBUTORS_CONTENT } from '../../DistributorsScreen.content';
import { formatPaise } from '../../DistributorsScreen.utils';
import {
  selectDistributorDues,
  selectDistributorDuesPlanLimit,
} from '../../store/distributors.selectors';

export function DistributorsDuesBanner() {
  const dues = useSelector(selectDistributorDues);
  const planLimit = useSelector(selectDistributorDuesPlanLimit);

  if (planLimit) {
    return (
      <div className="dist-banner" data-tone="alert" role="status">
        {DISTRIBUTORS_CONTENT.dues.planLimit}{' '}
        <Link to={ROUTES.SUBSCRIPTION}>{DISTRIBUTORS_CONTENT.dues.openPlan}</Link>
      </div>
    );
  }

  const overdue = dues.filter((row) => row.overdue);
  if (overdue.length === 0 && dues.length === 0) {
    return null;
  }

  const shown = overdue.length > 0 ? overdue : dues;
  return (
    <div className="dist-banner" data-tone={overdue.length > 0 ? 'alert' : 'ok'} role="status">
      {overdue.length > 0
        ? DISTRIBUTORS_CONTENT.dues.overdue(overdue.length)
        : DISTRIBUTORS_CONTENT.dues.dueSoon}{' '}
      {shown.slice(0, 3).map((row) => (
        <span key={`${row.supplierId}-${row.dueOn}`}>
          {row.legalName} {formatPaise(row.balancePaise)} due {row.dueOn}.{' '}
        </span>
      ))}
    </div>
  );
}
