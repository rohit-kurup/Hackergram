import "server-only";
import { db } from "./db";
import { parseObj } from "./json";

export async function listConversations(userId: string) {
  const memberships = await db.conversationMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: { include: { user: { select: { id: true, name: true, username: true, image: true, lastSeenAt: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true } } } },
        },
      },
    },
  });
  const rows = await Promise.all(
    memberships.map(async (m) => {
      const c = m.conversation;
      const others = c.members.filter((x) => x.userId !== userId).map((x) => x.user);
      const last = c.messages[0];
      const unread = await db.message.count({ where: { conversationId: c.id, createdAt: { gt: m.lastReadAt }, senderId: { not: userId } } });
      return {
        id: c.id,
        kind: c.kind,
        title: c.kind === "direct" ? others[0]?.name ?? "Conversation" : c.title ?? others.map((o) => o.name.split(" ")[0]).join(", "),
        image: c.kind === "direct" ? others[0]?.image ?? null : null,
        others: others.map((o) => ({ id: o.id, name: o.name, username: o.username, image: o.image, lastSeenAt: o.lastSeenAt.toISOString() })),
        last: last ? { content: preview(last.kind, last.content), sender: last.senderId === userId ? "You" : last.sender.name.split(" ")[0], at: last.createdAt.toISOString() } : null,
        unread,
        updatedAt: (last?.createdAt ?? c.createdAt).toISOString(),
      };
    }),
  );
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export type ConversationRow = Awaited<ReturnType<typeof listConversations>>[number];

const preview = (kind: string, content: string) =>
  kind === "image" ? "📷 Photo" : kind === "repo" ? `📦 ${content}` : kind === "invite" ? `🚀 ${content}` : content;

export async function requireMember(conversationId: string, userId: string) {
  return db.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
}

export function serializeMessage(m: { id: string; senderId: string; kind: string; content: string; meta: string; createdAt: Date; sender: { name: string; image: string | null; username: string } }) {
  return {
    id: m.id,
    senderId: m.senderId,
    kind: m.kind,
    content: m.content,
    meta: parseObj<Record<string, any>>(m.meta, {}),
    createdAt: m.createdAt.toISOString(),
    sender: m.sender,
  };
}
export type ChatMessage = ReturnType<typeof serializeMessage>;
