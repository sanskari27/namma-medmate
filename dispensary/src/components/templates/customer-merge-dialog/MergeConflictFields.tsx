import type { CustomerMergePreview, MergeSide } from '@/services/customers';

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
  dateOfBirth: 'Date of birth',
  gender: 'Gender',
  address: 'Address',
  bloodGroup: 'Blood group',
  allergies: 'Allergies',
  chronicConditions: 'Chronic conditions',
};

function displayValue(value: string | null | undefined): string {
  if (value == null || value === '') {
    return '—';
  }
  return value;
}

export type MergeConflictFieldsProps = {
  formId: string;
  preview: CustomerMergePreview;
  resolutions: Record<string, MergeSide>;
  onResolve: (field: string, side: MergeSide) => void;
};

export function MergeConflictFields({
  formId,
  preview,
  resolutions,
  onResolve,
}: MergeConflictFieldsProps) {
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        Linked records moving:{' '}
        <span className="font-mono tabular-nums text-ink">
          {preview.linkedRecords.notificationEvents}
        </span>{' '}
        notification event
        {preview.linkedRecords.notificationEvents === 1 ? '' : 's'}
      </p>

      {preview.conflicts.length === 0 ? (
        <p className="text-sm text-muted">
          No field conflicts. Confirm to move linked records and deactivate the duplicate.
        </p>
      ) : (
        <fieldset className="grid gap-3 border border-line p-3">
          <legend className="px-1 text-sm font-medium text-ink">Resolve conflicting fields</legend>
          {preview.conflicts.map((field) => {
            const row = preview.fields.find((item) => item.field === field);
            const label = FIELD_LABELS[field] ?? field;
            return (
              <div
                key={field}
                className="grid gap-2 border-b border-line pb-3 last:border-0 last:pb-0"
              >
                <p className="text-sm font-medium text-ink">{label}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
                    <input
                      type="radio"
                      name={`${formId}-${field}`}
                      className="mt-1"
                      checked={resolutions[field] === 'SURVIVOR'}
                      onChange={() => onResolve(field, 'SURVIVOR')}
                    />
                    <span>
                      Keep survivor
                      <span className="mt-0.5 block text-muted">
                        {displayValue(row?.survivorValue)}
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
                    <input
                      type="radio"
                      name={`${formId}-${field}`}
                      className="mt-1"
                      checked={resolutions[field] === 'DUPLICATE'}
                      onChange={() => onResolve(field, 'DUPLICATE')}
                    />
                    <span>
                      Use duplicate
                      <span className="mt-0.5 block text-muted">
                        {displayValue(row?.duplicateValue)}
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
