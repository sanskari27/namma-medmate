export function hasCampaignAccess(
  role: string | undefined,
  modules: string[] | undefined,
): boolean {
  if (role === 'pharmacy_owner') {
    return true;
  }
  return modules?.includes('CAMPAIGNS') === true;
}

export function isCampaignNavPath(path: string): boolean {
  return path === '/campaigns' || path === '/whatsapp-sends';
}
