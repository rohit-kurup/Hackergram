import { requireUser } from "@/lib/auth";
import { aiStatus } from "@/lib/ai";
import { db } from "@/lib/db";
import { AiStudio } from "@/components/ai/AiStudio";

export const metadata = { title: "AI Assistant" };

export default async function AiPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const me = await requireUser();
  const { event } = await searchParams;
  const [events, projects] = await Promise.all([
    db.hackathon.findMany({ where: { status: "approved", startsAt: { gte: new Date(Date.now() - 864e5) } }, orderBy: { startsAt: "asc" }, select: { id: true, name: true, source: true }, take: 100 }),
    db.project.findMany({ where: { ownerId: me.id }, select: { id: true, title: true }, take: 30 }),
  ]);
  return <AiStudio status={aiStatus()} events={events} projects={projects} initialEvent={event ?? ""} firstName={me.name.split(" ")[0]!} />;
}
