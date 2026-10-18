// About page copy. Source: the founder's Namma MedMate site (/namma/about and /roni-paul, reviewed 2026-10-04).
// Where the two pages disagree, this follows the founder page's approved press-kit bio. Left out until confirmed:
// "750+ chemists", CIN and drug licence numbers, the late-delivery guarantee, and the "father with diabetes" anecdote
// (it conflicts with the approved bio's pharmacy-family background).

export const FOUNDER = {
  name: "Roni Paul",
  role: "Founder & CEO",
  photo: "/people/roni-paul.webp",
  /** Roni Paul's founder page (story, press kit, speaking). */
  site: "https://namma-medmate.netlify.app/roni-paul",
  instagram: "https://www.instagram.com/the_roni_paul/",
  oneLine: "Roni Paul is a health-tech entrepreneur from Bengaluru and the founder and CEO of MedMate, the platform where people buy medicine from their neighbourhood pharmacy. It is his third company since 2019.",
  quote: "Your shop has looked after this neighbourhood for years. Somebody should look after your shop now.",
};

export const FACTS: [string, string][] = [
  ["2026", "Founded in Bengaluru"],
  ["9,00,000", "Pharmacies in India we build for"],
  ["1 platform", "Software, e-prescriptions, delivery"],
];

/** "Why we started": paragraphs, with one pull quote placed after the given index. */
export const STORY: string[] = [
  "Roni Paul grew up inside the medicine business. His father and uncle run a pharmacy, a drug-distribution operation and a diagnostic centre, so from childhood he watched how a chemist buys, stocks, prices and sells, and where the money leaks.",
  "He went abroad to study medicine at Astana Medical University and kept noticing the same thing: what fails patients is rarely the medicine. It is everything around it, the access, the wait, the systems people fight through before care reaches them.",
  "Around 2019 he left medical school to build companies instead. His first, a hospitality business, launched into Covid and closed when the second wave took the industry apart. He moved to Bengaluru, joined a healthcare startup as Chief Operating Officer, working with hospitals, and then founded a media agency that he still runs.",
  "Along the way he saw the frustrating dance every Indian family knows too well: app after app showing “out of stock”, chemists who had the medicine but would not deliver, a forty-minute drive across Bengaluru for a single strip of tablets. The medicine was never far away. It was sitting on a shelf around the corner, at a chemist who had no way to take an order online, show what was in stock, or send it the short distance home.",
  "The big platforms had solved delivery, but only for their own warehouses, not for the chemist who knows your name and your prescription. The answer was not one more faceless pharmacy app. It was giving the corner shop the same technology the giants have, and connecting it to the families living a few streets away.",
  "MedMate is his third company, and the one he has been preparing for his whole life. The first months were spent listening: sitting with Bengaluru’s chemists, including the President of the Bangalore District Chemists & Druggists Association, to hear the ground reality before building.",
  "We measure success in something simpler than orders: a family that never has to ration a medicine, a Sunday not lost to a pharmacy crawl, and the corner chemist, still standing, still trusted, now open to the whole neighbourhood.",
];
export const STORY_QUOTE = { after: 3, text: "The gap wasn’t kilometres. It was software." };

export const JOURNEY: [string, string, string][] = [
  ["The beginning", "Raised behind the counter", "A pharmacy, a drug-distribution business and a diagnostic centre, run by his father and uncle: the first classroom in how a chemist buys, stocks, prices and sells."],
  ["Medical school", "Studies medicine abroad", "Learns clinical medicine, and sees that what fails patients is rarely the medicine but everything around it."],
  ["2019", "Leaves medical school to build", "Chooses building over a degree: the decision everything since has been built on."],
  ["Company one", "A first company, launched into the pandemic", "A hospitality business that grew fast in its first year, until the second Covid wave took the industry apart. The lessons stayed."],
  ["Bengaluru", "COO at a healthcare startup", "Works with hospitals as Chief Operating Officer and partner, and sees how technology companies ship, hire and earn trust at scale."],
  ["Company two", "A media agency, built from scratch", "Learns the other half of the craft: telling a story people act on. He still runs it."],
  ["2026", "MedMate", "Incorporates Medmate India Technology Private Limited and starts the business he has known his whole life."],
];

export const BELIEFS: [string, string][] = [
  ["The customer didn’t leave the chemist. They moved.", "They still trust the shop that has known their family for twenty years. They just stopped walking to it. Give that shop an app and a rider, and the trust comes back to the counter."],
  ["It’s not a discipline problem. It’s a tooling problem.", "Pharmacies lose margin to expiry, dead stock and guesswork ordering, not because owners are careless, but because they run today’s volumes on yesterday’s systems."],
  ["Namma means ours.", "The neighbourhood pharmacy is infrastructure. Quick-commerce giants can buy attention; they cannot buy thirty years of trust. Our job is to make sure that trust has software behind it."],
  ["Health-tech should be built from behind the counter.", "The best products in this space will come from people who have felt the register not balance."],
];

export const VALUES: [string, string, string][] = [
  ["store", "Local first", "Every order goes to a trusted neighbourhood chemist near you, never a faraway warehouse."],
  ["shield", "Honest by default", "No charging above MRP, no dark patterns and no fake reviews. Fees and delivery times are shown before you pay."],
  ["pin", "Built in India", "Our team and our chemists are Indian. We are based in Bengaluru and hire locally."],
  ["heart", "Empathy at the door", "We hire for kindness first. Behind every order is someone who needs their medicine."],
];

/** Team as listed on the founder's About page. Only the founder has a photo. */
export const TEAM: { name: string; role: string; note?: string; photo?: string; site?: string }[] = [
  { name: "Roni Paul", role: "Founder & CEO", note: "Health-tech entrepreneur · studied medicine at Astana Medical University", photo: "/people/roni-paul.webp", site: "https://namma-medmate.netlify.app/roni-paul" },
  { name: "Dr Sri Hari Alapati", role: "Medical Advisor", note: "Paediatrician · Founder, Revive Hospitals" },
  { name: "Reyansh Sharma", role: "CTO" },
  { name: "Akash Raj", role: "CDM" },
  { name: "Heemashree Gogoi", role: "Head of Pharmacy", note: "Licensed pharmacist" },
];

export { REGISTERED_OFFICE } from "./site";
