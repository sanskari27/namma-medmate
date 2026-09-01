import { Provider } from 'react-redux';
import { HqKycQueuePage } from '@namma-medmate/go-live-kyc-ui';
import { goLiveKycStore } from '../../store/go-live-kyc.ts';
import { HqLayout } from '../layouts/hq-layout.tsx';

export default function HqGoLiveKycRoute() {
  return (
    <HqLayout>
      <Provider store={goLiveKycStore}>
        <HqKycQueuePage />
      </Provider>
    </HqLayout>
  );
}
