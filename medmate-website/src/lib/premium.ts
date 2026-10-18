// Waitlist offer: MedMate Premium free for 3 months. Defined with the founder on 16 October 2026.
// This is a promise to every waitlist member and must be honoured by the app at launch.
// Change it only for NEW sign-ups (bump OFFER_ID and OFFER_SINCE); people who already joined keep these terms.
// 16 Oct 2026, same day and before any sign-up: the founder set the start to launch day in the member's area (was: first order).

/** Stored with every waitlist sign-up (hidden form field "offer"), so the app knows who was promised what. */
export const OFFER_ID = "premium-3m-v1";
export const OFFER_SINCE = "16 October 2026";
export const FREE_MONTHS = 3;
export const MONTHLY_CAP = 10;

/** [icon, what, planned charge at launch, with Premium] */
export const BENEFITS: [string, string, string, string][] = [
  ["scooter", "Standard delivery", "₹25 on orders under ₹199", "Free on every order, no minimum"],
  ["bolt", "Express delivery (fastest)", "₹49", "Free"],
  ["tag", "Handling charge", "₹5 per order", "₹0"],
  ["store", "Extra pharmacy pickup (one rider, 2–3 shops)", "₹15 per extra shop", "₹0"],
  ["chat", "Support", "Standard", "Priority WhatsApp support"],
];

export const STEPS: [string, string, string][] = [
  ["bell", "Join the waitlist today", "Fill in the short form with your name, mobile number and pincode. Premium is reserved for that number. No payment details needed."],
  ["pin", "We launch in your area", "We message you on launch day, the day pharmacies near you go live on MedMate."],
  ["gift", `${FREE_MONTHS} months free from that day`, `Premium switches on for your number on launch day and runs for ${FREE_MONTHS} months. Sign in to the app with the same number to use it.`],
];

export const TERMS: string[] = [
  `**Who gets it:** everyone who joins the MedMate waitlist before MedMate launches in their area. One Premium per mobile number, linked to the number you joined with. It cannot be transferred and has no cash value.`,
  `**When it starts:** your ${FREE_MONTHS} free months start on launch day, the day MedMate goes live in your area (the area of your delivery address), and run for ${FREE_MONTHS} months from that day. We message you on launch day. The months run from launch day even if you start ordering later.`,
  `**What it includes:** free Standard and Express delivery on every order with no minimum order value, no handling charge, no extra-pickup charge when one rider collects from 2 or 3 pharmacies, and priority WhatsApp support.`,
  `**Fair use:** up to ${MONTHLY_CAP} Premium orders in each calendar month. Further orders that month carry the normal charges, shown before you pay.`,
  "**What still applies:** the extra charge for a far-away pharmacy (more than 3 km from you) is shown before you pay. Express delivery is offered when it is available for your address and pharmacy.",
  "**Medicines:** Premium does not change medicine prices. Prescription medicines are dispensed only against a valid prescription, checked by a pharmacist.",
  `**No automatic charge:** we never ask for card or UPI details for Premium. After ${FREE_MONTHS} months it simply ends. Before it ends we will tell you the price of continuing, and you decide.`,
  `**Changes:** we may change or end this offer for new sign-ups, with notice on this page. If you have already joined, you keep the benefits described here. We may withdraw Premium from accounts that misuse it, for example by signing up many numbers for one person.`,
];

export const FAQS: [string, string][] = [
  ["What is MedMate Premium?", "A membership that removes delivery, handling and extra-pickup charges on your MedMate orders and gives you priority WhatsApp support. Waitlist members get it free for 3 months."],
  ["Do I need to pay or add a card?", "No. Joining the waitlist is free, and we never ask for payment details for the free Premium months. Nothing is charged automatically when they end."],
  ["When do my 3 free months start?", "On launch day: the day MedMate goes live in your area, not the day you join. We message you that day, and your 3 months run from then."],
  ["Is Express delivery free too?", "Yes. Standard and Express delivery are both free for Premium members, on every order with no minimum, for up to 10 orders a month."],
  ["Does Premium make medicines cheaper?", "No. Premium covers delivery, handling and support. Medicine prices are set by the pharmacy and never above the MRP."],
  ["What happens after 3 months?", "Premium ends on its own. Before that, we will tell you the price of continuing, and you can choose whether to keep it."],
];
