import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { directConversation, projectConversation } from "@/lib/conversations";
import { notify } from "@/lib/notify";
import { listConversations } from "@/lib/messages";

export const GET = authed(async (_req, { user }) => ok({ conversations: await listConversations(user.id) }));

const schema = z.union([
  z.object({ userId: z.string().min(1).max(40) }),
  z.object({ projectId: z.string().min(1).max(40) }),
  z.object({ title: z.string().trim().min(1).max(60), memberIds: z.array(z.string().max(40)).min(2).max(30) }),
]);

/** Start a direct chat, open a project's team chat, or create a group. */
export const POST = authed(
  async (req, { user }) => {
    const body = await parseBody(req, schema);
    if ("userId" in body) {
      if (body.userId === user.id) throw new HttpError(400, "That's you!");
      if (!(await db.user.findUnique({ where: { id: body.userId }, select: { id: true } }))) throw new HttpError(404, "User not found");
      return ok({ id: await directConversation(user.id, body.userId) });
    }
    if ("projectId" in body) {
      const isMember =
        (await db.project.count({ where: { id: body.projectId, ownerId: user.id } })) ||
        (await db.projectMember.count({ where: { projectId: body.projectId, userId: user.id, status: "active" } }));
      if (!isMember) throw new HttpError(403, "Only team members can open the team chat");
      return ok({ id: await projectConversation(body.projectId) });
    }
    const ids = Array.from(new Set([user.id, ...body.memberIds]));
    const found = await db.user.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new HttpError(400, "Some members don't exist");
    const c = await db.conversation.create({ data: { kind: "group", title: body.title, members: { create: ids.map((userId) => ({ userId })) } } });
    await db.message.create({ data: { conversationId: c.id, senderId: user.id, kind: "system", content: `${user.name} created “${body.title}”` } });
    for (const id of ids) if (id !== user.id) await notify({ userId: id, actorId: user.id, type: "message", title: `${user.name} added you to “${body.title}”`, href: `/messages/${c.id}` });
    return ok({ id: c.id });
  },
  { limit: 20 },
);
