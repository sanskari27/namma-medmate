import { MORE_POSTS } from "./posts-more";

// Blog posts. Body text supports [label](/path) links and **bold**; see components/rich.tsx.
// Voice: plain words, numbers first (DESIGN.md §10). Medical posts end with a not-medical-advice line.

export type Topic = "customers" | "medicines" | "conditions" | "care" | "pharmacies";
export const TOPICS: Record<Topic, { name: string; blurb: string }> = {
  customers: { name: "Ordering on MedMate", blurb: "Prescriptions, delivery and getting the best price." },
  medicines: { name: "Know your medicines", blurb: "Salts, brands, labels, prescriptions and how to spot a fake." },
  conditions: { name: "Living with a condition", blurb: "Fever, diabetes, blood pressure: everyday, practical help." },
  care: { name: "Everyday care", blurb: "Storing medicines, seasons in Bengaluru and looking after the family." },
  pharmacies: { name: "For pharmacies", blurb: "Selling medicines online as a neighbourhood chemist." },
};

export type Block = { h?: string; p?: string[]; ul?: string[] };
export type Post = {
  slug: string;
  title: string;
  description: string;
  /** Two or three sentences that answer the title's question directly (shown first; quoted by search and AI answers). */
  answer: string;
  topic: Topic;
  date: string;
  updated?: string;
  minutes: number;
  keywords: string[];
  body: Block[];
  faq?: [string, string][];
  /** Official sources for facts in the post: [label, url]. */
  sources?: [string, string][];
  /** Name and role of the pharmacist or doctor who reviewed the post. Leave empty until someone has actually reviewed it. */
  reviewedBy?: string;
  /** App screen the closing call to action opens; pharmacy posts point to the partner page instead. */
  cta: { title: string; text: string; to: string } | "partner";
};

const NOT_ADVICE = "This article is general information, not medical advice. Always take medicines as your doctor or pharmacist advises.";

const BASE_POSTS: Post[] = [
  {
    slug: "sell-medicines-online-pharmacy-india",
    title: "How a neighbourhood pharmacy can sell medicines online in India",
    description: "A practical guide for chemists: the ways to take orders online, what the rules expect, and how the MedMate Partner console gets your shop ready for online orders and 10-minute delivery.",
    answer: "A neighbourhood pharmacy can sell online without building an app: join a hyperlocal network that shows your stock and prices to people nearby and sends a rider to your counter. You keep selling under your own retail drug licence, your pharmacist still checks every prescription, and you keep your customers.",
    topic: "pharmacies",
    date: "2026-10-04",
    minutes: 6,
    keywords: ["sell medicines online", "pharmacy online India", "list pharmacy online", "online medical store", "pharmacy delivery app"],
    body: [
      { p: ["Customers who used to walk in now search on their phones first. If your shop does not show up when they search, they order from someone who does. The good news: going online no longer means building an app or hiring a delivery team."] },
      { h: "Three ways to take orders online", ul: [
        "**Phone and WhatsApp orders with your own delivery boy.** Cheap to start, but it only reaches people who already know you, and one delivery boy limits how many orders you can handle.",
        "**Large national e-pharmacies.** They hold their own stock in warehouses and deliver in a day or more. They compete with you rather than send you orders.",
        "**A hyperlocal network like MedMate.** Customers near your shop see your stock and prices and order in the app, and a rider collects from your counter. You keep your stock, your prices, your pharmacist and your customers' trust.",
      ] },
      { h: "What the rules expect", p: [
        "Every sale still happens under your retail drug licence, issued under the Drugs and Cosmetics Act, 1940 and its Rules. A registered pharmacist must check prescriptions before prescription-only medicines are dispensed, exactly as at the counter.",
        "Schedule H and H1 medicines need a valid prescription, and H1 sales go into your register. Schedule X medicines carry far stricter controls; check the current rules before offering any of them for delivery. Rules specific to online pharmacy sales have been drafted but are still evolving, so keep your licences current and take professional advice when they change.",
      ] },
      { h: "How MedMate works for your pharmacy", ul: [
        "**One console from day one.** The [MedMate Partner console](/pharmacy-partner) runs GST billing, batch-wise inventory with expiry alerts, purchases, prescriptions, CRM and credit khata on the laptop, tablet or phone you already have.",
        "**Your own storefront (launching soon).** Your shop on the MedMate app, with your name, your prices and your brand. Customers nearby order from you, and every customer stays yours.",
        "**10-minute delivery (launching soon).** Use the shared MedMate rider network or your own staff, with live tracking and OTP handover.",
        "**“Our Doctor, Your Medicine” (launching soon).** Customers who need a consultation can talk to a registered doctor in the app. The doctor decides independently, and any prescription can be filled at your counter. Your pharmacist still checks it before packing.",
        "**You set your prices.** Your shop's prices show in the app, always within MRP, and every sale is billed by your pharmacy. The Partner console starts at ₹299 a month, with the first 3 months free.",
      ] },
      { h: "Getting started", p: ["Keep your drug licence, GST registration and pharmacist details handy (see the full [document checklist](/blog/documents-to-list-pharmacy-online)), then [book a free demo](/pharmacy-partner#register). There is no setup fee and no lock-in, and most pharmacies are live on the console in about 7 days, so you are ready the day online orders open."] },
    ],
    faq: [
      ["Do I need a separate licence to sell medicines online?", "You sell under your existing retail drug licence, and prescription rules apply exactly as at the counter. Rules specific to online sales are still evolving, so keep your licences current and check for changes."],
      ["Does MedMate hold its own stock?", "No. Neighbourhood pharmacies supply every order from their own stock, at their own prices."],
      ["What does the Partner console cost?", "Plans start at ₹299 a month (Essential) and go up to ₹1,499 a month (Flagship), each free for the first 3 months, with no setup fee and no lock-in. The online store is included in every plan."],
    ],
    cta: "partner",
  },
  {
    slug: "documents-to-list-pharmacy-online",
    title: "Documents you need to list your pharmacy online: a checklist",
    description: "Drug licence (Form 20 and 21), GST, pharmacist registration and more: the documents a chemist needs to set up the MedMate Partner console and sell medicines online.",
    answer: "To list a pharmacy online you need a valid retail drug licence (Form 20 and 21), your registered pharmacist's details, GST registration, PAN, a bank account and basic shop details. FSSAI registration helps if you also sell nutrition products.",
    topic: "pharmacies",
    date: "2026-10-04",
    minutes: 4,
    keywords: ["pharmacy documents", "drug licence Form 20 21", "list pharmacy online", "pharmacy registration online"],
    body: [
      { p: ["Onboarding goes quickest when your paperwork is ready. Here is what MedMate asks for, and why."] },
      { h: "Must have", ul: [
        "**Retail drug licence (Form 20 and Form 21).** Issued by your State Drugs Control Department. It must be valid and in the shop's name and address.",
        "**Registered pharmacist.** The name and State Pharmacy Council registration of the pharmacist who checks prescriptions.",
        "**GST registration.** Your GSTIN, for invoices and settlements.",
        "**PAN** of the business or proprietor.",
        "**Bank account.** A cancelled cheque or bank letter, for online payments once your store is live.",
        "**Shop details.** Address, opening hours, a contact number, and a photo of the shop front and counter.",
      ] },
      { h: "Good to have", ul: [
        "**Shop and establishment or trade licence** as required by your city.",
        "**FSSAI registration** if you also sell nutrition and health food products.",
        "**A stock list** exported from your billing software, so your catalogue goes live faster.",
      ] },
      { h: "What happens next", p: ["After a free demo, our team migrates your stock, distributor list and GST details and trains your staff on the [Partner console](/pharmacy-partner), usually within about 7 days. Billing, inventory and credit work from day one, and your online store switches on the day MedMate launches in your area. Read [how selling online works](/blog/sell-medicines-online-pharmacy-india) for the bigger picture."] },
    ],
    cta: "partner",
  },
  {
    slug: "order-medicines-online-with-prescription",
    title: "How to order prescription medicines online in Bengaluru",
    description: "How ordering a prescription medicine online works in India, and how it will work on MedMate: a valid prescription, a pharmacist’s check, and a licensed pharmacy near you.",
    answer: "You need a valid prescription from a registered doctor. Upload a clear photo of it when you order; a registered pharmacist checks it before the medicine is packed, and the pharmacy dispenses it under its licence. MedMate, launching soon in Bengaluru, will also offer consultations with a registered doctor who decides independently.",
    topic: "customers",
    date: "2026-10-04",
    minutes: 4,
    keywords: ["order prescription medicines online", "upload prescription Bengaluru", "online pharmacy prescription"],
    body: [
      { p: ["Some medicines can only be sold against a valid prescription. That rule protects you, but it should not mean a trip across town when you are unwell. MedMate is launching soon in Bengaluru; here is how ordering a prescription medicine will work, from search to doorstep."] },
      { h: "1. Find your medicine", p: ["Search by the brand name on your strip or by the salt (the active ingredient), for example “Paracetamol 650”. Prescription-only medicines carry a red Rx tag, so you know before you add them. You can also [browse by category](/medicines)."] },
      { h: "2. Add your prescription", p: ["You will have two options:"], ul: ["**Upload your prescription:** take a clear photo of the whole page, with the doctor’s name, registration number, date and signature visible. A PDF works too. [More on uploading](/upload-prescription).", "**Book a consultation:** a registered doctor talks to you by audio or video and decides independently whether a prescription is right for you. [How the consultation works](/doctor-consultation)."] },
      { h: "3. Pick a pharmacy", p: ["MedMate will show the licensed pharmacies near you that stock your medicines, with each one’s total price, delivery charge and expected time. You choose the best deal or the fastest option."] },
      { h: "4. A pharmacist checks it", p: ["The pharmacy reviews the prescription before packing. Prescription items are only dispensed once it is verified."] },
      { h: "5. Track your rider", p: ["Once your order leaves the counter, follow the rider live on the map. Keep the pharmacy bill that comes with your medicines."] },
      { h: "Tips for a smooth order", ul: ["Check that the prescription is recent and the dose matches what you are ordering.", "Order regular medicines a day or two before you run out, and turn on refill reminders in the app.", "If a brand is out of stock, ask about a [same-salt alternative](/blog/generic-vs-branded-medicines-same-salt): the pharmacist can only substitute with your consent."] },
      { p: [NOT_ADVICE] },
    ],
    cta: { title: "Order your prescription in minutes", text: "Scan to open MedMate, upload your prescription and choose a pharmacy near you.", to: "/upload-rx" },
  },
  {
    slug: "medicine-delivery-bengaluru",
    title: "Medicine delivery in Bengaluru: what to expect",
    description: "How fast medicines can reach you in Bengaluru, what affects delivery time and charges, and how to get medicines at home from a pharmacy near you with MedMate.",
    answer: "Hyperlocal delivery from a pharmacy a short distance away can reach you much faster than a warehouse order, often within the hour. Distance, stock, traffic and prescription checks change the time. MedMate, launching soon in Bengaluru, will show each pharmacy’s time and total before you pay.",
    topic: "customers",
    date: "2026-10-04",
    minutes: 4,
    keywords: ["medicine delivery Bengaluru", "medicine home delivery Bangalore", "pharmacy near me delivery", "fast medicine delivery"],
    body: [
      { p: ["Bengaluru has a chemist on almost every street, yet getting a medicine home when you are unwell, busy or caring for someone can still take an hour. Hyperlocal delivery closes that gap by sending a rider to a pharmacy that is already close to you."] },
      { h: "How fast can it be?", p: ["When the pharmacy is a short ride away, delivery can take minutes rather than days. MedMate is being built to show the expected time for every pharmacy before you pay, so you are never guessing, with standard delivery or a scheduled slot if you are not in a hurry."] },
      { h: "What affects delivery time", ul: ["**Distance.** Pharmacies within about 3 km are the quickest. Shops further away take longer and may cost a little more; the app tells you before you choose.", "**Stock.** If one shop does not have everything, one rider can collect from up to three nearby pharmacies.", "**Prescriptions.** Prescription items are packed once the prescription is verified. A [doctor consultation](/doctor-consultation) takes about two minutes.", "**Traffic and weather.** Your rider’s live location is on the map the whole way."] },
      { h: "What it costs", p: ["Each pharmacy sets its own prices, often below MRP (here is [why that is allowed](/blog/why-pharmacies-sell-below-mrp)), and its own delivery charge, with free delivery above a set order value at many shops. MedMate shows the full total for each option before you pay, with no surprises at the door."] },
      { h: "Which areas will MedMate cover?", p: ["MedMate is launching in Bengaluru first. [Find your area](/bengaluru) and join the waitlist, and we will message you when pharmacies near you go live."] },
    ],
    cta: { title: "Coming soon to your area", text: "Join the waitlist and we will message you when MedMate goes live near you.", to: "/home" },
  },
  {
    slug: "how-to-check-medicine-is-genuine",
    title: "How to check if a medicine is genuine",
    description: "Seven simple checks to spot fake or tampered medicines: the pack, batch number, expiry, QR code, seal and bill, and why buying from a licensed pharmacy matters.",
    answer: "Buy from a licensed pharmacy and keep the bill, then check the pack: clean printing, a batch number and expiry date, an intact seal, the MRP and the maker's address. For India's top 300 brands, scan the QR code on the pack to confirm the details.",
    topic: "medicines",
    date: "2026-10-04",
    minutes: 4,
    keywords: ["genuine medicine check", "fake medicine India", "medicine QR code", "batch number expiry"],
    body: [
      { p: ["Fake and substandard medicines are a real risk, especially when they are bought from unknown sellers. A few quick checks, every time, go a long way."] },
      { h: "Seven checks before you open the pack", ul: [
        "**Buy from a licensed pharmacy** and ask for a bill that shows the batch number. Every MedMate order will come from a licensed shop, with its bill.",
        "**Look at the print.** Spelling mistakes, blurred text or faded colours are warning signs. Compare with a pack you bought before.",
        "**Find the batch number, manufacturing date and expiry date.** They must be printed clearly, not stuck on with a label.",
        "**Scan the QR code.** India’s top-selling 300 medicine brands must carry a QR code (since August 2023). Scanning it shows the product name, manufacturer, batch and dates.",
        "**Check the seal.** Bottles and tubes should be sealed; strips should not be torn or re-glued.",
        "**Check the MRP and manufacturer address.** Both must be on the pack. You should never pay more than the MRP.",
        "**Look at the medicine itself.** If tablets are broken, discoloured or smell different from usual, do not take them.",
      ] },
      { h: "If something looks wrong", p: ["Do not take the medicine. Keep the pack and the bill, and show them to the pharmacist. You can also report suspected fake medicines to your State Drugs Control Department."] },
      { p: [NOT_ADVICE] },
    ],
    cta: { title: "Order from licensed pharmacies only", text: "Every MedMate order comes from a licensed pharmacy, with a bill.", to: "/home" },
  },
  {
    slug: "why-pharmacies-sell-below-mrp",
    title: "MRP explained: why pharmacies can sell medicines below MRP",
    description: "What the maximum retail price on a medicine pack means, how price controls work in India, and why the same medicine can cost less at one pharmacy than another.",
    answer: "MRP is the maximum retail price, including taxes. A pharmacy can never charge more than the MRP, but it is free to charge less, which is why the same medicine costs different amounts at different shops.",
    topic: "medicines",
    date: "2026-10-04",
    minutes: 4,
    keywords: ["medicine MRP", "medicine price India", "discount on medicines", "NPPA price control"],
    body: [
      { p: ["Every medicine pack in India shows an MRP, the maximum retail price. As the name says, it is a ceiling, not a fixed price."] },
      { h: "What the MRP includes", p: ["The MRP includes all taxes. No pharmacy may charge you more than the MRP printed on the pack, but any pharmacy may charge less."] },
      { h: "Price controls on essential medicines", p: ["For many essential medicines, the government sets a ceiling price through the National Pharmaceutical Pricing Authority (NPPA) under the Drugs (Prices Control) Order. Manufacturers must keep the MRP of these medicines at or below that ceiling."] },
      { h: "Why prices differ from shop to shop", ul: ["Pharmacies buy at different rates depending on their suppliers and volumes.", "Some shops pass on more of their margin as a discount to win regular customers.", "Different brands of the [same salt](/blog/generic-vs-branded-medicines-same-salt) can have very different MRPs."] },
      { h: "How MedMate will help you compare", p: ["When it launches, MedMate will show each nearby pharmacy’s price for your whole cart, together with its delivery charge and time, so you can choose the best total rather than the lowest single item. Every [medicine page](/medicines) on this site shows the MRP as a reference."] },
    ],
    cta: { title: "Compare prices near you", text: "Scan to see what each nearby pharmacy charges for your cart.", to: "/home" },
  },
  {
    slug: "generic-vs-branded-medicines-same-salt",
    title: "Generic vs branded medicines: what “same salt” means",
    description: "Why two medicines with different names can contain the same active ingredient, how to read the composition on the pack, and when a substitute is appropriate.",
    answer: "Two medicines with the same salt, strength and form are meant to work the same way, even if the brand names and prices differ. Check the composition, strength and type of tablet before switching, and ask your doctor first for medicines like epilepsy, thyroid or blood thinners.",
    topic: "medicines",
    date: "2026-10-04",
    minutes: 5,
    keywords: ["generic vs branded medicine", "same salt medicine", "medicine substitute", "medicine composition"],
    body: [
      { p: ["Walk into any chemist and you will find several brands for the same medicine, often at very different prices. The reason is the salt, the active ingredient that does the work."] },
      { h: "Brand name and salt name", p: ["Every medicine has a composition printed on the pack, for example “Paracetamol (650mg)” or “Telmisartan (40mg) + Metoprolol Succinate (47.5mg)”. The brand name is what a company calls its product. Two brands with the same salts, in the same strength and the same form, are meant to work the same way."] },
      { h: "Why prices differ", p: ["Brands differ in marketing, packaging and company pricing. Prices are also shaped by price controls on many essential medicines, which is why the MRP is printed on every pack and no pharmacy may charge more than it. Read more in [MRP explained](/blog/why-pharmacies-sell-below-mrp)."] },
      { h: "What to check before switching", ul: ["Same salt or salts, with the same strength per tablet or per 5 ml.", "Same form: a sustained-release (SR, ER, PR or OD) tablet is not the same as a regular tablet.", "Same route: a syrup is not a drop, and a cream is not an ointment.", "For some medicines, such as those for epilepsy, thyroid or blood thinning, doctors may prefer you stay on one brand. Ask before switching."] },
      { h: "How substitutes work on MedMate", p: ["Every [medicine page](/medicines) on this site lists other products with the same composition. If your pharmacy does not stock a brand, the pharmacist can offer a same-salt alternative, but only with your consent. You always see the price before you agree."] },
      { p: [NOT_ADVICE] },
    ],
    cta: { title: "Compare prices on the same salt", text: "MedMate shows the price at each pharmacy near you. Scan to open the app.", to: "/home" },
  },
  {
    slug: "how-to-store-medicines-at-home",
    title: "How to store medicines at home the right way",
    description: "Simple rules for storing tablets, syrups, insulin and eye drops at home in Indian weather, checking expiry dates and keeping medicines safe from children.",
    answer: "Keep medicines in their original pack in a cool, dry cupboard away from sunlight, the stove and the bathroom. Follow the label: insulin and some eye drops go in the fridge (2°C to 8°C), never the freezer. Check expiry dates every few months.",
    topic: "care",
    date: "2026-10-04",
    minutes: 4,
    keywords: ["how to store medicines", "medicine storage temperature", "insulin storage", "medicine expiry"],
    body: [
      { p: ["Medicines work best when they are stored the way the label says. Heat, humidity and sunlight can weaken them long before the expiry date, and Indian summers are hard on a medicine cabinet."] },
      { h: "Read the label first", p: ["Most packs say “Store below 25°C” or “Store below 30°C”, “Protect from light and moisture”. Some, like insulin and certain eye drops or vaccines, say “Store in a refrigerator (2°C to 8°C)”. Follow what is printed; it is specific to that product."] },
      { h: "Good places and bad places", ul: ["**Good:** a closed cupboard in a cool, dry room, away from the stove and windows.", "**Bad:** the bathroom (steam and humidity), the kitchen counter near the stove, a car dashboard or a sunny windowsill.", "Fridge items go in the main body of the fridge, not the freezer and not the door if it gets warm. Never freeze insulin."] },
      { h: "Keep the original pack", p: ["The strip or bottle protects the medicine and carries the name, batch number and expiry date. Cutting strips apart can remove the expiry date, so keep at least one intact edge. Here is [how to check a pack is genuine](/blog/how-to-check-medicine-is-genuine)."] },
      { h: "Check expiry dates regularly", ul: ["Go through your medicines every few months and set aside anything past its expiry date.", "Eye drops and some syrups have a shorter life once opened; the label usually says how long, often about four weeks.", "Do not use a medicine that has changed colour, smell or texture, even if it is in date."] },
      { h: "Keep medicines away from children", p: ["Store medicines up high and out of sight, in child-resistant containers where possible. Never call medicine “sweets” in front of children."] },
      { h: "Track what you have", p: ["MedMate’s medicine schedule, coming with the app, will count the doses left in each pack and remind you to refill before you run out, for you and your family."] },
      { p: ["This article is general information, not medical advice. Ask your pharmacist how to store a specific medicine."] },
    ],
    cta: { title: "Never run out of a regular medicine", text: "Add your medicines to MedMate’s schedule and get dose and refill reminders.", to: "/schedule" },
  },
];

/** Blog order: the first post is featured on /blog; Home shows the first three non-pharmacy posts. */
const ORDER = [
  "how-to-read-a-prescription-od-bd-tds-meaning", "paracetamol-500-vs-650-difference", "child-fever-at-night-what-to-do",
  "order-medicines-online-with-prescription", "medicine-delivery-bengaluru", "never-run-out-of-diabetes-medicines",
  "blood-pressure-medicines-why-not-skip", "monsoon-health-bengaluru-medicines-to-keep-at-home", "how-to-check-medicine-is-genuine",
  "why-pharmacies-sell-below-mrp", "generic-vs-branded-medicines-same-salt", "online-doctor-consultation-e-prescription-valid-india",
  "abha-health-id-how-to-create", "late-night-medicine-bengaluru", "how-to-store-medicines-at-home",
  "sell-medicines-online-pharmacy-india", "documents-to-list-pharmacy-online", "schedule-h-h1-x-drugs-pharmacist-guide",
  "reduce-expiry-losses-pharmacy", "gst-billing-for-pharmacies-guide",
];
const ALL = [...BASE_POSTS, ...MORE_POSTS];
export const POSTS: Post[] = [...ORDER.map((slug) => ALL.find((p) => p.slug === slug)!).filter(Boolean), ...ALL.filter((p) => !ORDER.includes(p.slug))];

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug);
export const related = (post: Post, n = 3) =>
  [...POSTS.filter((p) => p.slug !== post.slug && p.topic === post.topic), ...POSTS.filter((p) => p.slug !== post.slug && p.topic !== post.topic)].slice(0, n);
/** Heading anchors for the table of contents. */
export const anchor = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Articles to suggest on a medicine category or medicine page (category id as in the app). */
const BY_CATEGORY: Record<string, string[]> = {
  fever: ["paracetamol-500-vs-650-difference", "child-fever-at-night-what-to-do", "monsoon-health-bengaluru-medicines-to-keep-at-home"],
  cold: ["monsoon-health-bengaluru-medicines-to-keep-at-home", "child-fever-at-night-what-to-do", "late-night-medicine-bengaluru"],
  diabetes: ["never-run-out-of-diabetes-medicines", "how-to-store-medicines-at-home", "how-to-read-a-prescription-od-bd-tds-meaning"],
  heart: ["blood-pressure-medicines-why-not-skip", "how-to-read-a-prescription-od-bd-tds-meaning", "generic-vs-branded-medicines-same-salt"],
  devices: ["blood-pressure-medicines-why-not-skip", "never-run-out-of-diabetes-medicines", "child-fever-at-night-what-to-do"],
  baby: ["child-fever-at-night-what-to-do", "how-to-store-medicines-at-home", "late-night-medicine-bengaluru"],
  firstaid: ["monsoon-health-bengaluru-medicines-to-keep-at-home", "late-night-medicine-bengaluru", "how-to-store-medicines-at-home"],
  stomach: ["monsoon-health-bengaluru-medicines-to-keep-at-home", "how-to-read-a-prescription-od-bd-tds-meaning", "generic-vs-branded-medicines-same-salt"],
  eye: ["how-to-store-medicines-at-home", "how-to-check-medicine-is-genuine", "how-to-read-a-prescription-od-bd-tds-meaning"],
};
const DEFAULT_READS = ["how-to-read-a-prescription-od-bd-tds-meaning", "generic-vs-branded-medicines-same-salt", "how-to-check-medicine-is-genuine"];
export const postsForCategory = (cat: string, n = 3) => (BY_CATEGORY[cat] ?? DEFAULT_READS).slice(0, n).map((slug) => POSTS.find((p) => p.slug === slug)!).filter(Boolean);
