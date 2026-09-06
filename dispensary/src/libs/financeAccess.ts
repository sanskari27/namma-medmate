export type AssignedDesk = {
  code: string | null;
};

export function hasFinanceAccess(
  role: string | undefined,
  roles: AssignedDesk[] | undefined,
): boolean {
  if (role === 'pharmacy_owner') {
    return true;
  }
  return roles?.some((desk) => desk.code === 'accountant') === true;
}

export function isFinanceNavPath(path: string): boolean {
  return path === '/expenses' || path === '/aging' || path === '/books' || path === '/accountant';
}
