import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { notify } from "@/lib/notify";
import { miniUserSelect } from "@/lib/users";

type Ctx = { params: Promise<{ id: string }> };

const ser = (c: { id: string; content: string; createdAt: Date; parentId: string | null; author: { id: string; name: string; username: string; image: string | null } }) => ({
  id: c.id,
  content: c.content,
  parentId: c.parentId,
  createdAt: c.createdAt.toISOString(),
  author: { id: c.author.id, name: c.author.name, username: c.author.username, image: c.author.image },
});

export const GET = authed<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const comments = await db.comment.findMany({
    where: { postId: id },
    include: { author: { select: miniUserSelect } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return ok({ comments: comments.map(ser) });
});

export const POST = authed<Ctx>(
  async (req, { params, user }) => {
    const { id } = await params;
    const body = await parseBody(req, z.object({ content: z.string().trim().min(1).max(1000), parentId: z.string().max(40).nullable().optional() }));
    const post = await db.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) throw new HttpError(404, "Post not found");
    let parentAuthor: string | null = null;
    if (body.parentId) {
      const parent = await db.comment.findUnique({ where: { id: body.parentId } });
      if (!parent || parent.postId !== id) throw new HttpError(400, "Invalid reply target");
      parentAuthor = parent.authorId;
    }
    const c = await db.comment.create({
      data: { postId: id, authorId: user.id, content: body.content, parentId: body.parentId ?? null },
      include: { author: { select: miniUserSelect } },
    });
    await notify({ userId: post.authorId, actorId: user.id, type: "comment", title: `${user.name} commented on your post`, body: body.content.slice(0, 100), href: `/post/${id}` });
    if (parentAuthor && parentAuthor !== post.authorId) {
      await notify({ userId: parentAuthor, actorId: user.id, type: "comment", title: `${user.name} replied to you`, body: body.content.slice(0, 100), href: `/post/${id}` });
    }
    return ok({ comment: ser(c) });
  },
  { limit: 30 },
);
