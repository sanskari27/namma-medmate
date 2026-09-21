export function hasHospitalAccess(modules: string[] | undefined): boolean {
  return modules?.includes('HOSPITAL') === true;
}

export function isHospitalNavPath(path: string): boolean {
  return (
    path === '/hospital-billing' ||
    path === '/hospital-wards' ||
    path === '/hospital-patients' ||
    path === '/hospital-sales' ||
    path === '/hospital-departments' ||
    path === '/hospital-doctors' ||
    path === '/hospital-indents' ||
    path === '/hospital-issues'
  );
}
