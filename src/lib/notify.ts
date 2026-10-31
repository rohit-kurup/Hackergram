import "server-only";
import { db } from "./db";

export async function notify(n: {
  userId: string;
  actorId?: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
}) {
  if (n.actorId && n.actorId === n.userId) return;
  await db.notification.create({
    data: { userId: n.userId, actorId: n.actorId, type: n.type, title: n.title, body: n.body ?? "", href: n.href ?? "" },
  });
}
