import { Provider } from 'react-redux';
import { GoLiveWizardPage } from '@namma-medmate/go-live-kyc-ui';
import { goLiveKycStore } from '../store/go-live-kyc.ts';
import { getLocationId } from '../services/api/token.ts';

export function GoLiveKycRoute() {
  return (
    <Provider store={goLiveKycStore}>
      <GoLiveWizardPage locationId={getLocationId() ?? ''} />
    </Provider>
  );
}
