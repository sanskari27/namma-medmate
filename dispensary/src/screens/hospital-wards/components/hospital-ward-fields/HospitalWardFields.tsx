import { Input, Label } from '@atoms';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';
import { categoryLabel, WARD_CATEGORIES, type WardDraft } from '../../HospitalWardsScreen.utils';

type HospitalWardFieldsProps = {
  draft: WardDraft;
  disabled: boolean;
  onChange: (patch: Partial<WardDraft>) => void;
};

export function HospitalWardFields({ draft, disabled, onChange }: HospitalWardFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="hw-name">{HOSPITAL_WARDS_CONTENT.wardNameLabel}</Label>
        <Input
          id="hw-name"
          aria-label={HOSPITAL_WARDS_CONTENT.wardNameLabel}
          value={draft.name}
          disabled={disabled}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hw-code">{HOSPITAL_WARDS_CONTENT.wardCodeLabel}</Label>
        <Input
          id="hw-code"
          aria-label={HOSPITAL_WARDS_CONTENT.wardCodeLabel}
          value={draft.code}
          disabled={disabled}
          onChange={(event) => onChange({ code: event.target.value.toUpperCase() })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hw-floor">{HOSPITAL_WARDS_CONTENT.wardFloorLabel}</Label>
        <Input
          id="hw-floor"
          value={draft.floor}
          disabled={disabled}
          onChange={(event) => onChange({ floor: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hw-category">{HOSPITAL_WARDS_CONTENT.wardCategoryLabel}</Label>
        <select
          id="hw-category"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          value={draft.category}
          disabled={disabled}
          onChange={(event) =>
            onChange({ category: event.target.value as WardDraft['category'] })
          }
        >
          {WARD_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {categoryLabel(category)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="hw-capacity">{HOSPITAL_WARDS_CONTENT.wardCapacityLabel}</Label>
        <Input
          id="hw-capacity"
          inputMode="numeric"
          value={draft.capacity}
          disabled={disabled}
          onChange={(event) => onChange({ capacity: event.target.value })}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="hw-nurse">{HOSPITAL_WARDS_CONTENT.wardNurseLabel}</Label>
        <Input
          id="hw-nurse"
          value={draft.nurseInCharge}
          disabled={disabled}
          onChange={(event) => onChange({ nurseInCharge: event.target.value })}
        />
      </div>
    </div>
  );
}
