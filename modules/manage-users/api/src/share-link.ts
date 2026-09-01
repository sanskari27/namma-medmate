export function buildShareLink(input: {
  shopName: string;
  loginId: string;
  tempPassword?: string;
}): { url: string; body: string; sent: false } {
  const passwordLine = input.tempPassword
    ? `Temporary password: ${input.tempPassword}`
    : 'Ask the Owner to reset your password in Manage Users.';
  const body = `Namma MedMate login for ${input.shopName}\nLogin ID: ${input.loginId}\n${passwordLine}`;
  return {
    url: `https://wa.me/?text=${encodeURIComponent(body)}`,
    body,
    sent: false,
  };
}
