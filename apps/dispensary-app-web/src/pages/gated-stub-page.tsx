import { Provider } from 'react-redux';
import { PlanGate, StubPage } from '@namma-medmate/plan-gating-ui';
import { planGatingStore } from '../store/plan-gating.ts';
import { getLocationId } from '../services/api/token.ts';

export function GatedStubPage({
  moduleKey,
  titleKey,
  moduleLabel,
}: {
  moduleKey: string;
  titleKey: string;
  moduleLabel: string;
}) {
  return (
    <Provider store={planGatingStore}>
      <PlanGate moduleKey={moduleKey} skipQuery={!getLocationId()}>
        <StubPage titleKey={titleKey} moduleLabel={moduleLabel} />
      </PlanGate>
    </Provider>
  );
}
