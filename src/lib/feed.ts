import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { parseList, parseObj } from "./json";
import { miniUserSelect } from "./users";
import { haversineKm } from "./utils";

export const FEED_FILTERS = ["foryou", "following", "projects", "discussions", "local", "hackathons"] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

const postInclude = (viewerId: string) =>
  ({
    author: { select: { ...miniUserSelect, lat: true, lng: true, location: true } },
    project: { select: { id: true, title: true, tagline: true, tech: true, color: true, stars: true, thumbnail: true, isListing: true, rolesNeeded: true } },
    hackathon: { select: { id: true, name: true, city: true, startsAt: true, isOnline: true, source: true } },
    repostOf: {
      include: {
        author: { select: miniUserSelect },
        project: { select: { id: true, title: true, tagline: true, tech: true, color: true, stars: true, thumbnail: true, isListing: true, rolesNeeded: true } },
        hackathon: { select: { id: true, name: true, city: true, startsAt: true, isOnline: true, source: true } },
      },
    },
    likes: { where: { userId: viewerId }, select: { userId: true } },
    bookmarks: { where: { userId: viewerId }, select: { userId: true } },
    _count: { select: { likes: true, comments: true, reposts: true } },
  }) satisfies Prisma.PostInclude;

type RawPost = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>;

export type RepoPreview = { fullName: string; url: string; description: string; stars: number; forks: number; language: string | null; topics?: string[]; verified: boolean };

function serializeInner(p: {
  id: string;
  kind: string;
  content: string;
  imageUrl: string | null;
  repoUrl: string | null;
  repoPreview: string | null;
  createdAt: Date;
  author: { id: string; name: string; username: string; image: string | null; headline: string; isSample: boolean };
  project: { id: string; title: string; tagline: string; tech: string; color: string; stars: number; thumbnail: string | null; isListing: boolean; rolesNeeded: string } | null;
  hackathon: { id: string; name: string; city: string; startsAt: Date; isOnline: boolean; source: string } | null;
}) {
  return {
    id: p.id,
    kind: p.kind,
    content: p.content,
    imageUrl: p.imageUrl,
    repoUrl: p.repoUrl,
    repoPreview: p.repoPreview ? parseObj<RepoPreview | {}>(p.repoPreview, {}) as RepoPreview : null,
    createdAt: p.createdAt.toISOString(),
    author: { id: p.author.id, name: p.author.name, username: p.author.username, image: p.author.image, headline: p.author.headline, isSample: p.author.isSample },
    project: p.project ? { ...p.project, tech: parseList(p.project.tech), rolesNeeded: parseList(p.project.rolesNeeded) } : null,
    hackathon: p.hackathon ? { ...p.hackathon, startsAt: p.hackathon.startsAt.toISOString() } : null,
  };
}

export function serializePost(p: RawPost) {
  return {
    ...serializeInner(p),
    liked: p.likes.length > 0,
    bookmarked: p.bookmarks.length > 0,
    counts: p._count,
    repostOf: p.repostOf ? serializeInner(p.repostOf) : null,
  };
}
export type FeedPost = ReturnType<typeof serializePost>;

export async function getFeed(viewer: { id: string; lat: number | null; lng: number | null; interests: string; languages: string; technologies: string }, filter: FeedFilter, cursor?: string, take = 15) {
  const where: Prisma.PostWhereInput = {};
  if (filter === "following") {
    const f = await db.follow.findMany({ where: { followerId: viewer.id }, select: { followingId: true } });
    where.authorId = { in: [viewer.id, ...f.map((x) => x.followingId)] };
  } else if (filter === "projects") where.kind = { in: ["project", "repo", "collab"] };
  else if (filter === "discussions") where.kind = { in: ["question", "update"] };
  else if (filter === "hackathons") where.kind = "hackathon";

  // Pages are chronological windows; "For You" re-ranks within each window and
  // "Local" filters within it, so cursors stay stable and never duplicate posts.
  const window = filter === "local" ? take * 3 : take;
  const fetched = await db.post.findMany({
    where,
    include: postInclude(viewer.id),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: window + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });
  const raw = fetched.slice(0, window);
  const nextCursor = fetched.length > window ? raw[raw.length - 1]!.id : null;

  let posts = raw;
  if (filter === "local") {
    if (viewer.lat == null || viewer.lng == null) return { posts: [], nextCursor: null, needsLocation: true };
    posts = raw.filter((p) => p.author.lat != null && p.author.lng != null && haversineKm({ lat: viewer.lat!, lng: viewer.lng! }, { lat: p.author.lat!, lng: p.author.lng! }) < 150);
  } else if (filter === "foryou") {
    // Light personalization: boost posts that mention your skills/interests and recent engagement.
    const terms = [...parseList(viewer.interests), ...parseList(viewer.languages), ...parseList(viewer.technologies)].map((t) => t.toLowerCase());
    const score = (p: RawPost) => {
      const hours = (Date.now() - p.createdAt.getTime()) / 3600_000;
      const text = `${p.content} ${p.project?.tech ?? ""}`.toLowerCase();
      const rel = terms.filter((t) => t.length > 1 && text.includes(t)).length;
      return (p._count.likes * 2 + p._count.comments * 3 + rel * 6 + 4) / Math.pow(hours + 2, 1.15);
    };
    posts = [...raw].sort((a, b) => score(b) - score(a));
  }

  return { posts: posts.map(serializePost), nextCursor, needsLocation: false };
}

export async function getPost(viewerId: string, id: string) {
  const p = await db.post.findUnique({ where: { id }, include: postInclude(viewerId) });
  return p ? serializePost(p) : null;
}
