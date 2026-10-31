import { Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { db } from "@/lib/db";
import { parseList } from "@/lib/json";
import { ProjectForm, type ProjectFormValues } from "@/components/projects/ProjectForm";
import { PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const p = await db.project.findUnique({ where: { id } });
  if (!p || p.ownerId !== me.id) notFound();
  const initial: ProjectFormValues = {
    title: p.title, tagline: p.tagline, description: p.description, tech: parseList(p.tech), category: p.category, repoUrl: p.repoUrl, demoUrl: p.demoUrl,
    color: p.color as ProjectFormValues["color"], thumbnail: p.thumbnail, isListing: p.isListing, rolesNeeded: parseList(p.rolesNeeded),
    requiredSkills: parseList(p.requiredSkills), teamSize: p.teamSize, stage: p.stage as ProjectFormValues["stage"], commitment: p.commitment,
    remote: p.remote, location: p.location, beginnerFriendly: p.beginnerFriendly,
  };
  return (
    <div className="mx-auto max-w-[1060px] px-4 py-5 md:px-8 md:py-8">
      <PageHeader title={`Edit ${p.title}`} accent="blue" icon={Pencil} />
      <ProjectForm initial={initial} id={p.id} aiReady={aiConfigured()} />
    </div>
  );
}
