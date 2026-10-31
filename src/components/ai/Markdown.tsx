import { Fragment } from "react";

/** Tiny, safe markdown renderer (no HTML injection): headings, lists, bold/italic, code. */
export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) code.push(lines[i++]!);
      i++;
      blocks.push(<pre key={i} className="my-2 overflow-x-auto rounded-2xl bg-ink p-3 font-mono text-[12.5px] text-white">{code.join("\n")}</pre>);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      const size = h[1]!.length <= 2 ? "text-lg" : "text-[15px]";
      blocks.push(<p key={i} className={`mt-3 font-display font-bold ${size}`}>{inline(h[2]!)}</p>);
      i++;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const items: string[] = [];
      const ordered = /^\s*\d+\./.test(line);
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const L = ordered ? "ol" : "ul";
      blocks.push(
        <L key={i} className={`my-1.5 space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((it, j) => <li key={j}>{inline(it)}</li>)}
        </L>,
      );
      continue;
    }
    if (line.trim()) blocks.push(<p key={i} className="my-1.5">{inline(line)}</p>);
    i++;
  }
  return <div className="text-[14.5px] leading-relaxed">{blocks}</div>;
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="rounded-md bg-grape-soft px-1.5 py-0.5 font-mono text-[12.5px] text-grape-deep">{p.slice(1, -1)}</code>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}
