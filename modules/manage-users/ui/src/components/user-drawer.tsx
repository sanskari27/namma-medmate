import { useState, type FormEvent } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Checkbox,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  StatusBanner,
  Switch,
} from '@namma-medmate/shared-ui';
import { t } from '../lib/copy.ts';
import { PERMISSION_KEYS } from '../lib/permissions.ts';
import { useManageUsersEvents } from '../hooks/use-manage-users-events.ts';
import {
  useCopyPasswordMutation,
  useDeletePinMutation,
  useGetUserQuery,
  usePatchUserMutation,
  usePutMethodsMutation,
  usePutPermissionsMutation,
  usePutPinMutation,
  useRemoveUserMutation,
  useResetPasswordMutation,
  useRevokeAllDevicesMutation,
  useRevokeDeviceMutation,
  useShareLinkMutation,
  type ManageUserDetail,
} from '../store/api/manage-users-api.ts';

export interface UserDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  skipQuery?: boolean;
  userId?: string;
  user?: ManageUserDetail;
  error?: boolean;
  locationId?: string;
}

async function writeClipboard(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function UserDrawer({
  open = true,
  onOpenChange,
  skipQuery = false,
  userId,
  user: seeded,
  error = false,
  locationId = '',
}: UserDrawerProps) {
  const resolvedId = userId ?? seeded?.user_id ?? '';
  const query = useGetUserQuery({ userId: resolvedId }, { skip: skipQuery || !resolvedId });
  const user = skipQuery ? seeded : query.data;
  const failed = error || query.isError;
  const events = useManageUsersEvents();
  const [patchUser] = usePatchUserMutation();
  const [putMethods] = usePutMethodsMutation();
  const [putPermissions] = usePutPermissionsMutation();
  const [resetPassword] = useResetPasswordMutation();
  const [copyPassword] = useCopyPasswordMutation();
  const [putPin] = usePutPinMutation();
  const [deletePin] = useDeletePinMutation();
  const [revokeDevice] = useRevokeDeviceMutation();
  const [revokeAllDevices] = useRevokeAllDevicesMutation();
  const [shareLink] = useShareLinkMutation();
  const [removeUser] = useRemoveUserMutation();
  const [notice, setNotice] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const owner = user?.role === 'owner';

  async function copyTemp(): Promise<void> {
    if (!user) {
      return;
    }
    if (skipQuery) {
      setNotice(t('manageUsers.drawer.copied'));
      return;
    }
    const result = await copyPassword({ userId: user.user_id });
    if ('data' in result && result.data?.temp_password) {
      await writeClipboard(result.data.temp_password);
      setNotice(t('manageUsers.drawer.copied'));
    } else {
      setSaveError(true);
    }
  }

  async function handleResetPassword(): Promise<void> {
    if (!user) {
      return;
    }
    if (skipQuery) {
      setNotice(t('manageUsers.drawer.copied'));
      return;
    }
    const result = await resetPassword({ userId: user.user_id });
    if ('data' in result && result.data?.temp_password) {
      await writeClipboard(result.data.temp_password);
      setNotice(t('manageUsers.drawer.copied'));
      events.userSaved(user.user_id);
    } else {
      setSaveError(true);
    }
  }

  async function handleMethods(passwordEnabled: boolean, otpEnabled: boolean): Promise<void> {
    if (!user || skipQuery) {
      return;
    }
    const result = await putMethods({
      userId: user.user_id,
      password_enabled: passwordEnabled,
      otp_enabled: otpEnabled,
      otp_mobile: user.otp_mobile,
    });
    if ('error' in result) {
      setSaveError(true);
      return;
    }
    events.userSaved(user.user_id);
  }

  async function handleActive(active: boolean): Promise<void> {
    if (!user || skipQuery) {
      return;
    }
    const result = await patchUser({ userId: user.user_id, active });
    if ('error' in result) {
      setSaveError(true);
      return;
    }
    events.listChanged(locationId);
    events.userSaved(user.user_id);
  }

  async function handlePermissions(
    mode: 'select_all' | 'reset_defaults' | 'merge',
    key?: string,
    checked?: boolean,
  ): Promise<void> {
    if (!user || skipQuery) {
      return;
    }
    const result = await putPermissions({
      userId: user.user_id,
      mode,
      permissions: key ? { [key]: checked === true } : undefined,
    });
    if ('error' in result) {
      setSaveError(true);
      return;
    }
    events.userSaved(user.user_id);
  }

  async function handlePin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || skipQuery) {
      return;
    }
    const pin = String(new FormData(event.currentTarget).get('pin') ?? '');
    const result = await putPin({ userId: user.user_id, pin });
    if ('error' in result) {
      setSaveError(true);
    }
  }

  async function handleShare(): Promise<void> {
    if (!user) {
      return;
    }
    if (skipQuery) {
      return;
    }
    const result = await shareLink({ userId: user.user_id });
    if ('data' in result && result.data?.url) {
      globalThis.open(result.data.url, '_blank', 'noopener');
    }
  }

  async function handleRemove(): Promise<void> {
    if (!user || skipQuery) {
      onOpenChange?.(false);
      return;
    }
    const result = await removeUser({ userId: user.user_id });
    if ('error' in result) {
      setSaveError(true);
      return;
    }
    events.listChanged(locationId);
    onOpenChange?.(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>{t('manageUsers.drawer.title')}</SheetTitle>
          <SheetDescription>{user?.login_id ?? ''}</SheetDescription>
        </SheetHeader>
        {failed || saveError ? (
          <StatusBanner tone="error">{t('manageUsers.drawer.error')}</StatusBanner>
        ) : null}
        {notice ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {notice}
          </p>
        ) : null}
        {user ? (
          <div className="grid gap-5 px-4">
            <div className="grid gap-2">
              <Label>{t('manageUsers.drawer.role')}</Label>
              <Input value={t(`manageUsers.roles.${user.role}`)} disabled readOnly />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={user.active}
                disabled={owner}
                onCheckedChange={(checked) => {
                  void handleActive(checked === true);
                }}
                aria-label={t('manageUsers.drawer.active')}
              />
              {t('manageUsers.drawer.active')}
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={user.password_enabled}
                onCheckedChange={(checked) => {
                  void handleMethods(checked === true, user.otp_enabled);
                }}
                aria-label={t('manageUsers.drawer.password')}
              />
              {t('manageUsers.drawer.password')}
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={user.otp_enabled}
                onCheckedChange={(checked) => {
                  void handleMethods(user.password_enabled, checked === true);
                }}
                aria-label={t('manageUsers.drawer.otp')}
              />
              {t('manageUsers.drawer.otp')}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void handleResetPassword()}>
                {t('manageUsers.drawer.resetPassword')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!user.temp_password_pending}
                onClick={() => void copyTemp()}
              >
                {t('manageUsers.drawer.copyPassword')}
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleShare()}>
                {t('manageUsers.drawer.share')}
              </Button>
            </div>
            <form className="grid gap-2" onSubmit={(event) => void handlePin(event)}>
              <Label htmlFor="user-pin">{t('manageUsers.drawer.pin')}</Label>
              <p className="text-sm text-muted-foreground">
                {user.pin_set ? t('manageUsers.drawer.pinSet') : t('manageUsers.drawer.pinUnset')}
              </p>
              <Input id="user-pin" name="pin" inputMode="numeric" minLength={4} maxLength={6} />
              <div className="flex gap-2">
                <Button type="submit" variant="outline">
                  {t('manageUsers.drawer.setPin')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (skipQuery || !user) {
                      return;
                    }
                    void deletePin({ userId: user.user_id });
                  }}
                >
                  {t('manageUsers.drawer.clearPin')}
                </Button>
              </div>
            </form>
            <section className="grid gap-3">
              <h2 className="text-sm font-semibold">{t('manageUsers.drawer.devices')}</h2>
              {(user.saved_devices ?? []).map((device) => (
                <div key={device.device_id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{device.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (skipQuery) {
                        return;
                      }
                      void revokeDevice({ userId: user.user_id, deviceId: device.device_id });
                    }}
                  >
                    {t('manageUsers.drawer.revokeDevice')}
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (skipQuery || !user) {
                    return;
                  }
                  void revokeAllDevices({ userId: user.user_id });
                }}
              >
                {t('manageUsers.drawer.revokeAll')}
              </Button>
            </section>
            <section className="grid gap-3">
              <h2 className="text-sm font-semibold">{t('manageUsers.drawer.permissions')}</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handlePermissions('select_all')}
                >
                  {t('manageUsers.drawer.selectAll')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handlePermissions('reset_defaults')}
                >
                  {t('manageUsers.drawer.resetDefaults')}
                </Button>
              </div>
              <ul className="grid gap-2">
                {PERMISSION_KEYS.map((key) => (
                  <li key={key} className="flex items-center gap-3">
                    <Checkbox
                      checked={user.permissions?.[key] === true}
                      disabled={owner}
                      aria-label={key}
                      onCheckedChange={(checked) => {
                        void handlePermissions('merge', key, checked === true);
                      }}
                    />
                    <span className="text-sm">{key}</span>
                  </li>
                ))}
              </ul>
            </section>
            {owner ? null : (
              <Button type="button" variant="destructive" onClick={() => setConfirmRemove(true)}>
                {t('manageUsers.drawer.remove')}
              </Button>
            )}
          </div>
        ) : null}
        <SheetFooter />
      </SheetContent>
      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('manageUsers.drawer.remove')}</AlertDialogTitle>
            <AlertDialogDescription>{t('manageUsers.drawer.removeConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('manageUsers.drawer.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRemove()}>
              {t('manageUsers.drawer.removeConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
