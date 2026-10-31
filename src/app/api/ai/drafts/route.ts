import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";

export const GET = authed(async (_req, { user }) => {
  const drafts = await db.aiDraft.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 50, include: { hackathon: { select: { name: true } } } });
  return ok({
    drafts: drafts.map((d) => ({ id: d.id, kind: d.kind, title: d.title, content: d.content, model: d.model, hackathonId: d.hackathonId, updatedAt: d.updatedAt.toISOString() })),
  });
});

/** PATCH ?id= — save your edits to a draft. DELETE ?id= — remove it. */
export const PATCH = authed(async (req, { user }) => {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const { content } = await parseBody(req, z.object({ content: z.string().max(60_000) }));
  const n = await db.aiDraft.updateMany({ where: { id, userId: user.id }, data: { content } });
  if (!n.count) throw new HttpError(404, "Draft not found");
  return ok({ ok: true });
});

export const DELETE = authed(async (req, { user }) => {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const n = await db.aiDraft.deleteMany({ where: { id, userId: user.id } });
  if (!n.count) throw new HttpError(404, "Draft not found");
  return ok({ ok: true });
});
