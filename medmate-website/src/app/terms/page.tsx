import { LegalPage } from "@/components/legal";
import { COMPANY, pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Terms of use for this website",
  description: "The terms for using the MedMate website: information only, not medical advice, MRP and product information, intellectual property, and governing law.",
  path: "/terms",
});

const SECTIONS: { h: string; p?: string[]; ul?: string[] }[] = [
  { h: "About these terms", p: [`This website is run by ${COMPANY} (“MedMate”). By using it, you agree to these terms. Ordering through the MedMate app, when it launches, will be covered by the app’s own terms.`] },
  { h: "MedMate is not taking orders yet", p: ["MedMate is launching soon in Bengaluru. Nothing on this website is an offer to sell medicines. When the service launches, medicines will be sold and dispensed by licensed partner pharmacies, not by MedMate."] },
  { h: "Waitlist offer: MedMate Premium", p: ["People who join the waitlist before MedMate launches in their area get MedMate Premium free for 3 months from the day MedMate launches in their area, on the terms set out on the [MedMate Premium page](/premium). Those terms form part of these terms. If you joined while an offer was shown, you keep that offer even if it later changes for new sign-ups."] },
  { h: "Information only, not medical advice", p: ["Medicine pages and articles are general information to help you talk to your doctor or pharmacist. They are not a diagnosis, a prescription or a substitute for professional advice. Do not start, stop or change a medicine because of something you read here. In an emergency, call 112 or go to the nearest hospital."] },
  { h: "Product information and prices", p: ["Product details come from manufacturers’ and marketers’ listings and may differ from the pack you receive; always read the label. MRPs are shown as listed on the date stated on each page and may change. No pharmacy may charge more than the MRP printed on the pack."] },
  { h: "Your use of the website", ul: ["Use the website lawfully and only for personal, non-commercial purposes.", "Do not copy the website’s content in bulk, scrape it, or try to break its security.", "Give true details in the forms, and do not submit someone else’s details without their permission."] },
  { h: "Intellectual property", p: ["The MedMate name, logo, design and original content belong to MedMate. Medicine and brand names belong to their owners and are used only to identify the products."] },
  { h: "Links to other sites", p: ["Links to government and other websites are for convenience. We are not responsible for their content."] },
  { h: "Liability", p: ["We work to keep the website accurate and available, but it is provided as it is, and we cannot promise it will always be error-free. To the extent the law allows, MedMate is not liable for losses arising from use of the website’s general information."] },
  { h: "Governing law", p: ["These terms are governed by the laws of India. Courts in Bengaluru, Karnataka have jurisdiction, without affecting your rights as a consumer to approach a consumer commission."] },
  { h: "Changes", p: ["We may update these terms and will show the date of the latest version at the top."] },
];

export default function Terms() {
  return <LegalPage title="Terms of use" path="/terms" updated="16 October 2026" sections={SECTIONS} />;
}
