import { useState, type FormEvent } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  StatusBanner,
  Switch,
} from '@namma-medmate/shared-ui';
import { t } from '../lib/copy.ts';
import { ADDABLE_ROLES, type StaffRole } from '../lib/permissions.ts';
import { useCreateUserMutation } from '../store/api/manage-users-api.ts';
import { useManageUsersEvents } from '../hooks/use-manage-users-events.ts';

export interface AddUserDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  skipQuery?: boolean;
  error?: boolean;
  locationId?: string;
}

export function AddUserDialog({
  open = true,
  onOpenChange,
  skipQuery = false,
  error = false,
  locationId = '',
}: AddUserDialogProps) {
  const [createUser, createState] = useCreateUserMutation();
  const events = useManageUsersEvents();
  const [role, setRole] = useState<Exclude<StaffRole, 'owner'>>('cashier');
  const [passwordEnabled, setPasswordEnabled] = useState(true);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const failed = error || createState.isError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (skipQuery) {
      onOpenChange?.(false);
      return;
    }
    const form = new FormData(event.currentTarget);
    const pin = String(form.get('pin'));
    const result = await createUser({
      login_id: String(form.get('login_id')),
      role,
      password_enabled: passwordEnabled,
      otp_enabled: otpEnabled,
      otp_mobile: otpEnabled ? String(form.get('otp_mobile')) : null,
      pin: pin.length > 0 ? pin : undefined,
    });
    if (!('error' in result)) {
      events.listChanged(locationId);
      if (result.data?.user_id) {
        events.userSaved(result.data.user_id);
      }
      onOpenChange?.(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('manageUsers.add.title')}</DialogTitle>
            <DialogDescription>{t('manageUsers.list.subtitle')}</DialogDescription>
          </DialogHeader>
          {failed ? <StatusBanner tone="error">{t('manageUsers.add.error')}</StatusBanner> : null}
          <div className="grid gap-2">
            <Label htmlFor="add-login-id">{t('manageUsers.add.loginId')}</Label>
            <Input id="add-login-id" name="login_id" required minLength={3} maxLength={64} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-role">{t('manageUsers.add.role')}</Label>
            <select
              id="add-role"
              aria-label={t('manageUsers.add.role')}
              className="h-11 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={role}
              onChange={(event) => {
                setRole(event.target.value as Exclude<StaffRole, 'owner'>);
              }}
            >
              {ADDABLE_ROLES.map((item) => (
                <option key={item} value={item}>
                  {t(`manageUsers.roles.${item}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Switch
              checked={passwordEnabled}
              onCheckedChange={(checked) => setPasswordEnabled(checked === true)}
              aria-label={t('manageUsers.add.password')}
            />
            <span>{t('manageUsers.add.password')}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Switch
              checked={otpEnabled}
              onCheckedChange={(checked) => setOtpEnabled(checked === true)}
              aria-label={t('manageUsers.add.otp')}
            />
            <span>{t('manageUsers.add.otp')}</span>
          </div>
          {otpEnabled ? (
            <div className="grid gap-2">
              <Label htmlFor="add-otp-mobile">{t('manageUsers.add.otpMobile')}</Label>
              <Input id="add-otp-mobile" name="otp_mobile" placeholder="+91" />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="add-pin">{t('manageUsers.add.pin')}</Label>
            <Input id="add-pin" name="pin" inputMode="numeric" minLength={4} maxLength={6} />
          </div>
          <DialogFooter>
            <Button type="submit">{t('manageUsers.add.submit')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
