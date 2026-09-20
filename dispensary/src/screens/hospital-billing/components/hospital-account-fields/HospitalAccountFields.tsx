import { Input, Label } from '@atoms';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';

export function HospitalAccountFields({
  institutionName,
  gstin,
  storesContact,
  billingPhone,
  billingEmail,
  disabled,
  onInstitutionName,
  onGstin,
  onStoresContact,
  onBillingPhone,
  onBillingEmail,
}: {
  institutionName: string;
  gstin: string;
  storesContact: string;
  billingPhone: string;
  billingEmail: string;
  disabled: boolean;
  onInstitutionName: (value: string) => void;
  onGstin: (value: string) => void;
  onStoresContact: (value: string) => void;
  onBillingPhone: (value: string) => void;
  onBillingEmail: (value: string) => void;
}) {
  return (
    <div className="hb-fields">
      <div className="space-y-1.5">
        <Label htmlFor="hb-institution">{HOSPITAL_BILLING_CONTENT.institutionLabel}</Label>
        <Input
          id="hb-institution"
          value={institutionName}
          disabled={disabled}
          onChange={(event) => onInstitutionName(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hb-gstin">{HOSPITAL_BILLING_CONTENT.gstinLabel}</Label>
        <Input
          id="hb-gstin"
          value={gstin}
          disabled={disabled}
          onChange={(event) => onGstin(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hb-stores">{HOSPITAL_BILLING_CONTENT.storesContactLabel}</Label>
        <Input
          id="hb-stores"
          value={storesContact}
          disabled={disabled}
          onChange={(event) => onStoresContact(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hb-phone">{HOSPITAL_BILLING_CONTENT.billingPhoneLabel}</Label>
        <Input
          id="hb-phone"
          value={billingPhone}
          disabled={disabled}
          onChange={(event) => onBillingPhone(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hb-email">{HOSPITAL_BILLING_CONTENT.billingEmailLabel}</Label>
        <Input
          id="hb-email"
          type="email"
          value={billingEmail}
          disabled={disabled}
          onChange={(event) => onBillingEmail(event.target.value)}
        />
      </div>
    </div>
  );
}
