export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export function hasCrmAccess(modules: string[] | undefined): boolean {
  return Boolean(modules?.includes('CRM'));
}

export function statusCopy(status: PageStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Loading khata balances…';
    case 'empty':
      return 'No outstanding khata on this pharmacy yet.';
    case 'validation':
      return 'Check the settlement amount and try again.';
    case 'denied':
      return 'This till cannot open Credit / Khata. Ask the owner for CRM access.';
    case 'conflict':
      return 'A balance changed on another till. Refresh the list.';
    case 'failure':
      return 'Could not load khata balances. Try again.';
    case 'success':
      return 'Settlement posted. Outstanding list updated.';
    default:
      return null;
  }
}
