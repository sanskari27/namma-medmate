import { Provider } from 'react-redux';
import { MasterCataloguePage } from '../../pages/master-catalogue-page.tsx';
import { masterCatalogueStore } from '../../store/master-catalogue.ts';
import { HqLayout } from '../layouts/hq-layout.tsx';

export default function HqMasterCatalogueRoute() {
  return (
    <HqLayout>
      <Provider store={masterCatalogueStore}>
        <MasterCataloguePage />
      </Provider>
    </HqLayout>
  );
}
