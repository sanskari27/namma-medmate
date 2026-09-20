import type { HospitalPriceList } from '@/services/hospital';
import { HospitalAccountFields } from '../hospital-account-fields';
import { HospitalPositionStrip } from '../hospital-position-strip';
import { HospitalPriceListPanel } from '../hospital-price-list-panel';
import { HospitalTermsFields } from '../hospital-terms-fields';
import type { HospitalCreditTerms } from '@/services/hospital';

export function HospitalBillingAccountWorkspace({
  institutionName,
  gstin,
  storesContact,
  billingPhone,
  billingEmail,
  creditTerms,
  creditLimitRupees,
  accountConfigured,
  creditLimitPaise,
  balancePaise,
  availableCreditPaise,
  uniformPercent,
  priceItems,
  disabled,
  onInstitutionName,
  onGstin,
  onStoresContact,
  onBillingPhone,
  onBillingEmail,
  onCreditTerms,
  onCreditLimitRupees,
  onUniformPercent,
}: {
  institutionName: string;
  gstin: string;
  storesContact: string;
  billingPhone: string;
  billingEmail: string;
  creditTerms: HospitalCreditTerms;
  creditLimitRupees: string;
  accountConfigured: boolean;
  creditLimitPaise: number;
  balancePaise: number;
  availableCreditPaise: number;
  uniformPercent: string;
  priceItems: HospitalPriceList['items'];
  disabled: boolean;
  onInstitutionName: (value: string) => void;
  onGstin: (value: string) => void;
  onStoresContact: (value: string) => void;
  onBillingPhone: (value: string) => void;
  onBillingEmail: (value: string) => void;
  onCreditTerms: (value: HospitalCreditTerms) => void;
  onCreditLimitRupees: (value: string) => void;
  onUniformPercent: (value: string) => void;
}) {
  return (
    <div className="hb-grid">
      <section className="hb-panel space-y-4" aria-label="Bill-to institution">
        <HospitalAccountFields
          institutionName={institutionName}
          gstin={gstin}
          storesContact={storesContact}
          billingPhone={billingPhone}
          billingEmail={billingEmail}
          disabled={disabled}
          onInstitutionName={onInstitutionName}
          onGstin={onGstin}
          onStoresContact={onStoresContact}
          onBillingPhone={onBillingPhone}
          onBillingEmail={onBillingEmail}
        />
        <HospitalTermsFields
          creditTerms={creditTerms}
          creditLimitRupees={creditLimitRupees}
          disabled={disabled}
          onCreditTerms={onCreditTerms}
          onCreditLimitRupees={onCreditLimitRupees}
        />
        {accountConfigured ? (
          <HospitalPositionStrip
            creditLimitPaise={creditLimitPaise}
            balancePaise={balancePaise}
            availableCreditPaise={availableCreditPaise}
          />
        ) : null}
      </section>
      <HospitalPriceListPanel
        uniformPercent={uniformPercent}
        items={priceItems}
        disabled={disabled || !accountConfigured}
        onUniformPercent={onUniformPercent}
      />
    </div>
  );
}
