import { Button } from '@atoms';
import { Popover, PopoverContent, PopoverTrigger } from '@molecules';
import type { HqOperator } from '@/services/staff';
import { ChevronDown } from 'lucide-react';

interface OperatorFileMenuProps {
  operator: HqOperator;
  onDesks: () => void;
  onOffboard: () => void;
}

export function OperatorFileMenu({ operator, onDesks, onOffboard }: OperatorFileMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Actions for ${operator.displayName}`}
        >
          Actions
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="end">
        <p className="px-2 py-1.5 text-[11px] text-muted">{operator.displayName}</p>
        <button
          type="button"
          className="flex w-full cursor-pointer px-2 py-1.5 text-left text-sm text-ink hover:bg-brand-soft"
          onClick={onDesks}
        >
          Desk assignment
        </button>
        <button
          type="button"
          className="flex w-full cursor-pointer px-2 py-1.5 text-left text-sm text-ink hover:bg-brand-soft"
          onClick={onOffboard}
        >
          Remove access
        </button>
      </PopoverContent>
    </Popover>
  );
}
