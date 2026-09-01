export interface StaffUserInput {
  login_id: string;
  role: string;
  password_enabled: boolean;
  otp_enabled: boolean;
  pin?: string;
}

export interface ManageUsersClient {
  setPin(input: {
    accessToken: string;
    locationId: string;
    userId: string;
    pin: string;
  }): Promise<void>;
  createUser(input: {
    accessToken: string;
    locationId: string;
    user: StaffUserInput;
  }): Promise<{ user_id: string }>;
}

export class MemoryManageUsersClient implements ManageUsersClient {
  seatCapReached = false;
  fail = false;
  createFail = false;
  pins = new Map<string, string>();
  created: StaffUserInput[] = [];

  async setPin(input: {
    accessToken: string;
    locationId: string;
    userId: string;
    pin: string;
  }): Promise<void> {
    if (this.fail) {
      throw new Error('manage-users unavailable');
    }
    this.pins.set(input.userId, input.pin);
  }

  async createUser(input: {
    accessToken: string;
    locationId: string;
    user: StaffUserInput;
  }): Promise<{ user_id: string }> {
    if (this.seatCapReached) {
      throw Object.assign(new Error('seat cap'), { code: 'SEAT_CAP_REACHED' });
    }
    if (this.fail || this.createFail) {
      throw new Error('manage-users unavailable');
    }
    this.created.push(input.user);
    return { user_id: 'user_created' };
  }
}

export function createHttpManageUsersClient(baseUrl: string): ManageUsersClient {
  return {
    async setPin(input) {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/manage-users/users/${input.userId}/pin?location_id=${encodeURIComponent(input.locationId)}`,
        {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${input.accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ pin: input.pin }),
        },
      );
      if (!response.ok) {
        throw new Error('manage-users unavailable');
      }
    },
    async createUser(input) {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/manage-users/users?location_id=${encodeURIComponent(input.locationId)}`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${input.accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(input.user),
        },
      );
      if (response.status === 409) {
        throw Object.assign(new Error('seat cap'), { code: 'SEAT_CAP_REACHED' });
      }
      if (!response.ok) {
        throw new Error('manage-users unavailable');
      }
      const body = (await response.json()) as { data?: { user_id?: string } };
      return { user_id: body.data?.user_id ?? 'user_created' };
    },
  };
}
