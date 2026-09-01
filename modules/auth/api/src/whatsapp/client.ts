export interface WhatsAppOtpSendInput {
  tenantId: string;
  locationId: string;
  to: string;
  challengeId: string;
  otp: string;
}

export interface WhatsAppSendClient {
  sendLoginOtp(input: WhatsAppOtpSendInput): Promise<{ delivered: boolean }>;
}

export class MemoryWhatsAppClient implements WhatsAppSendClient {
  lastOtp: string | undefined;
  fail = false;

  async sendLoginOtp(input: WhatsAppOtpSendInput): Promise<{ delivered: boolean }> {
    if (this.fail) {
      return { delivered: false };
    }
    this.lastOtp = input.otp;
    return { delivered: true };
  }
}
