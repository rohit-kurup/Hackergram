import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDeck } from "@/lib/deck";
import { parseList } from "@/lib/json";
import { ProjectDetail } from "@/components/projects/ProjectDetail";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const p = await db.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true, headline: true, isSample: true } },
      members: { include: { user: { select: { id: true, name: true, username: true, image: true, headline: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!p) notFound();
  const isOwner = p.ownerId === me.id;
  const myMembership = p.members.find((m) => m.userId === me.id) ?? null;
  const recs = isOwner && p.isListing ? (await buildDeck(me, p.id, 6)).cards : [];

  return (
    <ProjectDetail
      isOwner={isOwner}
      myStatus={myMembership?.status ?? null}
      project={{
        id: p.id, title: p.title, tagline: p.tagline, description: p.description, color: p.color, thumbnail: p.thumbnail, category: p.category,
        tech: parseList(p.tech), repoUrl: p.repoUrl, demoUrl: p.demoUrl, stars: p.stars, forks: p.forks, source: p.source,
        isListing: p.isListing, status: p.status, rolesNeeded: parseList(p.rolesNeeded), requiredSkills: parseList(p.requiredSkills),
        teamSize: p.teamSize, stage: p.stage, commitment: p.commitment, remote: p.remote, location: p.location, beginnerFriendly: p.beginnerFriendly,
        createdAt: p.createdAt.toISOString(), owner: p.owner,
      }}
      members={p.members.filter((m) => isOwner || m.status === "active" || m.userId === me.id).map((m) => ({ id: m.userId, role: m.role, status: m.status, user: m.user }))}
      recommendations={recs.map((c) => ({ id: c.id, name: c.name, username: c.username, image: c.image, headline: c.headline, score: c.score, reasons: c.reasons, skills: [...c.languages, ...c.technologies].slice(0, 4) }))}
    />
  );
}
