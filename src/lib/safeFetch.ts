import "server-only";
import { lookup } from "dns/promises";
import { isIP } from "net";

function isPrivate(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v === "::";
  }
  const [a, b] = ip.split(".").map(Number) as [number, number];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/**
 * Fetches a public https page as text, refusing private/loopback addresses
 * (SSRF guard), following no redirects, with size and time limits.
 */
export async function fetchPublicPage(raw: string, maxBytes = 400_000) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Only https:// links are supported");
  const host = url.hostname;
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new Error("That address isn't allowed");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": "Hackergram/0.1 (application assistant)", Accept: "text/html" } });
    if (res.status >= 300 && res.status < 400) throw new Error("That link redirects. Paste the final URL, or paste the questions directly.");
    if (!res.ok) throw new Error(`The page responded ${res.status}`);
    const text = (await res.text()).slice(0, maxBytes);
    return text;
  } finally {
    clearTimeout(t);
  }
}

/** Rough HTML → text, keeping form labels and headings. */
export function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/label|\/tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, 20_000);
}
