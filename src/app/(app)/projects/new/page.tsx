import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-[1060px] px-4 py-5 md:px-8 md:py-8">
      <PageHeader title="New project" subtitle="Showcase something you built, or recruit a team for what's next." accent="blue" icon={Plus} />
      <ProjectForm aiReady={aiConfigured()} />
    </div>
  );
}
