export interface SeatsUsed {
  seatsUsed: number;
  unknown: boolean;
}

export interface SeatsReader {
  getSeatsUsed(tenantId: string, locationId: string): Promise<SeatsUsed>;
}

export class MemorySeatsReader implements SeatsReader {
  fail = false;
  unknown = true;
  seatsUsed = 0;

  async getSeatsUsed(_tenantId: string, _locationId: string): Promise<SeatsUsed> {
    if (this.fail) {
      throw new Error('manage-users timeout');
    }
    return { seatsUsed: this.seatsUsed, unknown: this.unknown };
  }
}
