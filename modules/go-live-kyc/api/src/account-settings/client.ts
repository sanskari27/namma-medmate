export interface AccountSettingsClient {
  saveInvoicePrefix(input: {
    accessToken: string;
    locationId: string;
    invoicePrefix: string;
  }): Promise<void>;
}

export class MemoryAccountSettingsClient implements AccountSettingsClient {
  fail = false;
  lastPrefix?: string;

  async saveInvoicePrefix(input: {
    accessToken: string;
    locationId: string;
    invoicePrefix: string;
  }): Promise<void> {
    if (this.fail) {
      throw new Error('account-settings unavailable');
    }
    this.lastPrefix = input.invoicePrefix;
  }
}

export function createHttpAccountSettingsClient(baseUrl: string): AccountSettingsClient {
  return {
    async saveInvoicePrefix(input) {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/account-settings/invoice-settings?location_id=${encodeURIComponent(input.locationId)}`,
        {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${input.accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            location_id: input.locationId,
            invoice_prefix: input.invoicePrefix,
          }),
        },
      );
      if (!response.ok) {
        throw new Error('account-settings unavailable');
      }
    },
  };
}
