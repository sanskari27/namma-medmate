import { Provider } from 'react-redux';
import { PlanGate } from '@namma-medmate/plan-gating-ui';
import { EmployeesPage } from '@namma-medmate/employees-ui';
import { employeesStore } from '../store/employees.ts';
import { planGatingStore } from '../store/plan-gating.ts';
import { getLocationId } from '../services/api/token.ts';

export function EmployeesRoute() {
  const locationId = getLocationId();
  return (
    <Provider store={planGatingStore}>
      <PlanGate moduleKey="employees" skipQuery={!locationId}>
        <Provider store={employeesStore}>
          <EmployeesPage locationId={locationId ?? ''} />
        </Provider>
      </PlanGate>
    </Provider>
  );
}
