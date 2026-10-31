import { FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseList } from "@/lib/json";
import { scoreCandidate } from "@/lib/matching";
import { ProjectsBrowser } from "@/components/projects/ProjectsBrowser";
import { PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const me = await requireUser();
  const projects = await db.project.findMany({
    orderBy: [{ isListing: "desc" }, { updatedAt: "desc" }],
    take: 120,
    include: {
      owner: { select: { id: true, name: true, username: true, image: true, isSample: true } },
      members: { where: { status: "active" }, include: { user: { select: { name: true, image: true } } } },
    },
  });

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-5 md:px-8 md:py-8">
      <PageHeader title="Projects" subtitle="Find a team, or build one." accent="blue" icon={FolderKanban} />
      <ProjectsBrowser
        meId={me.id}
        projects={projects.map((p) => {
          // "Fit" = how well *you* match what this listing needs.
          const fit = p.isListing && p.ownerId !== me.id
            ? scoreCandidate(
                { ...p.owner, languages: "[]", technologies: "[]", interests: "[]", projectTypes: "[]", university: "", location: "", lat: null, lng: null, availability: "", lookingForCollab: true },
                me,
                p,
              ).score
            : null;
          return {
            id: p.id,
            title: p.title,
            tagline: p.tagline,
            color: p.color,
            thumbnail: p.thumbnail,
            category: p.category,
            stars: p.stars,
            tech: parseList(p.tech),
            isListing: p.isListing && p.status === "open",
            rolesNeeded: parseList(p.rolesNeeded),
            requiredSkills: parseList(p.requiredSkills),
            stage: p.stage,
            commitment: p.commitment,
            remote: p.remote,
            location: p.location,
            beginnerFriendly: p.beginnerFriendly,
            teamSize: p.teamSize,
            owner: p.owner,
            members: p.members.map((m) => m.user),
            createdAt: p.createdAt.toISOString(),
            fit,
          };
        })}
      />
    </div>
  );
}
