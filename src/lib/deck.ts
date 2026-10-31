import "server-only";
import type { User } from "@prisma/client";
import { db } from "./db";
import { parseList, parseObj } from "./json";
import { scoreCandidate } from "./matching";
import { publicUserSelect } from "./users";
import { DEFAULT_PRIVACY } from "./validation";
import type { GithubStats } from "./github";

export type DeckCard = Awaited<ReturnType<typeof buildDeck>>["cards"][number];

/** Builds the swipe deck: unswiped, discoverable users ranked by explainable score. */
export async function buildDeck(me: User, context = "global", take = 20) {
  const project =
    context !== "global"
      ? await db.project.findFirst({ where: { id: context, ownerId: me.id }, select: { id: true, title: true, requiredSkills: true, rolesNeeded: true, tech: true, category: true, remote: true, location: true } })
      : null;
  if (context !== "global" && !project) return { cards: [], project: null };

  const [swiped, members] = await Promise.all([
    db.swipe.findMany({ where: { swiperId: me.id, context }, select: { targetId: true } }),
    project ? db.projectMember.findMany({ where: { projectId: project.id }, select: { userId: true } }) : Promise.resolve([]),
  ]);
  const exclude = [me.id, ...swiped.map((s) => s.targetId), ...members.map((m) => m.userId)];

  const candidates = await db.user.findMany({
    where: { id: { notIn: exclude }, onboarded: true },
    select: {
      ...publicUserSelect,
      projects: { orderBy: [{ pinned: "desc" }, { stars: "desc" }], take: 2, select: { id: true, title: true, tagline: true, color: true, stars: true, tech: true, thumbnail: true } },
      swipesMade: { where: { targetId: me.id, direction: "super" }, select: { id: true } },
    },
    take: 200,
  });

  const cards = candidates
    .filter((c) => parseObj(c.privacy, DEFAULT_PRIVACY).showInMatch)
    .map((c) => {
      const s = scoreCandidate(me, c, project);
      const privacy = parseObj(c.privacy, DEFAULT_PRIVACY);
      const gh = parseObj<GithubStats & { sample?: boolean }>(c.githubStats, {});
      const topLangs = Object.entries(gh.languageBytes ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      const totalBytes = topLangs.reduce((n, [, b]) => n + b, 0) || 1;
      return {
        id: c.id,
        name: c.name,
        username: c.username,
        image: c.image,
        headline: c.headline,
        bio: c.bio,
        university: privacy.showUniversity ? c.university : "",
        major: privacy.showUniversity ? c.major : "",
        gradYear: c.gradYear,
        company: c.company,
        location: privacy.showLocation ? c.location : "",
        accent: c.accent,
        availability: c.availability,
        lookingForCollab: c.lookingForCollab,
        openToHackathons: c.openToHackathons,
        languages: parseList(c.languages),
        technologies: parseList(c.technologies),
        interests: parseList(c.interests),
        projectTypes: parseList(c.projectTypes),
        isSample: c.isSample,
        superLikedYou: c.swipesMade.length > 0,
        github: c.githubUsername || gh.sample
          ? {
              username: c.githubUsername,
              sample: Boolean(gh.sample),
              contributions: gh.totalContributions ?? null,
              stars: gh.totalStars ?? null,
              repos: gh.publicRepos ?? null,
              prs: gh.mergedPullRequests ?? gh.pullRequests ?? null,
              langs: topLangs.map(([name, b]) => ({ name, pct: Math.round((b / totalBytes) * 100) })),
              recent: (gh.calendar ?? []).slice(-28).map((d) => d.count),
            }
          : null,
        projects: c.projects.map((p) => ({ ...p, tech: parseList(p.tech) })),
        score: s.score,
        reasons: s.reasons,
        shared: s.shared,
        sharedInterests: s.sharedInterests,
      };
    })
    // Super-likers float up a bit; then by score.
    .sort((a, b) => b.score + (b.superLikedYou ? 15 : 0) - (a.score + (a.superLikedYou ? 15 : 0)))
    .slice(0, take);

  return { cards, project: project ? { id: project.id, title: project.title } : null };
}
