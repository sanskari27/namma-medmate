import { Button } from '@atoms';
import type { ProductCategory } from '@/services/productCategories';
import type { Supplier } from '@/services/suppliers';
import type { FormEvent } from 'react';
import type { FormState } from '../../DistributorsScreen.utils';
import { DistributorAddressFields } from '../distributor-address-fields';
import { DistributorBankFields } from '../distributor-bank-fields';
import { DistributorContactFields } from '../distributor-contact-fields';
import { DistributorIdentityFields } from '../distributor-identity-fields';
import { DistributorLicenseFields } from '../distributor-license-fields';
import { DistributorProcurementHistory } from '../distributor-procurement-history';
import { DistributorTermsFields } from '../distributor-terms-fields';

export type DistributorFormPanelProps = {
  formId: string;
  form: FormState;
  selected: Supplier | null;
  creating: boolean;
  busy: boolean;
  categories: ProductCategory[];
  outletName?: string | null;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function DistributorFormPanel({
  formId,
  form,
  selected,
  creating,
  busy,
  categories,
  outletName,
  onChange,
  onCancel,
  onSubmit,
}: DistributorFormPanelProps) {
  if (!creating && !selected) {
    return (
      <section
        aria-label="Supplier detail"
        className="flex h-full min-h-0 items-center border border-line bg-surface px-4 py-8 text-sm text-muted"
      >
        Select a stockist, or add the first supplier for this pharmacy.
      </section>
    );
  }

  return (
    <section
      aria-label="Supplier detail"
      className="flex h-full min-h-0 flex-col border border-line bg-surface"
    >
      <form
        id={formId}
        noValidate
        className="flex h-full min-h-0 flex-1 flex-col"
        onSubmit={onSubmit}
      >
        <div className="panel-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <DistributorIdentityFields formId={formId} form={form} onChange={onChange} />
          <DistributorContactFields formId={formId} form={form} onChange={onChange} />
          <DistributorAddressFields formId={formId} form={form} onChange={onChange} />
          <DistributorLicenseFields
            formId={formId}
            form={form}
            licenseStatus={selected?.licenseStatus}
            onChange={onChange}
          />
          <DistributorTermsFields
            formId={formId}
            form={form}
            categories={categories}
            onChange={onChange}
          />
          <DistributorBankFields formId={formId} form={form} onChange={onChange} />
          {creating ? null : (
            <DistributorProcurementHistory
              procurement={selected?.branchProcurement ?? null}
              outletName={outletName}
            />
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {creating ? 'Save supplier' : 'Save changes'}
          </Button>
        </div>
      </form>
    </section>
  );
}
