import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { FEED_FILTERS, getFeed, getPost, type FeedFilter } from "@/lib/feed";
import { getGithubToken, repoPreview } from "@/lib/github";
import { postSchema } from "@/lib/validation";

export const GET = authed(async (req, { user }) => {
  const url = new URL(req.url);
  const f = url.searchParams.get("filter") as FeedFilter;
  const filter = FEED_FILTERS.includes(f) ? f : "foryou";
  return ok(await getFeed(user, filter, url.searchParams.get("cursor") ?? undefined));
});

export const POST = authed(
  async (req, { user }) => {
    const body = await parseBody(req, postSchema);
    if (body.imageUrl && !body.imageUrl.startsWith("/uploads/")) throw new HttpError(400, "Images must be uploaded through Hackergram");
    if (body.projectId) {
      const p = await db.project.findUnique({ where: { id: body.projectId }, select: { ownerId: true } });
      if (!p || p.ownerId !== user.id) throw new HttpError(403, "You can only share your own projects");
    }
    if (body.hackathonId && !(await db.hackathon.findUnique({ where: { id: body.hackathonId } }))) throw new HttpError(404, "Event not found");

    let preview = null;
    if (body.repoUrl) {
      const creds = await getGithubToken(user.id);
      preview = await repoPreview(body.repoUrl, creds?.token);
      if (!preview) throw new HttpError(400, "That repository is private, so it can't be shared publicly");
    }
    const post = await db.post.create({
      data: {
        authorId: user.id,
        kind: body.kind,
        content: body.content,
        imageUrl: body.imageUrl || null,
        repoUrl: body.repoUrl || null,
        repoPreview: preview ? JSON.stringify(preview) : null,
        projectId: body.projectId || null,
        hackathonId: body.hackathonId || null,
      },
    });
    return ok({ post: await getPost(user.id, post.id) });
  },
  { limit: 15 },
);
