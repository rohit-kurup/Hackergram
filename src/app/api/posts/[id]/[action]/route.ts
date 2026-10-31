import { db } from "@/lib/db";
import { authed, HttpError, ok } from "@/lib/api";
import { getPost } from "@/lib/feed";
import { notify } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string; action: string }> };

/** POST /api/posts/:id/(like|bookmark|repost) — toggles. */
export const POST = authed<Ctx>(async (_req, { params, user }) => {
  const { id, action } = await params;
  const post = await db.post.findUnique({ where: { id }, select: { id: true, authorId: true, content: true, repostOfId: true } });
  if (!post) throw new HttpError(404, "Post not found");
  const key = { postId_userId: { postId: id, userId: user.id } };

  if (action === "like") {
    const existing = await db.like.findUnique({ where: key });
    if (existing) await db.like.delete({ where: key });
    else {
      await db.like.create({ data: { postId: id, userId: user.id } });
      await notify({ userId: post.authorId, actorId: user.id, type: "like", title: `${user.name} liked your post`, body: post.content.slice(0, 80), href: `/post/${id}` });
    }
    return ok({ active: !existing, count: await db.like.count({ where: { postId: id } }) });
  }

  if (action === "bookmark") {
    const existing = await db.bookmark.findUnique({ where: key });
    if (existing) await db.bookmark.delete({ where: key });
    else await db.bookmark.create({ data: { postId: id, userId: user.id } });
    return ok({ active: !existing });
  }

  if (action === "repost") {
    const targetId = post.repostOfId ?? post.id;
    const existing = await db.post.findFirst({ where: { authorId: user.id, repostOfId: targetId } });
    if (existing) {
      await db.post.delete({ where: { id: existing.id } });
      return ok({ active: false, count: await db.post.count({ where: { repostOfId: targetId } }) });
    }
    const target = await db.post.findUniqueOrThrow({ where: { id: targetId } });
    const repost = await db.post.create({ data: { authorId: user.id, kind: target.kind, content: "", repostOfId: targetId } });
    await notify({ userId: target.authorId, actorId: user.id, type: "like", title: `${user.name} reposted your post`, href: `/post/${targetId}` });
    return ok({ active: true, count: await db.post.count({ where: { repostOfId: targetId } }), post: await getPost(user.id, repost.id) });
  }

  throw new HttpError(404, "Unknown action");
});
