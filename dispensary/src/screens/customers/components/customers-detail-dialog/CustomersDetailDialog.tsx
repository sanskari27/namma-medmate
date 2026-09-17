import { useEffect, useId, useState, type FormEvent } from 'react';
import { Check, MessageCircle, Pencil, Store, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { Customer, CustomerInput } from '@/services/customers';
import { CUSTOMERS_CONTENT } from '../../CustomersScreen.content';
import {
  creditTotals,
  formatIstDateTime,
  formatPaise,
  formatPhone,
  ledgerLabel,
  posSaleHref,
  smsHref,
  whatsappHref,
} from '../../CustomersScreen.utils';
import {
  selectCustomerCredit,
  selectCustomerDetailLoading,
  selectCustomerEditHint,
  selectCustomerProfile,
  selectCustomerPurchases,
  selectCustomerSaveBusy,
  selectEditCustomerOpen,
  selectSelectedCustomer,
} from '../../store/customers.selectors';
import {
  closeCustomerDetail,
  closeEditCustomer,
  openEditCustomer,
  openSettleCredit,
} from '../../store/customers.slice';
import { CustomersCrmOps } from '../customers-crm-ops';
import { saveCustomerProfile } from '../../store/customers.thunks';

type EditForm = {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  bloodGroup: string;
  allergies: string;
  chronicConditions: string;
};

const emptyForm = (): EditForm => ({
  name: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  bloodGroup: '',
  allergies: '',
  chronicConditions: '',
});

function formFromProfile(profile: Customer | null, fallback: { name: string; phone: string | null }): EditForm {
  if (!profile) {
    return {
      ...emptyForm(),
      name: fallback.name,
      phone: fallback.phone ?? '',
    };
  }
  return {
    name: profile.name,
    phone: profile.phone,
    email: profile.email ?? '',
    dateOfBirth: profile.dateOfBirth ?? '',
    gender: profile.gender ?? '',
    address: profile.address ?? '',
    bloodGroup: profile.bloodGroup ?? '',
    allergies: profile.allergies ?? '',
    chronicConditions: profile.chronicConditions ?? '',
  };
}

function toInput(form: EditForm): CustomerInput {
  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || undefined,
    dateOfBirth: form.dateOfBirth.trim() || undefined,
    gender: form.gender.trim() || undefined,
    address: form.address.trim() || undefined,
    bloodGroup: form.bloodGroup.trim() || undefined,
    allergies: form.allergies.trim() || undefined,
    chronicConditions: form.chronicConditions.trim() || undefined,
  };
}

export function CustomersDetailDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const formId = useId();
  const row = useSelector(selectSelectedCustomer);
  const credit = useSelector(selectCustomerCredit);
  const purchases = useSelector(selectCustomerPurchases);
  const profile = useSelector(selectCustomerProfile);
  const loading = useSelector(selectCustomerDetailLoading);
  const editOpen = useSelector(selectEditCustomerOpen);
  const saveBusy = useSelector(selectCustomerSaveBusy);
  const editHint = useSelector(selectCustomerEditHint);
  const [form, setForm] = useState<EditForm>(emptyForm);

  useEffect(() => {
    if (editOpen && row) {
      setForm(formFromProfile(profile, { name: row.name, phone: row.phone }));
    }
  }, [editOpen, profile, row]);

  if (!row) return null;

  const duePaise = credit?.balancePaise ?? row.creditDuePaise;
  const totals = credit ? creditTotals(credit.entries) : { givenPaise: 0, repaidPaise: 0 };
  const ledger = (credit?.entries ?? []).filter((entry) => entry.type !== 'LIMIT_SET');
  const wa = whatsappHref(row.phone, duePaise);
  const sms = smsHref(row.phone, duePaise);
  const showKhata = !row.walkInAggregate;
  const canEdit = !row.walkInAggregate;
  const title = profile?.name ?? row.name;
  const phoneDisplay = formatPhone(profile?.phone ?? row.phone);

  const update = (key: keyof EditForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = (event: FormEvent) => {
    event.preventDefault();
    void dispatch(saveCustomerProfile(toInput(form)));
  };

  return (
    <div
      className="cust-modal-wrap"
      role="presentation"
      onClick={() => dispatch(closeCustomerDetail())}
    >
      <div
        className="cust-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customers-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cust-modal-head">
          <h2 id="customers-detail-title">{title}</h2>
          <button
            type="button"
            className="cust-x"
            aria-label={CUSTOMERS_CONTENT.detail.close}
            onClick={() => dispatch(closeCustomerDetail())}
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        <div className="cust-modal-body">
          <div className="cust-fact">
            <div>
              <div className="k">{CUSTOMERS_CONTENT.detail.phone}</div>
              <div className="v">{phoneDisplay}</div>
            </div>
            <div>
              <div className="k">{CUSTOMERS_CONTENT.detail.lifetime}</div>
              <div className="v">{formatPaise(row.lifetimeValuePaise)}</div>
            </div>
            <div>
              <div className="k">{CUSTOMERS_CONTENT.detail.orders}</div>
              <div className="v">{row.orderCount}</div>
            </div>
            <div>
              <div className="k">{CUSTOMERS_CONTENT.detail.creditDue}</div>
              <div className={`v${duePaise > 0 ? ' due' : ''}`}>{formatPaise(duePaise)}</div>
            </div>
          </div>

          {loading ? (
            <div className="cust-loading" role="status">
              {CUSTOMERS_CONTENT.status.loading}
            </div>
          ) : (
            <>
              {editOpen && canEdit ? (
                <section className="cust-edit" aria-label={CUSTOMERS_CONTENT.detail.editTitle}>
                  <div className="cust-pl-head">{CUSTOMERS_CONTENT.detail.editTitle}</div>
                  {editHint ? (
                    <p className="cust-edit-alert" role="alert">
                      {editHint}
                    </p>
                  ) : null}
                  <form className="cust-edit-form" id={formId} onSubmit={onSave} noValidate>
                    <label className="cust-field">
                      <span>{CUSTOMERS_CONTENT.detail.fields.name}</span>
                      <input
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        autoComplete="name"
                        required
                      />
                    </label>
                    <label className="cust-field">
                      <span>{CUSTOMERS_CONTENT.detail.fields.phone}</span>
                      <input
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        inputMode="tel"
                        autoComplete="tel"
                        required
                      />
                    </label>
                    <div className="cust-edit-row">
                      <label className="cust-field">
                        <span>{CUSTOMERS_CONTENT.detail.fields.email}</span>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => update('email', e.target.value)}
                          autoComplete="email"
                        />
                      </label>
                      <label className="cust-field">
                        <span>{CUSTOMERS_CONTENT.detail.fields.dateOfBirth}</span>
                        <input
                          type="date"
                          value={form.dateOfBirth}
                          onChange={(e) => update('dateOfBirth', e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="cust-edit-row">
                      <label className="cust-field">
                        <span>{CUSTOMERS_CONTENT.detail.fields.gender}</span>
                        <input
                          value={form.gender}
                          onChange={(e) => update('gender', e.target.value)}
                          placeholder="e.g. MALE"
                        />
                      </label>
                      <label className="cust-field">
                        <span>{CUSTOMERS_CONTENT.detail.fields.bloodGroup}</span>
                        <input
                          value={form.bloodGroup}
                          onChange={(e) => update('bloodGroup', e.target.value)}
                          placeholder="e.g. B+"
                        />
                      </label>
                    </div>
                    <label className="cust-field">
                      <span>{CUSTOMERS_CONTENT.detail.fields.address}</span>
                      <input
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        autoComplete="street-address"
                      />
                    </label>
                    <label className="cust-field">
                      <span>{CUSTOMERS_CONTENT.detail.fields.allergies}</span>
                      <input
                        value={form.allergies}
                        onChange={(e) => update('allergies', e.target.value)}
                      />
                    </label>
                    <label className="cust-field">
                      <span>{CUSTOMERS_CONTENT.detail.fields.chronicConditions}</span>
                      <input
                        value={form.chronicConditions}
                        onChange={(e) => update('chronicConditions', e.target.value)}
                      />
                    </label>
                  </form>
                </section>
              ) : null}

              {showKhata && !editOpen ? (
                <section className="cust-khata" aria-label={CUSTOMERS_CONTENT.detail.creditAccount}>
                  <div className="cust-pl-head">{CUSTOMERS_CONTENT.detail.creditAccount}</div>
                  <div className="cust-khata-meta">
                    <span>
                      {CUSTOMERS_CONTENT.detail.given} {formatPaise(totals.givenPaise)} ·{' '}
                      {CUSTOMERS_CONTENT.detail.repaid} {formatPaise(totals.repaidPaise)}
                    </span>
                    <strong>
                      {CUSTOMERS_CONTENT.detail.outstanding} {formatPaise(duePaise)}
                    </strong>
                  </div>
                  <div className="cust-khata-actions">
                    <button
                      type="button"
                      className="cust-btn cust-btn-primary"
                      disabled={!credit || duePaise <= 0}
                      onClick={() => dispatch(openSettleCredit())}
                    >
                      <Check size={14} strokeWidth={2.2} aria-hidden />
                      {CUSTOMERS_CONTENT.detail.recordRepayment}
                    </button>
                    {wa ? (
                      <a className="cust-btn cust-btn-ghost" href={wa} target="_blank" rel="noreferrer">
                        <MessageCircle size={14} strokeWidth={1.8} aria-hidden />
                        {CUSTOMERS_CONTENT.detail.remind}
                      </a>
                    ) : (
                      <button type="button" className="cust-btn cust-btn-ghost" disabled>
                        {CUSTOMERS_CONTENT.detail.remind}
                      </button>
                    )}
                    {sms ? (
                      <a className="cust-btn cust-btn-ghost" href={sms}>
                        {CUSTOMERS_CONTENT.detail.sms}
                      </a>
                    ) : (
                      <button type="button" className="cust-btn cust-btn-ghost" disabled>
                        {CUSTOMERS_CONTENT.detail.sms}
                      </button>
                    )}
                  </div>
                  {ledger.length === 0 ? (
                    <div className="cust-sub">{CUSTOMERS_CONTENT.detail.noCredit}</div>
                  ) : (
                    <div className="cust-ledger">
                      {ledger.map((entry) => {
                        const label = ledgerLabel(entry);
                        const charge = entry.type === 'SALE_CHARGE';
                        return (
                          <div key={entry.id} className="cust-ledger-row">
                            <div
                              className="cust-ledger-ico"
                              data-tone={charge ? 'rose' : 'green'}
                              aria-hidden
                            >
                              {charge ? '−' : '+'}
                            </div>
                            <div>
                              <div className="cust-ledger-title">{label.title}</div>
                              <div className="cust-ledger-sub">{label.subtitle}</div>
                            </div>
                            <div>
                              <div
                                className="cust-ledger-amt"
                                data-tone={charge ? 'rose' : 'green'}
                              >
                                {charge ? '-' : '+'}
                                {formatPaise(Math.abs(entry.amountPaise))}
                              </div>
                              <div className="cust-ledger-sub" style={{ textAlign: 'right' }}>
                                {formatIstDateTime(entry.occurredAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : null}

              {!editOpen && row.walkInAggregate ? (
                <section aria-label={CUSTOMERS_CONTENT.detail.purchaseHistory}>
                  <div className="cust-pl-head">{CUSTOMERS_CONTENT.detail.purchaseHistory}</div>
                  {purchases.length === 0 ? (
                    <div className="cust-sub">{CUSTOMERS_CONTENT.detail.noPurchases}</div>
                  ) : (
                    purchases.map((purchase) => (
                      <div key={purchase.invoiceId} className="cust-purchase">
                        <div className="cust-purchase-ico" aria-hidden>
                          <Store size={15} strokeWidth={1.8} />
                        </div>
                        <div>
                          <div className="cust-purchase-title">
                            {purchase.invoiceNumber} · {formatPaise(purchase.amountPaise)}
                          </div>
                          {purchase.itemSummary ? (
                            <div className="cust-sub">{purchase.itemSummary}</div>
                          ) : null}
                        </div>
                        <div className="cust-purchase-meta">
                          <div>{formatIstDateTime(purchase.occurredAt)}</div>
                          <div>{purchase.paymentLabel}</div>
                        </div>
                      </div>
                    ))
                  )}
                </section>
              ) : null}
            </>
          )}

          {!row.walkInAggregate ? <CustomersCrmOps /> : null}
        </div>

        <div className="cust-modal-foot">
          {editOpen && canEdit ? (
            <>
              <button
                type="button"
                className="cust-btn cust-btn-ghost"
                disabled={saveBusy}
                onClick={() => dispatch(closeEditCustomer())}
              >
                {CUSTOMERS_CONTENT.detail.cancelEdit}
              </button>
              <button
                type="submit"
                form={formId}
                className="cust-btn cust-btn-primary"
                disabled={saveBusy}
              >
                {saveBusy
                  ? CUSTOMERS_CONTENT.detail.saving
                  : CUSTOMERS_CONTENT.detail.saveDetails}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="cust-btn cust-btn-ghost"
                onClick={() => dispatch(closeCustomerDetail())}
              >
                {CUSTOMERS_CONTENT.detail.close}
              </button>
              {canEdit ? (
                <button
                  type="button"
                  className="cust-btn cust-btn-ghost"
                  disabled={loading}
                  onClick={() => dispatch(openEditCustomer())}
                >
                  <Pencil size={14} strokeWidth={1.8} aria-hidden />
                  {CUSTOMERS_CONTENT.detail.editDetails}
                </button>
              ) : null}
              <Link
                to={posSaleHref(row)}
                className="cust-btn cust-btn-primary"
                onClick={() => dispatch(closeCustomerDetail())}
              >
                {CUSTOMERS_CONTENT.detail.newSale}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
