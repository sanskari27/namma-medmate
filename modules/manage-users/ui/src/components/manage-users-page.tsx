import { useState } from 'react';
import {
  Badge,
  Button,
  StatusBanner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@namma-medmate/shared-ui';
import { t } from '../lib/copy.ts';
import { methodsLabel } from '../lib/permissions.ts';
import { atSeatCap, seatChipVars, type SeatSummary } from '../lib/seats.ts';
import { AddUserDialog } from './add-user-dialog.tsx';
import { UserDrawer } from './user-drawer.tsx';
import {
  useGetSeatsQuery,
  useListUsersQuery,
  type ManageUserDetail,
  type ManageUserListItem,
} from '../store/api/manage-users-api.ts';

export interface ManageUsersPageProps {
  skipQuery?: boolean;
  seats?: SeatSummary;
  items?: ManageUserListItem[];
  error?: boolean;
  addOpen?: boolean;
  selectedUserId?: string;
  selectedUser?: ManageUserDetail;
  locationId?: string;
}

const EMPTY_SEATS: SeatSummary = {
  plan: 'free',
  seat_limit: 2,
  active_count: 0,
  unlimited: false,
};

export function ManageUsersPage({
  skipQuery = false,
  seats: seededSeats,
  items: seededItems = [],
  error = false,
  addOpen = false,
  selectedUserId,
  selectedUser,
  locationId = '',
}: ManageUsersPageProps) {
  const seatsQuery = useGetSeatsQuery(undefined, { skip: skipQuery });
  const listQuery = useListUsersQuery(undefined, { skip: skipQuery });
  const seats = skipQuery ? (seededSeats ?? EMPTY_SEATS) : (seatsQuery.data ?? EMPTY_SEATS);
  const items = skipQuery ? seededItems : (listQuery.data?.items ?? []);
  const failed = error || (!skipQuery && (seatsQuery.isError || listQuery.isError));
  const capped = atSeatCap(seats);
  const [modalOpen, setModalOpen] = useState(addOpen);
  const [drawerId, setDrawerId] = useState<string | undefined>(selectedUserId);
  const selected =
    selectedUser && selectedUser.user_id === drawerId
      ? selectedUser
      : items.find((item) => item.user_id === drawerId);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t('manageUsers.list.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('manageUsers.list.subtitle')}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Badge variant="secondary">
            {t(
              seats.unlimited ? 'manageUsers.list.seatsUnlimited' : 'manageUsers.list.seats',
              seatChipVars(seats),
            )}
          </Badge>
          <Button
            type="button"
            disabled={capped}
            aria-disabled={capped}
            onClick={() => {
              if (!capped) {
                setModalOpen(true);
              }
            }}
          >
            {t('manageUsers.list.add')}
          </Button>
          {capped ? (
            <p className="max-w-sm text-sm text-muted-foreground" aria-live="polite">
              {t('manageUsers.list.addDisabled')}
            </p>
          ) : null}
        </div>
      </header>
      {failed ? <StatusBanner tone="error">{t('manageUsers.list.error')}</StatusBanner> : null}
      {!failed && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('manageUsers.list.empty')}</p>
      ) : null}
      {items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('manageUsers.list.loginId')}</TableHead>
              <TableHead>{t('manageUsers.list.role')}</TableHead>
              <TableHead>{t('manageUsers.list.methods')}</TableHead>
              <TableHead>{t('manageUsers.list.active')}</TableHead>
              <TableHead>{t('manageUsers.list.devices')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.user_id}>
                <TableCell>
                  <Button
                    type="button"
                    variant="link"
                    className="h-11 px-0"
                    onClick={() => setDrawerId(item.user_id)}
                  >
                    {t('manageUsers.list.open', { loginId: item.login_id })}
                  </Button>
                </TableCell>
                <TableCell>{t(`manageUsers.roles.${item.role}`)}</TableCell>
                <TableCell>{methodsLabel(item.password_enabled, item.otp_enabled)}</TableCell>
                <TableCell>{item.active ? t('manageUsers.drawer.active') : ''}</TableCell>
                <TableCell>{item.saved_device_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      {modalOpen ? (
        <AddUserDialog
          open
          onOpenChange={setModalOpen}
          skipQuery={skipQuery}
          locationId={locationId}
        />
      ) : null}
      {selected ? (
        <UserDrawer
          open
          onOpenChange={(next) => {
            if (!next) {
              setDrawerId(undefined);
            }
          }}
          skipQuery={skipQuery}
          userId={selected.user_id}
          user={
            selectedUser && selectedUser.user_id === selected.user_id
              ? selectedUser
              : skipQuery
                ? { ...selected, permissions: selected.permissions ?? {}, saved_devices: [] }
                : undefined
          }
          locationId={locationId}
        />
      ) : null}
    </section>
  );
}
