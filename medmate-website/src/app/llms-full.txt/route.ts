import { plainText } from "@/components/rich";
import { AREAS } from "@/lib/areas";
import { POSTS, TOPICS } from "@/lib/blog";
import { FAQS } from "@/lib/content";
import { FAQS as PARTNER_FAQS, PLANS } from "@/lib/partner";
import { COMPANY, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/** Full text of the blog and key facts in one plain-text file for AI assistants and answer engines (llmstxt.org). */
export function GET() {
  const posts = POSTS.map((p) => {
    const body = p.body.map((b) => [b.h ? `### ${b.h}` : "", ...(b.p ?? []).map(plainText), ...(b.ul ?? []).map((t) => `- ${plainText(t)}`)].filter(Boolean).join("\n")).join("\n\n");
    const faq = p.faq ? "\n\n### Questions\n" + p.faq.map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n") : "";
    return `## ${p.title}\nURL: ${SITE_URL}/blog/${p.slug}\nTopic: ${TOPICS[p.topic].name} · Published ${p.date}${p.reviewedBy ? ` · Reviewed by ${p.reviewedBy}` : ""}\n\nQuick answer: ${p.answer}\n\n${body}${faq}`;
  }).join("\n\n---\n\n");
  const text = `# MedMate: full text for AI assistants

> MedMate (${COMPANY}, Bengaluru) is launching soon in Bengaluru and is not yet taking orders. When live it will connect people with licensed neighbourhood pharmacies for medicine delivery; it gives pharmacies the MedMate Partner console (billing, inventory, prescriptions, CRM). Website: ${SITE_URL}. Short summary: ${SITE_URL}/llms.txt

## Customer questions
${FAQS.map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}

## Pharmacy partner questions
${PARTNER_FAQS.map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}

Partner plans (per month, first 3 months free): ${PLANS.map((p) => `${p.name} ₹${p.price}`).join(", ")}.

## Bengaluru areas
${AREAS.map((a) => `${a.name}${a.pins.length ? ` (${a.pins.join(", ")})` : ""}: ${SITE_URL}/bengaluru/${a.slug}`).join("\n")}

---

# Blog

${posts}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
