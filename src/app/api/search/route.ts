import { db } from "@/lib/db";
import { authed, ok } from "@/lib/api";
import { parseList } from "@/lib/json";

/**
 * Universal search across developers, projects, repos, events, posts and teams.
 * Uses simple case-insensitive substring matching (works on SQLite & Postgres);
 * swap for Postgres full-text search or Meilisearch at scale.
 */
export const GET = authed(async (req) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const type = url.searchParams.get("type") ?? "all";
  const limit = url.searchParams.get("limit") === "small" ? 4 : 20;
  if (q.length < 1) return ok({ q, results: {} });
  const has = (field: string) => ({ [field]: { contains: q } });
  const want = (t: string) => type === "all" || type === t;

  const [people, projects, repos, events, posts] = await Promise.all([
    want("people")
      ? db.user.findMany({
          where: { onboarded: true, OR: ["name", "username", "headline", "university", "company", "languages", "technologies", "interests", "location"].map(has) },
          select: { id: true, name: true, username: true, image: true, headline: true, university: true, company: true, languages: true, isSample: true },
          take: limit,
        })
      : [],
    want("projects")
      ? db.project.findMany({
          where: { OR: ["title", "tagline", "description", "tech", "category", "rolesNeeded", "requiredSkills"].map(has) },
          select: { id: true, title: true, tagline: true, color: true, tech: true, isListing: true, stars: true },
          orderBy: { stars: "desc" },
          take: limit,
        })
      : [],
    want("repos")
      ? db.githubRepo.findMany({
          where: { isPrivate: false, OR: ["name", "fullName", "description", "language", "topics"].map(has) },
          select: { id: true, fullName: true, description: true, url: true, language: true, stars: true, user: { select: { username: true, privacy: true } } },
          orderBy: { stars: "desc" },
          take: limit,
        })
      : [],
    want("events")
      ? db.hackathon.findMany({
          where: { status: "approved", OR: ["name", "city", "university", "organizer", "skills", "description"].map(has) },
          select: { id: true, name: true, city: true, isOnline: true, startsAt: true, source: true },
          orderBy: { startsAt: "asc" },
          take: limit,
        })
      : [],
    want("posts")
      ? db.post.findMany({
          where: { content: { contains: q } },
          select: { id: true, content: true, createdAt: true, author: { select: { name: true, username: true, image: true } } },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : [],
  ]);

  return ok({
    q,
    results: {
      people: people.map((p) => ({ ...p, languages: parseList(p.languages).slice(0, 3) })),
      projects: projects.map((p) => ({ ...p, tech: parseList(p.tech).slice(0, 3) })),
      repos: repos.filter((r) => !r.user.privacy.includes('"showRepos":false')).map(({ user, ...r }) => ({ ...r, owner: user.username })),
      events: events.map((e) => ({ ...e, startsAt: e.startsAt.toISOString() })),
      posts: posts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    },
  });
});
