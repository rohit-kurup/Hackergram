import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { parseList, parseObj } from "@/lib/json";
import { scoreCandidate } from "@/lib/matching";
import { notify } from "@/lib/notify";
import { DEFAULT_PRIVACY } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** Event attendees, with teammates-looking-for-team ranked by fit to you. */
export const GET = authed<Ctx>(async (_req, { params, user }) => {
  const { id } = await params;
  const ev = await db.hackathon.findUnique({ where: { id } });
  if (!ev || (ev.status !== "approved" && ev.submittedById !== user.id && !user.isAdmin)) throw new HttpError(404, "Event not found");
  const attendance = await db.eventAttendance.findMany({
    where: { hackathonId: id },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const visible = attendance.filter((a) => a.userId === user.id || parseObj(a.user.privacy, DEFAULT_PRIVACY).showActivity);
  return ok({
    going: attendance.some((a) => a.userId === user.id),
    lookingForTeam: attendance.find((a) => a.userId === user.id)?.lookingForTeam ?? true,
    count: attendance.length,
    attendees: visible
      .filter((a) => a.userId !== user.id)
      .map((a) => {
        const s = scoreCandidate(user, a.user);
        return {
          id: a.user.id,
          name: a.user.name,
          username: a.user.username,
          image: a.user.image,
          headline: a.user.headline,
          lookingForTeam: a.lookingForTeam,
          skills: [...parseList(a.user.languages), ...parseList(a.user.technologies)].slice(0, 3),
          score: s.score,
          reason: s.reasons[0] ?? "",
        };
      })
      .sort((a, b) => Number(b.lookingForTeam) - Number(a.lookingForTeam) || b.score - a.score),
  });
});

/** POST: mark attending / update looking-for-team. DELETE: un-attend. */
export const POST = authed<Ctx>(async (req, { params, user }) => {
  const { id } = await params;
  const { lookingForTeam } = await parseBody(req, z.object({ lookingForTeam: z.boolean() }));
  const ev = await db.hackathon.findUnique({ where: { id } });
  if (!ev || ev.status !== "approved") throw new HttpError(404, "Event not found");
  const key = { userId_hackathonId: { userId: user.id, hackathonId: id } };
  const existed = await db.eventAttendance.findUnique({ where: key });
  await db.eventAttendance.upsert({ where: key, create: { userId: user.id, hackathonId: id, lookingForTeam }, update: { lookingForTeam } });
  if (!existed) {
    const days = Math.ceil((ev.startsAt.getTime() - Date.now()) / 864e5);
    if (days > 0) await notify({ userId: user.id, type: "reminder", title: `You're going to ${ev.name} 🎉`, body: `It starts in ${days} day${days === 1 ? "" : "s"}.${ev.deadline ? ` Registration deadline: ${ev.deadline.toDateString()}.` : ""} Remember to register on the official site.`, href: `/map?event=${id}` });
  }
  return ok({ going: true, lookingForTeam });
});

export const DELETE = authed<Ctx>(async (_req, { params, user }) => {
  const { id } = await params;
  await db.eventAttendance.deleteMany({ where: { userId: user.id, hackathonId: id } });
  return ok({ going: false });
});

/** PATCH: admin moderation. */
export const PATCH = authed<Ctx>(async (req, { params, user }) => {
  if (!user.isAdmin) throw new HttpError(403, "Admins only");
  const { id } = await params;
  const { status } = await parseBody(req, z.object({ status: z.enum(["approved", "rejected"]) }));
  const ev = await db.hackathon.update({ where: { id }, data: { status } });
  if (ev.submittedById) {
    await notify({ userId: ev.submittedById, actorId: user.id, type: "event", title: status === "approved" ? `Your event “${ev.name}” is live on the map` : `Your event “${ev.name}” wasn't approved`, href: `/map?event=${id}` });
  }
  return ok({ ok: true });
});
