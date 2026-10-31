import { db } from "@/lib/db";
import { authed, ok } from "@/lib/api";

export const GET = authed(async (_req, { user }) => {
  const [notifications, memberships] = await Promise.all([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.conversationMember.findMany({ where: { userId: user.id }, select: { conversationId: true, lastReadAt: true } }),
  ]);
  let messages = 0;
  if (memberships.length) {
    const unread = await Promise.all(
      memberships.map((m) =>
        db.message.count({ where: { conversationId: m.conversationId, createdAt: { gt: m.lastReadAt }, senderId: { not: user.id } }, take: 1 }),
      ),
    );
    messages = unread.filter((n) => n > 0).length;
  }
  return ok({ notifications, messages });
});
