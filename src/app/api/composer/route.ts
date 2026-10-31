import { db } from "@/lib/db";
import { authed, ok } from "@/lib/api";

/** Options for the post composer: your projects and upcoming approved events. */
export const GET = authed(async (_req, { user }) => {
  const [projects, events] = await Promise.all([
    db.project.findMany({ where: { ownerId: user.id }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
    db.hackathon.findMany({
      where: { status: "approved", startsAt: { gte: new Date(Date.now() - 7 * 864e5) } },
      select: { id: true, name: true },
      orderBy: { startsAt: "asc" },
      take: 30,
    }),
  ]);
  return ok({ projects, events });
});
