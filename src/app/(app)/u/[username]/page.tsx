import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializePost } from "@/lib/feed";
import { parseList, parseObj } from "@/lib/json";
import { DEFAULT_PRIVACY } from "@/lib/validation";
import type { GithubStats } from "@/lib/github";
import { aiConfigured } from "@/lib/ai";
import { ProfileView } from "@/components/profile/ProfileView";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const me = await requireUser();
  const { username } = await params;
  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      education: { orderBy: { endYear: "desc" } },
      experience: true,
      projects: { orderBy: [{ pinned: "desc" }, { stars: "desc" }], include: { members: { where: { status: "active" }, take: 5, include: { user: { select: { name: true, image: true } } } } } },
      memberships: { where: { status: "active" }, include: { project: { select: { id: true, title: true, color: true, ownerId: true } } } },
      attendance: { include: { hackathon: { select: { id: true, name: true, startsAt: true, city: true, isOnline: true } } }, orderBy: { createdAt: "desc" } },
      activity: { orderBy: { occurredAt: "desc" }, take: 12 },
      repos: { where: { isFork: false }, orderBy: [{ stars: "desc" }, { pushedAt: "desc" }], take: 12 },
      _count: { select: { followers: true, following: true, posts: true } },
    },
  });
  if (!user) notFound();

  const isMe = user.id === me.id;
  const privacy = parseObj(user.privacy, DEFAULT_PRIVACY);
  const show = (flag: boolean) => isMe || flag;
  const [following, posts] = await Promise.all([
    isMe ? null : db.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: user.id } } }),
    db.post.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        author: { select: { id: true, name: true, username: true, image: true, headline: true, isSample: true, lastSeenAt: true, lat: true, lng: true, location: true } },
        project: { select: { id: true, title: true, tagline: true, tech: true, color: true, stars: true, thumbnail: true, isListing: true, rolesNeeded: true } },
        hackathon: { select: { id: true, name: true, city: true, startsAt: true, isOnline: true, source: true } },
        repostOf: {
          include: {
            author: { select: { id: true, name: true, username: true, image: true, headline: true, isSample: true, lastSeenAt: true } },
            project: { select: { id: true, title: true, tagline: true, tech: true, color: true, stars: true, thumbnail: true, isListing: true, rolesNeeded: true } },
            hackathon: { select: { id: true, name: true, city: true, startsAt: true, isOnline: true, source: true } },
          },
        },
        likes: { where: { userId: me.id }, select: { userId: true } },
        bookmarks: { where: { userId: me.id }, select: { userId: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
      },
    }),
  ]);

  const gh = parseObj<GithubStats & { sample?: boolean }>(user.githubStats, {});
  const showActivity = show(privacy.showActivity);

  return (
    <ProfileView
      isMe={isMe}
      aiReady={aiConfigured()}
      initialFollowing={Boolean(following)}
      user={{
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        headline: user.headline,
        bio: user.bio,
        accent: user.accent,
        email: show(privacy.showEmail) ? user.email : null,
        location: show(privacy.showLocation) ? user.location : "",
        university: show(privacy.showUniversity) ? user.university : "",
        major: show(privacy.showUniversity) ? user.major : "",
        gradYear: show(privacy.showUniversity) ? user.gradYear : null,
        company: user.company,
        availability: user.availability,
        lookingForCollab: user.lookingForCollab,
        openToHackathons: user.openToHackathons,
        isSample: user.isSample,
        lastSeenAt: user.lastSeenAt.toISOString(),
        githubUsername: user.githubUsername,
        githubSyncedAt: user.githubSyncedAt?.toISOString() ?? null,
        languages: parseList(user.languages),
        technologies: parseList(user.technologies),
        interests: parseList(user.interests),
        projectTypes: parseList(user.projectTypes),
        aiSummary: user.aiSummary,
        aiSummaryModel: user.aiSummaryModel,
        aiSummaryAt: user.aiSummaryAt?.toISOString() ?? null,
        counts: { followers: user._count.followers, following: user._count.following, projects: user.projects.length, posts: user._count.posts },
      }}
      github={
        show(privacy.showRepos)
          ? {
              stats: gh,
              repos: user.repos
                .filter((r) => isMe || !r.isPrivate)
                .map((r) => ({ id: r.id, name: r.name, description: r.description, url: r.url, language: r.language, stars: r.stars, forks: r.forks, isPrivate: r.isPrivate, topics: parseList(r.topics), pushedAt: r.pushedAt?.toISOString() ?? null })),
              activity: showActivity ? user.activity.map((a) => ({ id: a.id, title: a.title, url: a.url, type: a.type, occurredAt: a.occurredAt.toISOString() })) : [],
            }
          : null
      }
      projects={user.projects.map((p) => ({
        id: p.id,
        title: p.title,
        tagline: p.tagline,
        color: p.color,
        thumbnail: p.thumbnail,
        tech: parseList(p.tech),
        category: p.category,
        stars: p.stars,
        forks: p.forks,
        repoUrl: p.repoUrl,
        demoUrl: p.demoUrl,
        pinned: p.pinned,
        source: p.source,
        isListing: p.isListing,
        members: p.members.map((m) => m.user),
      }))}
      teams={user.memberships.filter((m) => m.project.ownerId !== user.id).map((m) => ({ id: m.project.id, title: m.project.title, color: m.project.color, role: m.role }))}
      education={user.education.map(({ userId, ...e }) => e)}
      experience={user.experience.map(({ userId, ...e }) => e)}
      events={showActivity ? user.attendance.map((a) => ({ id: a.hackathon.id, name: a.hackathon.name, startsAt: a.hackathon.startsAt.toISOString(), where: a.hackathon.isOnline ? "Online" : a.hackathon.city })) : []}
      posts={showActivity ? posts.map(serializePost) : []}
    />
  );
}
