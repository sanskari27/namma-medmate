export function moduleLabel(code: string): string {
  switch (code) {
    case 'SALES':
      return 'Sales';
    case 'INVENTORY':
      return 'Inventory';
    case 'PROCUREMENT':
      return 'Purchases';
    case 'CRM':
      return 'Patients';
    case 'FINANCE':
      return 'Accounts';
    case 'REPORTING':
      return 'Reports';
    case 'STAFF':
      return 'Staff accounts';
    case 'ROLES':
      return 'Floor roles';
    case 'APPROVALS':
      return 'Approvals';
    case 'LOYALTY':
      return 'Loyalty';
    case 'ONLINE_STORE':
      return 'Online store';
    default:
      return code;
  }
}
