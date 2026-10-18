import { ZONES } from "@/lib/areas";
import { POSTS } from "@/lib/blog";
import { CATEGORIES, PRODUCTS } from "@/lib/catalogue";
import { COMPANY, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/** Plain-text site summary for AI assistants and answer engines (llmstxt.org). */
export function GET() {
  const text = `# MedMate

> MedMate is a medicine delivery app made in Bengaluru by ${COMPANY}. Status (October 2026): launching soon in Bengaluru, not yet taking orders; join the waitlist at ${SITE_URL}/download. When live, licensed neighbourhood pharmacies list their stock, customers order in the app, and a rider delivers from a nearby pharmacy. MedMate holds no stock itself; medicines are sold and dispensed by licensed pharmacies.

Key facts:
- Customers will compare each nearby pharmacy's price, delivery charge and time before paying.
- One rider can collect from up to three nearby pharmacies when one shop lacks an item (planned).
- Prescription medicines are dispensed only by a licensed pharmacy against a valid prescription, checked by a registered pharmacist. Customers can upload a prescription or book a consultation with a registered doctor, who decides independently.
- Payments (at launch): UPI, card or cash on delivery.
- For pharmacies: the MedMate Partner console (Namma MedMate) is one ERP and POS for GST billing, batch-wise inventory with expiry alerts, purchases, prescriptions, CRM and credit khata. Pharmacies set their own prices and keep their customers; each shop's online store and delivery are launching soon in Bengaluru. Plans: Essential ₹299, Care ₹499, Growth ₹999, Flagship ₹1,499 a month, first 3 months free, no setup fee, no lock-in.

Full text of every article and FAQ: ${SITE_URL}/llms-full.txt

## Main pages
- [Home](${SITE_URL}/): what MedMate is and how it works
- [Join the waitlist](${SITE_URL}/download): waitlist members get MedMate Premium free for 3 months from launch day in their area ([terms](${SITE_URL}/premium))
- [Contact and grievances](${SITE_URL}/contact) · [Privacy notice](${SITE_URL}/privacy) · [Terms of use](${SITE_URL}/terms)
- [Doctor consultation (coming soon)](${SITE_URL}/doctor-consultation)
- [Upload a prescription (coming soon)](${SITE_URL}/upload-prescription)
- [For pharmacies: Partner console, pricing and free demo](${SITE_URL}/pharmacy-partner)
- [About MedMate: founder Roni Paul's story and the team](${SITE_URL}/about)
- [Medicine delivery in Bengaluru, launching soon: areas and pincodes](${SITE_URL}/bengaluru)
- [All medicines](${SITE_URL}/medicines): ${PRODUCTS.length} products in ${CATEGORIES.length} categories

## Blog
${POSTS.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.answer}`).join("\n")}

## Bengaluru areas
${ZONES.map((z) => `- ${z.zone}: ${z.areas.map((a) => `[${a.name}${a.pins.length ? ` ${a.pins.join("/")}` : ""}](${SITE_URL}/bengaluru/${a.slug})`).join(", ")}`).join("\n")}

## Medicine categories
${CATEGORIES.map((c) => `- [${c.name}](${SITE_URL}/medicines/${c.slug})`).join("\n")}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
