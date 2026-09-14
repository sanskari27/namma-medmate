import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { RegistersBookList } from './components/registers-book-list';
import { RegistersEmptyState } from './components/registers-empty-state';
import { RegistersFilters } from './components/registers-filters';
import { RegistersHeader } from './components/registers-header';
import { RegistersStatusBanner } from './components/registers-status-banner';
import { RegistersTable } from './components/registers-table';
import { RegistersUpgrade } from './components/registers-upgrade';
import { hasRegisterAccess } from './RegistersScreen.utils';
import {
  accessDenied,
  bookSelected,
  exportRegister,
  filtersChanged,
  loadRegisterCatalog,
  loadRegisterTable,
  selectRegistersBooks,
  selectRegistersBusy,
  selectRegistersFilters,
  selectRegistersPlanGate,
  selectRegistersSelectedKey,
  selectRegistersShowBatch,
  selectRegistersStatus,
  selectRegistersTable,
  selectRegistersUpgradeHint,
} from './store';
import './RegistersScreen.css';

export default function RegistersScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const spreadsheetRef = useRef<HTMLButtonElement | null>(null);
  const pdfRef = useRef<HTMLButtonElement | null>(null);
  const upgradeRef = useRef<HTMLAnchorElement | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasRegisterAccess(user?.modules);
  const status = useSelector(selectRegistersStatus);
  const books = useSelector(selectRegistersBooks);
  const selectedKey = useSelector(selectRegistersSelectedKey);
  const table = useSelector(selectRegistersTable);
  const filters = useSelector(selectRegistersFilters);
  const busy = useSelector(selectRegistersBusy);
  const showBatch = useSelector(selectRegistersShowBatch);
  const planGate = useSelector(selectRegistersPlanGate);
  const upgradeHint = useSelector(selectRegistersUpgradeHint);

  useEffect(() => {
    if (!allowed) {
      dispatch(accessDenied(null));
      return;
    }
    void dispatch(loadRegisterCatalog());
  }, [allowed, dispatch, user?.activeBranchId]);

  useEffect(() => {
    if (!allowed || !selectedKey) {
      return;
    }
    void dispatch(loadRegisterTable());
  }, [allowed, dispatch, selectedKey]);

  return (
    <div className="rg" aria-label="Register book">
      <RegistersHeader
        spreadsheetRef={spreadsheetRef}
        pdfRef={pdfRef}
        denied={!allowed || planGate}
        busy={busy}
        onSpreadsheet={() => {
          void dispatch(exportRegister('csv')).then(() => spreadsheetRef.current?.focus());
        }}
        onPdf={() => {
          void dispatch(exportRegister('pdf')).then(() => pdfRef.current?.focus());
        }}
      />
      <RegistersStatusBanner />
      {allowed ? (
        <div className="rg-split">
          <RegistersBookList
            books={books}
            selectedKey={selectedKey}
            onSelect={(key) => dispatch(bookSelected(key))}
          />
          <div>
            <RegistersFilters
              filters={filters}
              showBatch={showBatch}
              disabled={busy || planGate}
              onChange={(next) => dispatch(filtersChanged(next))}
              onApply={() => {
                void dispatch(loadRegisterTable());
              }}
            />
            {planGate ? (
              <RegistersUpgrade
                hint={upgradeHint ?? 'Near-expiry is on Starter. Open the plan to turn it on.'}
                linkRef={upgradeRef}
              />
            ) : status === 'loading' || status === 'denied' ? null : table ? (
              <RegistersTable title={table.title} columns={table.columns} items={table.items} />
            ) : (
              <RegistersEmptyState />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
