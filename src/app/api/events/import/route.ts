import { db } from "@/lib/db";
import { authed, HttpError, ok } from "@/lib/api";
import { toList } from "@/lib/json";

/**
 * Admin-only: imports upcoming hackathons from Devpost's public listing JSON
 * (the same endpoint devpost.com/hackathons uses; it is not an official,
 * documented API and may change). In-person locations are geocoded with
 * OpenStreetMap Nominatim at ≤1 req/s, per its usage policy.
 * Imported events are labeled "Devpost" and link to the official page.
 */
export const POST = authed(
  async (_req, { user }) => {
    if (!user.isAdmin) throw new HttpError(403, "Admins only");
    const res = await fetch("https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&order_by=deadline", {
      headers: { Accept: "application/json", "User-Agent": "Hackergram/0.1 (event discovery)" },
      cache: "no-store",
    });
    if (!res.ok) throw new HttpError(502, `Devpost responded ${res.status}`);
    const data = (await res.json()) as { hackathons?: DevpostHackathon[] };
    const list = (data.hackathons ?? []).slice(0, 25);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const h of list) {
      const dates = parseDevpostDates(h.submission_period_dates);
      if (!dates) {
        skipped++;
        continue;
      }
      const location = h.displayed_location?.location ?? "";
      const isOnline = /online/i.test(location) || h.displayed_location?.icon === "globe";
      const externalId = `devpost:${h.id}`;
      const existing = await db.hackathon.findUnique({ where: { externalId } });
      let coords: { lat: number; lng: number } | null = existing?.lat != null ? { lat: existing.lat, lng: existing.lng! } : null;
      if (!isOnline && !coords && location) {
        coords = await geocode(location);
        await new Promise((r) => setTimeout(r, 1100));
      }
      const prizeText = (h.prize_amount ?? "").replace(/<[^>]+>/g, "").trim();
      const prizeAmount = Number(prizeText.replace(/[^0-9.]/g, "")) || 0;
      const data = {
        name: h.title,
        description: `${h.title}${h.organization_name ? ` by ${h.organization_name}` : ""}. Imported from Devpost. See the official page for rules, prizes and registration.`,
        category: "hackathon",
        startsAt: dates.start,
        endsAt: dates.end,
        deadline: dates.end,
        city: isOnline ? "" : location,
        venue: isOnline ? "" : location,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        isOnline,
        organizer: h.organization_name ?? "",
        prize: prizeAmount ? `${prizeText} in prizes` : "",
        prizeAmount: Math.round(prizeAmount),
        website: h.url,
        skills: toList((h.themes ?? []).map((t) => t.name).slice(0, 5)),
        themes: toList((h.themes ?? []).map((t) => t.name)),
        participants: h.registrations_count ?? null,
        beginnerFriendly: (h.themes ?? []).some((t) => /beginner/i.test(t.name)),
      };
      if (existing) {
        await db.hackathon.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await db.hackathon.create({ data: { ...data, externalId, source: "devpost", verified: true, status: "approved" } });
        created++;
      }
    }
    return ok({ created, updated, skipped });
  },
  { limit: 2, windowMs: 10 * 60_000 },
);

type DevpostHackathon = {
  id: number;
  title: string;
  url: string;
  displayed_location?: { icon?: string; location?: string };
  submission_period_dates?: string;
  prize_amount?: string;
  registrations_count?: number;
  themes?: { name: string }[];
  organization_name?: string;
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Parses "Nov 01 - 03, 2026" and "Oct 31 - Nov 02, 2026". */
function parseDevpostDates(s?: string) {
  if (!s) return null;
  const m = s.match(/([A-Za-z]{3})\s+(\d{1,2})(?:,\s*(\d{4}))?\s*-\s*(?:([A-Za-z]{3})\s+)?(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const [, m1, d1, y1, m2, d2, y2] = m;
  const mi1 = MONTHS.indexOf(m1!.toLowerCase());
  const mi2 = m2 ? MONTHS.indexOf(m2.toLowerCase()) : mi1;
  if (mi1 < 0 || mi2 < 0) return null;
  const end = new Date(Number(y2), mi2, Number(d2), 18);
  const start = new Date(Number(y1 ?? y2), mi1, Number(d1), 9);
  if (start > end) start.setFullYear(start.getFullYear() - 1);
  return { start, end };
}

async function geocode(q: string) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "Hackergram/0.1 (hackathon map)" },
    });
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}
