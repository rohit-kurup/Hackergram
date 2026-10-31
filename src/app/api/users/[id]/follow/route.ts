import { db } from "@/lib/db";
import { authed, HttpError, ok } from "@/lib/api";
import { notify } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

/** Toggle follow. */
export const POST = authed<Ctx>(async (_req, { params, user }) => {
  const { id } = await params;
  if (id === user.id) throw new HttpError(400, "You can't follow yourself");
  if (!(await db.user.findUnique({ where: { id }, select: { id: true } }))) throw new HttpError(404, "User not found");
  const key = { followerId_followingId: { followerId: user.id, followingId: id } };
  const existing = await db.follow.findUnique({ where: key });
  if (existing) await db.follow.delete({ where: key });
  else {
    await db.follow.create({ data: { followerId: user.id, followingId: id } });
    await notify({ userId: id, actorId: user.id, type: "follow", title: `${user.name} started following you`, href: `/u/${user.username}` });
  }
  return ok({ following: !existing, followers: await db.follow.count({ where: { followingId: id } }) });
});
