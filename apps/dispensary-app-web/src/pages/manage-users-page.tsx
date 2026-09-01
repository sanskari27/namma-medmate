import { Provider } from 'react-redux';
import { ManageUsersPage } from '@namma-medmate/manage-users-ui';
import { manageUsersStore } from '../store/manage-users.ts';
import { getLocationId } from '../services/api/token.ts';

export function ManageUsersRoute() {
  return (
    <Provider store={manageUsersStore}>
      <ManageUsersPage locationId={getLocationId() ?? ''} />
    </Provider>
  );
}
