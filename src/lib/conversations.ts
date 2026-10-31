import "server-only";
import { db } from "./db";

/** Finds or creates the 1:1 conversation between two users. */
export async function directConversation(a: string, b: string) {
  const existing = await db.conversation.findFirst({
    where: { kind: "direct", AND: [{ members: { some: { userId: a } } }, { members: { some: { userId: b } } }] },
    select: { id: true },
  });
  if (existing) return existing.id;
  const c = await db.conversation.create({
    data: { kind: "direct", members: { create: [{ userId: a }, { userId: b }] } },
  });
  return c.id;
}

/** Project group chat: created on demand, includes all active members. */
export async function projectConversation(projectId: string) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { members: { where: { status: "active" }, select: { userId: true } } },
  });
  const memberIds = Array.from(new Set([project.ownerId, ...project.members.map((m) => m.userId)]));
  const existing = await db.conversation.findFirst({ where: { kind: "project", projectId }, include: { members: true } });
  if (existing) {
    const have = new Set(existing.members.map((m) => m.userId));
    const missing = memberIds.filter((id) => !have.has(id));
    if (missing.length) await db.conversationMember.createMany({ data: missing.map((userId) => ({ conversationId: existing.id, userId })) });
    return existing.id;
  }
  const c = await db.conversation.create({
    data: { kind: "project", title: `${project.title} team`, projectId, members: { create: memberIds.map((userId) => ({ userId })) } },
  });
  return c.id;
}
