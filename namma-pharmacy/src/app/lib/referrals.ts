export type ReferralStatus = "Invited" | "Signed up" | "Earned" | "Paid";
export type Referral = { id: string; name: string; area: string; status: ReferralStatus; reward: number; paidAt?: number; paidBy?: string };
export const REFERRAL_REWARD = 500;
