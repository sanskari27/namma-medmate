export type ReferralStatus = "Invited" | "Signed up" | "Earned";
export type Referral = { id: string; name: string; area: string; status: ReferralStatus; reward: number };
