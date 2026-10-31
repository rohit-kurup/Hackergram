import "server-only";
import type { User } from "@prisma/client";
import { db } from "./db";
import { parseList, parseObj } from "./json";
import { scoreCandidate } from "./matching";
import { publicUserSelect } from "./users";
import { DEFAULT_PRIVACY } from "./validation";

export async function recommendedUsers(me: User, n = 6, excludeFollowed = true) {
  const followed = excludeFollowed
    ? (await db.follow.findMany({ where: { followerId: me.id }, select: { followingId: true } })).map((f) => f.followingId)
    : [];
  const candidates = await db.user.findMany({
    where: { id: { notIn: [me.id, ...followed] }, onboarded: true },
    select: publicUserSelect,
    take: 150,
    orderBy: { lastSeenAt: "desc" },
  });
  return candidates
    .filter((c) => parseObj(c.privacy, DEFAULT_PRIVACY).showInMatch)
    .map((c) => ({ user: c, ...scoreCandidate(me, c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ user, score, reasons }) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      headline: user.headline,
      isSample: user.isSample,
      lastSeenAt: user.lastSeenAt.toISOString(),
      skills: [...parseList(user.languages), ...parseList(user.technologies)].slice(0, 3),
      score,
      reason: reasons[0] ?? "Active builder",
    }));
}

export async function trendingProjects(n = 4) {
  const since = new Date(Date.now() - 30 * 864e5);
  const projects = await db.project.findMany({
    include: {
      owner: { select: { name: true, username: true, image: true, isSample: true } },
      members: { take: 4, include: { user: { select: { name: true, image: true } } } },
      _count: { select: { posts: { where: { createdAt: { gte: since } } } } },
    },
    take: 60,
    orderBy: { updatedAt: "desc" },
  });
  return projects
    .map((p) => ({ p, s: p.stars + p._count.posts * 8 + (p.isListing ? 5 : 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(({ p }) => ({
      id: p.id,
      title: p.title,
      tagline: p.tagline,
      color: p.color,
      thumbnail: p.thumbnail,
      stars: p.stars,
      tech: parseList(p.tech),
      isListing: p.isListing,
      owner: p.owner,
      members: p.members.map((m) => m.user),
    }));
}
