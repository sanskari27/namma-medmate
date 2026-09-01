export const manageUsersListSelectors = {
  title: { role: 'heading' as const, name: 'Manage users' },
  add: { role: 'button' as const, name: 'Add user' },
  owner: { role: 'button' as const, name: 'Open priya.owner' },
  cashier: { role: 'button' as const, name: 'Open ravi.cashier' },
  capMessage: {
    text: 'Seat cap reached. Growth raises the cap to 5 seats. Pro is unlimited.',
  },
  empty: { text: 'No staff users yet.' },
  error: { role: 'alert' as const },
} as const;
