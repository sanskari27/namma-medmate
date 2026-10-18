import Link from "next/link";
import { Fragment } from "react";

/** Renders blog text with [label](/path) links and **bold**. Internal links use next/link. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) return link[2].startsWith("/") ? <Link key={i} href={link[2]}>{link[1]}</Link> : <a key={i} href={link[2]} target="_blank" rel="noopener">{link[1]}</a>;
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i}>{bold[1]}</strong>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Plain text (for structured data and meta tags): drops the link and bold markers. */
export const plainText = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
