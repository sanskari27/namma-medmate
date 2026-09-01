import { useState, type FormEvent } from 'react';
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  StatusBanner,
} from '@namma-medmate/shared-ui';
import { t } from '../lib/copy.ts';
import { downloadBlob } from '../lib/download.ts';
import { EMPLOYEE_STATUSES } from '../lib/options.ts';
import { useEmployeesEvents } from '../hooks/use-employees-events.ts';
import {
  useGetEmployeeQuery,
  useGetIdCardMutation,
  usePatchEmployeeMutation,
  type EmployeeDetail,
} from '../store/api/employees-api.ts';

export interface EmployeeDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  skipQuery?: boolean;
  employeeId?: string;
  employee?: EmployeeDetail;
  error?: boolean;
  locationId?: string;
}

export function EmployeeDrawer({
  open = true,
  onOpenChange,
  skipQuery = false,
  employeeId,
  employee: seeded,
  error = false,
  locationId = '',
}: EmployeeDrawerProps) {
  const resolvedId = employeeId ?? seeded?.employee_id ?? '';
  const query = useGetEmployeeQuery({ employeeId: resolvedId }, { skip: skipQuery || !resolvedId });
  const employee = skipQuery ? seeded : query.data;
  const failed = error || query.isError;
  const events = useEmployeesEvents();
  const [patchEmployee, patchState] = usePatchEmployeeMutation();
  const [getIdCard, idCardState] = useGetIdCardMutation();
  const [status, setStatus] = useState(employee?.status ?? 'active');
  const saveFailed = failed || patchState.isError || idCardState.isError;

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (skipQuery) {
      onOpenChange?.(false);
      return;
    }
    const form = new FormData(event.currentTarget);
    const result = await patchEmployee({
      employeeId: resolvedId,
      body: {
        full_name: String(form.get('full_name')),
        phone: String(form.get('phone')),
        email: String(form.get('email') || '') || null,
        status,
        pan: String(form.get('pan') || '') || null,
        aadhaar: String(form.get('aadhaar') || '') || null,
        bank_account_holder: String(form.get('bank_account_holder') || '') || null,
        bank_ifsc: String(form.get('bank_ifsc') || '') || null,
        bank_upi_id: String(form.get('bank_upi_id') || '') || null,
        emergency_name: String(form.get('emergency_name') || '') || null,
        emergency_phone: String(form.get('emergency_phone') || '') || null,
        user_id: employee?.user_id ?? null,
      },
    });
    if (!('error' in result)) {
      events.listChanged(locationId);
      onOpenChange?.(false);
    }
  }

  async function handleIdCard(): Promise<void> {
    if (skipQuery) {
      downloadBlob('id-card.pdf', new Blob(['%PDF-1.4 skip'], { type: 'application/pdf' }));
      return;
    }
    const result = await getIdCard({ employeeId: resolvedId });
    if (!('error' in result) && result.data) {
      downloadBlob('id-card.pdf', result.data);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <form className="grid gap-5" onSubmit={handleSave}>
          <SheetHeader>
            <SheetTitle>{t('employees.drawer.title')}</SheetTitle>
            <SheetDescription>{employee?.employee_code ?? ''}</SheetDescription>
          </SheetHeader>
          {saveFailed ? (
            <StatusBanner tone="error">{t('employees.drawer.error')}</StatusBanner>
          ) : null}
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">{t('employees.drawer.personal')}</legend>
            <div className="grid gap-2">
              <Label htmlFor="edit-full-name">{t('employees.add.fullName')}</Label>
              <Input
                id="edit-full-name"
                name="full_name"
                defaultValue={employee?.full_name ?? ''}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">{t('employees.add.phone')}</Label>
              <Input id="edit-phone" name="phone" defaultValue={employee?.phone ?? ''} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">{t('employees.drawer.email')}</Label>
              <Input id="edit-email" name="email" defaultValue={employee?.email ?? ''} />
            </div>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">{t('employees.drawer.employment')}</legend>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">{t('employees.list.status')}</Label>
              <select
                id="edit-status"
                aria-label={t('employees.list.status')}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {EMPLOYEE_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {t(`employees.statuses.${item}`)}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">{t('employees.drawer.identity')}</legend>
            <div className="grid gap-2">
              <Label htmlFor="edit-pan">{t('employees.drawer.pan')}</Label>
              <Input id="edit-pan" name="pan" defaultValue={employee?.pan ?? ''} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-aadhaar">{t('employees.drawer.aadhaar')}</Label>
              <Input
                id="edit-aadhaar"
                name="aadhaar"
                defaultValue={employee?.aadhaar_masked ?? employee?.aadhaar ?? ''}
              />
            </div>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">{t('employees.drawer.bank')}</legend>
            <div className="grid gap-2">
              <Label htmlFor="edit-holder">{t('employees.drawer.holder')}</Label>
              <Input
                id="edit-holder"
                name="bank_account_holder"
                defaultValue={employee?.bank_account_holder ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-ifsc">{t('employees.drawer.ifsc')}</Label>
              <Input id="edit-ifsc" name="bank_ifsc" defaultValue={employee?.bank_ifsc ?? ''} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-upi">{t('employees.drawer.upi')}</Label>
              <Input id="edit-upi" name="bank_upi_id" defaultValue={employee?.bank_upi_id ?? ''} />
            </div>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">{t('employees.drawer.emergency')}</legend>
            <div className="grid gap-2">
              <Label htmlFor="edit-emergency-name">{t('employees.drawer.emergencyName')}</Label>
              <Input
                id="edit-emergency-name"
                name="emergency_name"
                defaultValue={employee?.emergency_name ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-emergency-phone">{t('employees.drawer.emergencyPhone')}</Label>
              <Input
                id="edit-emergency-phone"
                name="emergency_phone"
                defaultValue={employee?.emergency_phone ?? ''}
              />
            </div>
          </fieldset>
          <div className="grid gap-2">
            <p className="text-sm font-medium">{t('employees.drawer.documents')}</p>
            {employee?.documents?.length ? (
              <ul className="list-disc pl-5 text-sm">
                {employee.documents.map((doc) => (
                  <li key={doc.document_id}>{doc.file_name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('employees.drawer.noDocuments')}</p>
            )}
          </div>
          <SheetFooter className="flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={() => void handleIdCard()}>
              {t('employees.drawer.idCard')}
            </Button>
            <Button type="submit">{t('employees.drawer.save')}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
