import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { getGithubToken, repoPreview } from "@/lib/github";
import { requireMember, serializeMessage } from "@/lib/messages";
import { notify } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };
const senderSel = { select: { name: true, image: true, username: true } };

/**
 * GET ?after=<iso> — new messages since `after` (or the latest 60), who's typing,
 * and members' read positions. Also marks the conversation read for you.
 * The client polls this every ~2.5s; swap in Supabase Realtime for push delivery.
 */
export const GET = authed<Ctx>(async (req, { params, user }) => {
  const { id } = await params;
  const member = await requireMember(id, user.id);
  if (!member) throw new HttpError(404, "Conversation not found");
  const after = new URL(req.url).searchParams.get("after");

  const messages = after
    ? await db.message.findMany({ where: { conversationId: id, createdAt: { gt: new Date(after) } }, orderBy: { createdAt: "asc" }, include: { sender: senderSel } })
    : (await db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, take: 60, include: { sender: senderSel } })).reverse();

  await db.conversationMember.update({ where: { id: member.id }, data: { lastReadAt: new Date() } });
  const members = await db.conversationMember.findMany({
    where: { conversationId: id },
    include: { user: { select: { id: true, name: true, lastSeenAt: true } } },
  });
  const now = Date.now();
  return ok({
    messages: messages.map(serializeMessage),
    typing: members.filter((m) => m.userId !== user.id && m.typingAt && now - m.typingAt.getTime() < 4000).map((m) => m.user.name.split(" ")[0]),
    reads: Object.fromEntries(members.filter((m) => m.userId !== user.id).map((m) => [m.userId, m.lastReadAt.toISOString()])),
    online: members.filter((m) => m.userId !== user.id && now - m.user.lastSeenAt.getTime() < 5 * 60_000).map((m) => m.userId),
  });
});

const sendSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), content: z.string().trim().min(1).max(4000) }),
  z.object({ kind: z.literal("image"), url: z.string().regex(/^\/uploads\/[\w.-]+$/), content: z.string().max(500) }),
  z.object({ kind: z.literal("repo"), url: z.string().regex(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i) }),
  z.object({ kind: z.literal("invite"), projectId: z.string().max(40) }),
]);

export const POST = authed<Ctx>(
  async (req, { params, user }) => {
    const { id } = await params;
    const member = await requireMember(id, user.id);
    if (!member) throw new HttpError(404, "Conversation not found");
    const body = await parseBody(req, sendSchema);

    let content = "";
    let meta: Record<string, unknown> = {};
    if (body.kind === "text") content = body.content;
    else if (body.kind === "image") {
      content = body.content;
      meta = { url: body.url };
    } else if (body.kind === "repo") {
      const creds = await getGithubToken(user.id);
      const preview = await repoPreview(body.url, creds?.token);
      if (!preview) throw new HttpError(400, "That repository is private");
      content = preview.fullName;
      meta = preview;
    } else {
      const project = await db.project.findFirst({ where: { id: body.projectId, ownerId: user.id } });
      if (!project) throw new HttpError(403, "You can only invite people to your own projects");
      content = `Invitation to join ${project.title}`;
      meta = { projectId: project.id, title: project.title, tagline: project.tagline, color: project.color };
      const others = await db.conversationMember.findMany({ where: { conversationId: id, userId: { not: user.id } } });
      for (const o of others) {
        await db.projectMember.upsert({
          where: { projectId_userId: { projectId: project.id, userId: o.userId } },
          create: { projectId: project.id, userId: o.userId, status: "invited" },
          update: {},
        });
      }
    }

    const msg = await db.message.create({
      data: { conversationId: id, senderId: user.id, kind: body.kind, content, meta: JSON.stringify(meta) },
      include: { sender: senderSel },
    });
    await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
    await db.conversationMember.update({ where: { id: member.id }, data: { lastReadAt: new Date(), typingAt: null } });

    // Notify others, at most once per conversation per 10 minutes.
    const others = await db.conversationMember.findMany({ where: { conversationId: id, userId: { not: user.id } } });
    const since = new Date(Date.now() - 10 * 60_000);
    for (const o of others) {
      const recent = await db.notification.findFirst({ where: { userId: o.userId, type: "message", href: `/messages/${id}`, createdAt: { gt: since }, readAt: null } });
      if (!recent) {
        await notify({ userId: o.userId, actorId: user.id, type: "message", title: `New message from ${user.name}`, body: body.kind === "text" ? content.slice(0, 90) : content, href: `/messages/${id}` });
      }
    }
    return ok({ message: serializeMessage(msg) });
  },
  { limit: 60 },
);

/** PUT — typing indicator ping. */
export const PUT = authed<Ctx>(
  async (_req, { params, user }) => {
    const { id } = await params;
    const member = await requireMember(id, user.id);
    if (!member) throw new HttpError(404, "Conversation not found");
    await db.conversationMember.update({ where: { id: member.id }, data: { typingAt: new Date() } });
    return ok({ ok: true });
  },
  { limit: 60 },
);
