import { FeatureLanding } from "@/components/feature";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Online doctor consultation in Bengaluru: coming soon",
  description: "MedMate is launching teleconsultations with registered doctors in Bengaluru. The doctor decides independently whether a prescription is right for you, and a pharmacist checks every prescription before dispensing.",
  path: "/doctor-consultation",
});

export default function DoctorConsultation() {
  return (
    <FeatureLanding
      path="/doctor-consultation"
      crumb="Doctor consultation"
      eyebrow="Doctor consultation · coming soon"
      title="Need a consultation? Talk to a"
      accent="registered doctor."
      lead="When MedMate launches, you will be able to book an audio or video consultation with a registered medical practitioner. The doctor makes an independent decision about whether a prescription is right for you, and may decide it is not."
      cta="Join the waitlist"
      to="/home"
      screen={["/screens/tracking.webp", "Preview of the MedMate app in development"]}
      steps={[
        ["steth", "Book a consultation", "Choose a time that suits you. You will see the doctor’s name, qualification and registration number before the call."],
        ["phone", "Talk to the doctor", "Describe your symptoms or your existing treatment. The doctor follows India’s Telemedicine Practice Guidelines."],
        ["rx-doc", "The doctor decides", "If a medicine is right for you, the doctor issues a digital prescription. If not, they will tell you what to do next, such as seeing someone in person."],
        ["store", "A pharmacist checks it", "Any prescription medicine is dispensed only by a licensed pharmacy after its pharmacist checks the prescription."],
      ]}
      points={[
        ["shield", "Registered doctors only", "Every consulting doctor is a registered medical practitioner. Their name, qualification and registration number are shown before each consultation and on the prescription."],
        ["check", "An independent decision", "The doctor makes the medical decision on their own judgement. If a prescription medicine is not dispensed, you are not charged for it."],
        ["user", "Your consent and privacy", "You choose to start the consultation, and your notes and prescription are shared only with you and, if you order, the pharmacy that fulfils it."],
      ]}
      faqs={[
        ["When can I book a consultation?", "When MedMate launches in Bengaluru. Join the waitlist and we will message you the day it opens in your area."],
        ["Will the doctor always give me a prescription?", "No. The doctor makes an independent medical decision. Some conditions need an in-person examination, and some medicines cannot be prescribed in a teleconsultation at all."],
        ["Which medicines cannot be prescribed online?", "Under India’s Telemedicine Practice Guidelines, narcotic and psychotropic medicines and Schedule X drugs cannot be prescribed in a teleconsultation."],
        ["Can I use a prescription from my own doctor instead?", "Yes. You will be able to upload a clear photo or PDF of a valid prescription."],
        ["When does this start?", "With the MedMate launch in Bengaluru. Join the waitlist and we will message you."],
      ]}
    />
  );
}
