import { db } from "@/lib/db";
import { authed, HttpError, ok } from "@/lib/api";
import { getPost } from "@/lib/feed";

type Ctx = { params: Promise<{ id: string }> };

export const GET = authed<Ctx>(async (_req, { params, user }) => {
  const post = await getPost(user.id, (await params).id);
  if (!post) throw new HttpError(404, "Post not found");
  return ok({ post });
});

export const DELETE = authed<Ctx>(async (_req, { params, user }) => {
  const { id } = await params;
  const post = await db.post.findUnique({ where: { id } });
  if (!post) throw new HttpError(404, "Post not found");
  if (post.authorId !== user.id) throw new HttpError(403, "Not your post");
  await db.post.delete({ where: { id } });
  return ok({ ok: true });
});
