import { LegalPage } from "@/components/legal";
import { COMPANY, REGISTERED_OFFICE, pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Privacy notice for this website",
  description: "What the MedMate website collects through its forms, why, where it is stored, how long we keep it, and your rights under India’s Digital Personal Data Protection Act.",
  path: "/privacy",
});

const UPDATED = "16 October 2026";

const SECTIONS: { h: string; p?: string[]; ul?: string[] }[] = [
  { h: "Who we are", p: [`This website is run by ${COMPANY} (“MedMate”, “we”), ${REGISTERED_OFFICE}. This notice covers this website only. The MedMate app will have its own privacy policy, shown in the app before you sign up.`] },
  { h: "What we collect, and why", ul: [
    "**Waitlist forms:** your name, mobile number, pincode, age and gender (you can choose “Prefer not to say”), your language and the waitlist offer you signed up for. We use them to message you when MedMate launches in your area and to give you the MedMate Premium months you were promised. We use your age to confirm you are 18 or over, and age and gender, counted in totals, to plan which services and health guides to offer first. The waitlist is for people aged 18 and over.",
    "**Contact form:** your topic, name, mobile number, email (optional) and message, so we can reply and handle complaints or privacy requests.",
    "**Pharmacy demo form:** pharmacy name, owner’s name, mobile number, area, city, plan of interest and, if you choose, drug licence number, so our team can arrange a demo.",
    "**Nothing else.** The website has no sign-in, does not ask for health information, and does not use advertising or analytics cookies. Please do not send prescriptions or medical reports through the forms.",
  ] },
  { h: "Consent", p: ["We process form details only with your consent, which you give by ticking the box on the form. You can withdraw consent at any time using the contact form; we will then stop using your details and delete them, unless the law requires us to keep them."] },
  { h: "Where your details are stored", p: ["This website is hosted by Netlify, Inc., which stores form submissions on its servers, which may be outside India. Netlify also keeps short-lived technical logs (such as IP addresses) to run and secure the site. We do not sell your details, and we share them only with service providers who help us run the website, under contract."] },
  { h: "How long we keep them", ul: ["Waitlist details: until we have told you about the launch in your area, and then for up to 12 months, or until you ask us to delete them.", "Contact messages: for as long as we need to handle your request, and then for up to 12 months, longer only if a complaint or the law requires it.", "Pharmacy demo requests: for up to 12 months after the last contact, unless you become a partner."] },
  { h: "Your rights", p: ["Under the Digital Personal Data Protection Act, 2023 you can ask us for a summary of the details we hold about you, ask us to correct, complete or erase them, withdraw your consent, and nominate someone to exercise these rights for you. You can also raise a grievance with us, and if you are not satisfied, complain to the Data Protection Board of India."] },
  { h: "Children", p: ["This website is meant for adults. If you are under 18, please ask a parent or guardian to fill in any form for you."] },
  { h: "Security", p: ["The website is served only over an encrypted (HTTPS) connection, and access to form submissions is limited to the people who need them."] },
  { h: "Changes", p: ["We will update this notice when the website changes, and show the date of the latest version at the top."] },
];

export default function Privacy() {
  return <LegalPage title="Privacy notice" path="/privacy" updated={UPDATED} sections={SECTIONS} />;
}
