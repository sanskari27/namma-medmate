import { hasHospitalAccess } from '@/libs/hospitalAccess';
import type { RootState } from '@/store';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { HospitalPatientsDischargeDialog } from './components/hospital-patients-discharge-dialog';
import { HospitalPatientsDrawer } from './components/hospital-patients-drawer';
import { HospitalPatientsHeader } from './components/hospital-patients-header';
import { HospitalPatientsListPanel } from './components/hospital-patients-list-panel';
import { HospitalPatientsStatusBanner } from './components/hospital-patients-status-banner';
import { HOSPITAL_PATIENTS_CONTENT } from './HospitalPatientsScreen.content';
import './HospitalPatientsScreen.css';
import { statusMessage } from './HospitalPatientsScreen.utils';
import { useHospitalPatients } from './useHospitalPatients';

export default function HospitalPatientsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasHospitalAccess(user?.modules);
  const [searchParams] = useSearchParams();
  const board = useHospitalPatients(allowed, user, searchParams.get('admissionId'));
  const disabled = !allowed || board.status === 'loading' || !user?.activeBranchId;

  return (
    <main className="hp" aria-label={HOSPITAL_PATIENTS_CONTENT.regionLabel}>
      <HospitalPatientsHeader
        view={board.view}
        query={board.query}
        disabled={disabled}
        onViewChange={board.setView}
        onQueryChange={board.setQuery}
      />
      <HospitalPatientsStatusBanner
        status={board.status}
        view={board.view}
        message={board.message}
        onDismiss={board.dismiss}
        onRetry={() => void board.load()}
      />
      {allowed && user?.activeBranchId && board.status !== 'loading' && board.status !== 'denied' ? (
        <div className="hp-board">
          <HospitalPatientsListPanel
            items={board.items}
            selectedKey={board.selectedKey}
            emptyCopy={
              board.view === 'all' ? HOSPITAL_PATIENTS_CONTENT.emptyAll : HOSPITAL_PATIENTS_CONTENT.empty
            }
            onSelect={board.selectRow}
          />
          <HospitalPatientsDrawer
            detail={board.detail}
            draft={board.draft}
            busy={board.busy}
            canDischarge={board.canDischarge}
            onDraftChange={board.setDraft}
            onSettle={() => void board.settle()}
            onDischarge={board.openDischarge}
          />
        </div>
      ) : null}
      <HospitalPatientsDischargeDialog
        open={board.dischargeOpen}
        unpaidPaise={board.detail?.unpaidPaise ?? 0}
        draft={board.draft}
        busy={board.busy}
        message={
          board.dischargeOpen &&
          (board.status === 'conflict' ||
            board.status === 'validation' ||
            board.status === 'denied' ||
            board.status === 'failure')
            ? statusMessage(board.status, board.view, board.message)
            : null
        }
        onDraftChange={board.setDraft}
        onClose={board.closeDischarge}
        onConfirm={() => void board.discharge()}
        onCloseAutoFocus={board.restoreFocus}
      />
    </main>
  );
}
