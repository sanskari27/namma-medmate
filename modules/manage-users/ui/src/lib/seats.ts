export interface SeatSummary {
  plan: 'free' | 'starter' | 'growth' | 'pro';
  seat_limit: number | null;
  active_count: number;
  unlimited: boolean;
}

export function atSeatCap(seats: SeatSummary): boolean {
  return seats.seat_limit !== null && seats.active_count >= seats.seat_limit;
}

export function seatChipVars(seats: SeatSummary): Record<string, string> {
  return {
    used: String(seats.active_count),
    limit: seats.seat_limit === null ? 'Unlimited' : String(seats.seat_limit),
  };
}
