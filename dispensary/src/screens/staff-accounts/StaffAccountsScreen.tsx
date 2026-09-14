import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { deactivateStaff, type StaffAccount } from '@/services/staff';
import { isApiError, ApiError } from '@/services/axios';
import './StaffAccountsScreen.css';
import { AddTillLoginDialog } from './components/add-till-login-dialog';
import { BranchesDialog } from './components/branches-dialog';
import { OffboardTillDialog } from './components/offboard-till-dialog';
import { RolesDialog } from './components/roles-dialog';
import { StaffStats } from './components/staff-stats';
import { StaffStatusBanner } from './components/staff-status-banner';
import { StaffTable } from './components/staff-table';
import { StaffToolbar } from './components/staff-toolbar';
import { TillPasswordDialog } from './components/till-password-dialog';
import {
  accessDenied,
  addOpened,
  bannerSet,
  loadStaff,
  selectStaffAddOpen,
} from './store';

export default function StaffAccountsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const owner = role === 'pharmacy_owner';
  const addOpen = useSelector(selectStaffAddOpen);
  const [passwordFor, setPasswordFor] = useState<StaffAccount | null>(null);
  const [rolesFor, setRolesFor] = useState<StaffAccount | null>(null);
  const [branchesFor, setBranchesFor] = useState<StaffAccount | null>(null);
  const [offboardFor, setOffboardFor] = useState<StaffAccount | null>(null);
  const [offboardBusy, setOffboardBusy] = useState(false);

  useEffect(() => {
    if (!owner) {
      dispatch(accessDenied('Only the pharmacy owner can add or remove staff access.'));
      return;
    }
    void dispatch(loadStaff());
  }, [dispatch, owner]);

  const onDeactivate = async () => {
    if (!offboardFor) {
      return;
    }
    setOffboardBusy(true);
    try {
      await deactivateStaff(offboardFor.id);
      setOffboardFor(null);
      dispatch(bannerSet('Access removed. Their record remains on file.'));
      await dispatch(loadStaff());
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 403 || error.status === 404) {
          dispatch(accessDenied('Only the pharmacy owner can add or remove staff access.'));
        } else if (error.status === 409) {
          dispatch(bannerSet('Access has already been removed.'));
        }
      }
    } finally {
      setOffboardBusy(false);
    }
  };

  return (
    <div className="st" aria-label="Staff accounts">
      <StaffStatusBanner />
      {owner ? (
        <>
          <StaffStats />
          <StaffToolbar owner={owner} />
          <StaffTable
            onPassword={setPasswordFor}
            onRoles={setRolesFor}
            onBranches={setBranchesFor}
            onOffboard={setOffboardFor}
          />
          <AddTillLoginDialog
            open={addOpen}
            onOpenChange={(open) => dispatch(addOpened(open))}
            onSuccess={async (message) => {
              dispatch(bannerSet(message));
              await dispatch(loadStaff());
            }}
          />
          {passwordFor ? (
            <TillPasswordDialog
              staff={passwordFor}
              open
              onOpenChange={(open) => {
                if (!open) {
                  setPasswordFor(null);
                }
              }}
              onSuccess={(message) => dispatch(bannerSet(message))}
            />
          ) : null}
          {rolesFor ? (
            <RolesDialog
              staff={rolesFor}
              open
              onOpenChange={(open) => {
                if (!open) {
                  setRolesFor(null);
                }
              }}
              onSuccess={(message) => dispatch(bannerSet(message))}
            />
          ) : null}
          {branchesFor ? (
            <BranchesDialog
              staff={branchesFor}
              open
              onOpenChange={(open) => {
                if (!open) {
                  setBranchesFor(null);
                }
              }}
              onSuccess={(message) => dispatch(bannerSet(message))}
            />
          ) : null}
          {offboardFor ? (
            <OffboardTillDialog
              staff={offboardFor}
              open
              busy={offboardBusy}
              onOpenChange={(open) => {
                if (!open) {
                  setOffboardFor(null);
                }
              }}
              onConfirm={() => void onDeactivate()}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
