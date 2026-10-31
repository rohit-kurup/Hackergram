import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { toList } from "@/lib/json";
import { notify } from "@/lib/notify";
import { eventSchema } from "@/lib/validation";

/**
 * Community event submission. Submissions start as "pending" and only appear
 * publicly after an admin approves them; they're always labeled "Community".
 */
export const POST = authed(
  async (req, { user }) => {
    const body = await parseBody(req, eventSchema);
    if (!body.isOnline && (body.lat == null || body.lng == null)) throw new HttpError(400, "Pick a location on the map for in-person events");
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(+startsAt)) throw new HttpError(400, "Invalid start date");
    const ev = await db.hackathon.create({
      data: {
        ...body,
        startsAt,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        skills: toList(body.skills),
        themes: toList(body.skills),
        source: "community",
        status: user.isAdmin ? "approved" : "pending",
        verified: false,
        submittedById: user.id,
      },
    });
    if (!user.isAdmin) {
      const admins = await db.user.findMany({ where: { isAdmin: true }, select: { id: true } });
      for (const a of admins) await notify({ userId: a.id, actorId: user.id, type: "event", title: `New event to review: ${ev.name}`, href: `/map?event=${ev.id}` });
    }
    return ok({ id: ev.id, status: ev.status });
  },
  { limit: 5, windowMs: 3600_000 },
);
