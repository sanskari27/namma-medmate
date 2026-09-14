import type { StaffAccount } from '@/services/staff';
import { TillRowMenu } from '../till-row-menu';
import { useSelector } from 'react-redux';
import { selectStaffVisible } from '../../store';

function roleLabel(row: StaffAccount): string {
  if (row.role === 'pharmacy_owner') {
    return 'Owner';
  }
  return row.kind === 'PHARMACIST' ? 'Pharmacist' : 'Staff';
}

function statusLabel(row: StaffAccount): string {
  if (row.role === 'pharmacy_owner') {
    return 'Active';
  }
  if (row.status === 'PENDING') {
    return 'Pending';
  }
  if (row.status === 'TERMINATED') {
    return 'Removed';
  }
  return 'Active';
}

function tone(row: StaffAccount): 'green' | 'gold' | 'rose' {
  if (row.status === 'PENDING') {
    return 'gold';
  }
  if (row.status === 'TERMINATED') {
    return 'rose';
  }
  return 'green';
}

export function StaffTable({
  onPassword,
  onRoles,
  onBranches,
  onOffboard,
}: {
  onPassword: (row: StaffAccount) => void;
  onRoles: (row: StaffAccount) => void;
  onBranches: (row: StaffAccount) => void;
  onOffboard: (row: StaffAccount) => void;
}) {
  const items = useSelector(selectStaffVisible);
  return (
    <div className="st-card">
      <div className="st-tbl-wrap">
        <table className="st-tbl">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Login</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="st-member">
                    <span className="st-av">{row.displayName.slice(0, 1).toUpperCase()}</span>
                    <span>
                      <b>{row.displayName}</b>
                      <div className="st-muted st-mono" style={{ fontSize: 11 }}>
                        {row.email}
                      </div>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="st-pill" data-tone={row.role === 'pharmacy_owner' ? 'gold' : 'tag'}>
                    {roleLabel(row)}
                  </span>
                </td>
                <td className="st-mono" style={{ fontSize: 12 }}>
                  {row.phone ?? '—'}
                </td>
                <td>
                  <span className="st-pill" data-tone={tone(row)} data-live={tone(row) === 'green'}>
                    {statusLabel(row)}
                  </span>
                </td>
                <td>
                  {row.role === 'pharmacy_staff' ? (
                    <TillRowMenu
                      staff={row}
                      onPassword={() => onPassword(row)}
                      onRoles={() => onRoles(row)}
                      onBranches={() => onBranches(row)}
                      onOffboard={() => onOffboard(row)}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
