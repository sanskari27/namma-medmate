// DLT integration point. Authentication calls this after it stores the OTP.
// Do not log the code or add a provider here.
export async function sendOtp(phone: string, otp: string): Promise<void> {
  void phone;
  void otp;
  // TODO: Implement DLT-compliant SMS delivery.
}

export const delivery = { sendOtp };

export async function deliverOtp(phone: string, otp: string) {
  await delivery.sendOtp(phone, otp);
}
