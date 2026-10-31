import { z } from "zod";
import { db } from "@/lib/db";
import { authed, ok, parseBody } from "@/lib/api";

export const GET = authed(async (_req, { user }) => {
  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { actor: { select: { name: true, image: true, username: true } } },
  });
  return ok({
    notifications: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, href: n.href, read: Boolean(n.readAt), createdAt: n.createdAt.toISOString(), actor: n.actor })),
  });
});

/** Mark one (id) or all notifications read. */
export const POST = authed(async (req, { user }) => {
  const { id } = await parseBody(req, z.object({ id: z.string().max(40).optional() }));
  await db.notification.updateMany({ where: { userId: user.id, readAt: null, ...(id && { id }) }, data: { readAt: new Date() } });
  return ok({ ok: true });
});
