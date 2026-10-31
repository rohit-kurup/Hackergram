import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseList } from "@/lib/json";
import { recommendedUsers, trendingProjects } from "@/lib/recommend";
import { ExploreView } from "@/components/explore/ExploreView";

export const metadata = { title: "Explore" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireUser();
  const { q } = await searchParams;
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const [users, recs, projects, events, newest] = await Promise.all([
    db.user.findMany({
      where: { onboarded: true, id: { not: me.id } },
      select: {
        id: true, name: true, username: true, image: true, headline: true, languages: true, technologies: true, accent: true, isSample: true,
        _count: { select: { followers: true, posts: { where: { createdAt: { gte: weekAgo } } } } },
      },
      take: 300,
    }),
    recommendedUsers(me, 6),
    trendingProjects(6),
    db.hackathon.findMany({ where: { status: "approved", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 4, include: { _count: { select: { attendance: true } } } }),
    db.user.findMany({ where: { onboarded: true, id: { not: me.id } }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, username: true, image: true, headline: true, isSample: true } }),
  ]);

  const tech = new Map<string, number>();
  for (const u of users) for (const t of [...parseList(u.languages), ...parseList(u.technologies)]) tech.set(t, (tech.get(t) ?? 0) + 1);

  return (
    <ExploreView
      initialQuery={q ?? ""}
      trendingDevs={[...users]
        .sort((a, b) => b._count.followers * 2 + b._count.posts * 3 - (a._count.followers * 2 + a._count.posts * 3))
        .slice(0, 8)
        .map((u) => ({ id: u.id, name: u.name, username: u.username, image: u.image, headline: u.headline, accent: u.accent, isSample: u.isSample, followers: u._count.followers, skills: [...parseList(u.languages), ...parseList(u.technologies)].slice(0, 3) }))}
      recommended={recs}
      projects={projects}
      technologies={[...tech.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([name, count]) => ({ name, count }))}
      events={events.map((e) => ({ id: e.id, name: e.name, city: e.isOnline ? "Online" : e.city, startsAt: e.startsAt.toISOString(), going: e._count.attendance, source: e.source, prize: e.prize }))}
      newest={newest}
    />
  );
}
