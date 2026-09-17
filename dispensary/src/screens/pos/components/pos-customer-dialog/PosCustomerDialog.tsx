import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CustomerCreateDialog } from '@/components/templates/customer-create-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import type { Customer } from '@/services/customers';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import {
  continueAsWalkIn,
  customerQueryChanged,
  selectCustomer,
} from '../../store/pos.slice';
import {
  selectPosBusy,
  selectPosCustomerQuery,
  selectPosCustomers,
} from '../../store/pos.selectors';
import { loadCustomerCredit, loadCustomerLoyalty, searchCustomers } from '../../store/pos.thunks';

type PosCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PosCustomerDialog({ open, onOpenChange }: PosCustomerDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const busy = useSelector(selectPosBusy);
  const query = useSelector(selectPosCustomerQuery);
  const customers = useSelector(selectPosCustomers);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    void dispatch(searchCustomers());
  }, [dispatch, open, query]);

  function pick(customer: Customer) {
    dispatch(selectCustomer(customer));
    void dispatch(loadCustomerCredit(customer.id));
    void dispatch(loadCustomerLoyalty(customer.id));
    onOpenChange(false);
  }

  function walkIn() {
    dispatch(continueAsWalkIn());
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogTitle>{POS_CONTENT.customerDialogTitle}</DialogTitle>
          <DialogDescription>{POS_CONTENT.customerDialogDescription}</DialogDescription>
          <label className="pos-dialog-search">
            {POS_CONTENT.customerSearch}
            <input
              value={query}
              onChange={(event) => dispatch(customerQueryChanged(event.target.value))}
              placeholder={POS_CONTENT.customerSearchPlaceholder}
              disabled={busy}
              autoFocus
            />
          </label>
          <div className="pos-dialog-list" role="listbox" aria-label={POS_CONTENT.customerListAria}>
            {customers.length === 0 ? (
              <p className="pos-dialog-empty">{POS_CONTENT.customerEmpty}</p>
            ) : (
              customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="pos-dialog-item"
                  role="option"
                  onClick={() => pick(customer)}
                >
                  <strong>{customer.name}</strong>
                  <span>{customer.phone ?? POS_CONTENT.noPhone}</span>
                </button>
              ))
            )}
          </div>
          <div className="pos-dialog-actions">
            <button type="button" className="pos-customer-change" onClick={() => setCreateOpen(true)}>
              {POS_CONTENT.createCustomer}
            </button>
            <button type="button" className="pos-add-btn" onClick={walkIn} disabled={busy}>
              {POS_CONTENT.continueWalkIn}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <CustomerCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(customer) => {
          setCreateOpen(false);
          pick(customer);
        }}
        onPhoneConflict={(phone) => {
          setCreateOpen(false);
          dispatch(customerQueryChanged(phone));
        }}
      />
    </>
  );
}
