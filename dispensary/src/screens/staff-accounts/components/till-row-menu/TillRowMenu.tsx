import { Button } from '@atoms';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@molecules';
import type { StaffAccount } from '@/services/staff';
import { MoreHorizontal } from 'lucide-react';

interface TillRowMenuProps {
  staff: StaffAccount;
  onPassword: () => void;
  onRoles: () => void;
  onBranches: () => void;
  onOffboard: () => void;
}

export function TillRowMenu({
  staff,
  onPassword,
  onRoles,
  onBranches,
  onOffboard,
}: TillRowMenuProps) {
  const terminated = staff.status === 'TERMINATED';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          aria-label={`Actions for ${staff.displayName}`}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{staff.displayName}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onPassword()} disabled={terminated}>
          Reset password
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onRoles()} disabled={terminated}>
          Roles
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onBranches()} disabled={terminated}>
          Outlets
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onOffboard()} disabled={terminated}>
          Remove access
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
