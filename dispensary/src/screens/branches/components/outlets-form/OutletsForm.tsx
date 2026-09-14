import { FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import {
  editorClosed,
  formPatched,
  saveBranch,
  selectOutletsCreating,
  selectOutletsEditing,
  selectOutletsForm,
  selectOutletsItems,
  selectOutletsSelectedId,
} from '../../store';

export function OutletsForm() {
  const dispatch = useDispatch<AppDispatch>();
  const editing = useSelector(selectOutletsEditing);
  const creating = useSelector(selectOutletsCreating);
  const form = useSelector(selectOutletsForm);
  const items = useSelector(selectOutletsItems);
  const selectedId = useSelector(selectOutletsSelectedId);
  if (!editing) {
    return null;
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void dispatch(saveBranch());
  };

  return (
    <form onSubmit={onSubmit} className="ot-card ot-card-pad ot-form">
      <h2>{creating ? 'New outlet' : 'Edit outlet'}</h2>
      <div className="ot-fields">
        <div className="ot-field">
          <label htmlFor="outlet-name">Outlet name</label>
          <input
            id="outlet-name"
            className="ot-input"
            value={form.name}
            onChange={(event) => dispatch(formPatched({ name: event.target.value }))}
          />
        </div>
        <div className="ot-field">
          <label htmlFor="outlet-license">Drug licence number</label>
          <input
            id="outlet-license"
            className="ot-input ot-mono"
            value={form.drugLicenseNumber}
            onChange={(event) => dispatch(formPatched({ drugLicenseNumber: event.target.value }))}
          />
        </div>
        <div className="ot-field" data-span="2">
          <label htmlFor="outlet-address">Address</label>
          <input
            id="outlet-address"
            className="ot-input"
            value={form.addressLine}
            onChange={(event) => dispatch(formPatched({ addressLine: event.target.value }))}
          />
        </div>
        <div className="ot-field">
          <label htmlFor="outlet-city">City</label>
          <input
            id="outlet-city"
            className="ot-input"
            value={form.city}
            onChange={(event) => dispatch(formPatched({ city: event.target.value }))}
          />
        </div>
        <div className="ot-field">
          <label htmlFor="outlet-state">State</label>
          <input
            id="outlet-state"
            className="ot-input"
            value={form.state}
            onChange={(event) => dispatch(formPatched({ state: event.target.value }))}
          />
        </div>
        <div className="ot-field">
          <label htmlFor="outlet-pincode">Pincode</label>
          <input
            id="outlet-pincode"
            className="ot-input ot-mono"
            value={form.pincode}
            onChange={(event) => dispatch(formPatched({ pincode: event.target.value }))}
          />
        </div>
        <div className="ot-field">
          <label htmlFor="outlet-phone">Contact phone</label>
          <input
            id="outlet-phone"
            className="ot-input"
            value={form.contactPhone}
            onChange={(event) => dispatch(formPatched({ contactPhone: event.target.value }))}
          />
        </div>
        <div className="ot-field">
          <label htmlFor="outlet-email">Contact email</label>
          <input
            id="outlet-email"
            className="ot-input"
            type="email"
            value={form.contactEmail}
            onChange={(event) => dispatch(formPatched({ contactEmail: event.target.value }))}
          />
        </div>
        <div className="ot-field">
          <label htmlFor="outlet-gstin">GSTIN</label>
          <input
            id="outlet-gstin"
            className="ot-input ot-mono"
            value={form.gstin}
            onChange={(event) => dispatch(formPatched({ gstin: event.target.value }))}
          />
        </div>
        <div className="ot-field">
          <label htmlFor="outlet-type">Branch type</label>
          <select
            id="outlet-type"
            className="ot-select"
            value={form.branchType}
            onChange={(event) =>
              dispatch(formPatched({ branchType: event.target.value as 'RETAIL' | 'KIOSK' }))
            }
          >
            <option value="RETAIL">Retail</option>
            <option value="KIOSK">Kiosk (self-order on Pro)</option>
          </select>
        </div>
        <div className="ot-field">
          <label htmlFor="outlet-markup">Default markup (basis points)</label>
          <input
            id="outlet-markup"
            className="ot-input"
            inputMode="numeric"
            value={form.markupBps}
            onChange={(event) => dispatch(formPatched({ markupBps: event.target.value }))}
          />
        </div>
        <label className="ot-flex" style={{ gridColumn: '1 / -1' }}>
          <input
            type="checkbox"
            checked={form.defaultBranch}
            onChange={(event) => dispatch(formPatched({ defaultBranch: event.target.checked }))}
          />
          Default outlet for this pharmacy
        </label>
        {!creating && items.filter((row) => row.id !== selectedId).length > 0 ? (
          <div className="ot-field" data-span="2">
            <label htmlFor="outlet-copy">Copy pricing/tax snapshot from</label>
            <select
              id="outlet-copy"
              className="ot-select"
              value={form.copyFromId}
              onChange={(event) => dispatch(formPatched({ copyFromId: event.target.value }))}
            >
              <option value="">Do not copy</option>
              {items
                .filter((row) => row.id !== selectedId)
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.branchCode} — {row.name}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
      </div>
      <div className="ot-flex">
        <button type="submit" className="ot-btn ot-btn-primary">
          Save outlet
        </button>
        <button type="button" className="ot-btn ot-btn-ghost" onClick={() => dispatch(editorClosed())}>
          Cancel
        </button>
      </div>
    </form>
  );
}
