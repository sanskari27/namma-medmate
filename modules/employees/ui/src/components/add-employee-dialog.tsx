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
} from '@namma-medmate/shared-ui';
import { t } from '../lib/copy.ts';
import { EMPLOYEE_POSITIONS } from '../lib/options.ts';
import {
  useCreateEmployeeMutation,
  useListUnlinkedUsersQuery,
} from '../store/api/employees-api.ts';
import { useEmployeesEvents } from '../hooks/use-employees-events.ts';

export interface AddEmployeeDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  skipQuery?: boolean;
  error?: boolean;
  locationId?: string;
}

export function AddEmployeeDialog({
  open = true,
  onOpenChange,
  skipQuery = false,
  error = false,
  locationId = '',
}: AddEmployeeDialogProps) {
  const [createEmployee, createState] = useCreateEmployeeMutation();
  const usersQuery = useListUnlinkedUsersQuery(undefined, { skip: skipQuery });
  const events = useEmployeesEvents();
  const [position, setPosition] = useState('pharmacist');
  const failed = error || createState.isError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (skipQuery) {
      onOpenChange?.(false);
      return;
    }
    const form = new FormData(event.currentTarget);
    const userId = String(form.get('user_id') || '');
    const result = await createEmployee({
      full_name: String(form.get('full_name')),
      phone: String(form.get('phone')),
      position,
      pharmacist_registration_no: String(form.get('pharmacist_registration_no') || '') || undefined,
      pharmacist_registration_expiry:
        String(form.get('pharmacist_registration_expiry') || '') || undefined,
      user_id: userId || null,
    });
    if (!('error' in result)) {
      events.listChanged(locationId);
      onOpenChange?.(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('employees.add.title')}</DialogTitle>
            <DialogDescription>{t('employees.list.subtitle')}</DialogDescription>
          </DialogHeader>
          {failed ? <StatusBanner tone="error">{t('employees.add.error')}</StatusBanner> : null}
          <div className="grid gap-2">
            <Label htmlFor="add-full-name">{t('employees.add.fullName')}</Label>
            <Input id="add-full-name" name="full_name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-phone">{t('employees.add.phone')}</Label>
            <Input id="add-phone" name="phone" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-position">{t('employees.add.position')}</Label>
            <select
              id="add-position"
              aria-label={t('employees.add.position')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
            >
              {EMPLOYEE_POSITIONS.map((item) => (
                <option key={item} value={item}>
                  {t(`employees.positions.${item}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-reg">{t('employees.add.registration')}</Label>
            <Input id="add-reg" name="pharmacist_registration_no" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-expiry">{t('employees.add.expiry')}</Label>
            <Input id="add-expiry" name="pharmacist_registration_expiry" placeholder="YYYY-MM-DD" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-user">{t('employees.add.user')}</Label>
            <select
              id="add-user"
              name="user_id"
              aria-label={t('employees.add.user')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t('employees.add.none')}</option>
              {(usersQuery.data ?? []).map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.login_id}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit">{t('employees.add.submit')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
