export function deskModuleLabel(code: string): string {
  switch (code) {
    case 'TENANT_KYC':
      return 'Tenant KYC';
    case 'STAFF_VERIFICATION':
      return 'Staff verification';
    case 'SUBSCRIPTIONS':
      return 'Subscriptions';
    case 'SUPPORT':
      return 'Support';
    case 'PLATFORM_OPERATORS':
      return 'Operators';
    case 'PLATFORM_ROLES':
      return 'HQ desks';
    case 'PLATFORM_FINANCE':
      return 'Platform finance';
    default:
      return code;
  }
}
