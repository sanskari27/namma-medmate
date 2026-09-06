export function hasReportingAccess(
  role: string | undefined,
  modules: string[] | undefined,
): boolean {
  if (role === 'pharmacy_owner') {
    return true;
  }
  return modules?.includes('REPORTING') === true;
}

export function isReportingNavPath(path: string): boolean {
  return path === '/reports' || path === '/custom-reports';
}
