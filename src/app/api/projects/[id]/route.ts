import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { toList } from "@/lib/json";
import { projectSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

async function owned(id: string, userId: string) {
  const p = await db.project.findUnique({ where: { id } });
  if (!p) throw new HttpError(404, "Project not found");
  if (p.ownerId !== userId) throw new HttpError(403, "Only the owner can do that");
  return p;
}

export const PATCH = authed<Ctx>(async (req, { params, user }) => {
  const { id } = await params;
  await owned(id, user.id);
  const body = await parseBody(req, projectSchema.partial().extend({ status: z.enum(["open", "closed"]).optional() }));
  const { tech, rolesNeeded, requiredSkills, thumbnail, status, ...rest } = body;
  await db.project.update({
    where: { id },
    data: {
      ...rest,
      ...(status && { status }),
      ...(thumbnail !== undefined && { thumbnail: thumbnail?.startsWith("/uploads/") || thumbnail?.startsWith("https://opengraph.githubassets.com/") ? thumbnail : null }),
      ...(tech && { tech: toList(tech) }),
      ...(rolesNeeded && { rolesNeeded: toList(rolesNeeded) }),
      ...(requiredSkills && { requiredSkills: toList(requiredSkills) }),
    },
  });
  return ok({ ok: true });
});

export const DELETE = authed<Ctx>(async (_req, { params, user }) => {
  const { id } = await params;
  await owned(id, user.id);
  await db.project.delete({ where: { id } });
  return ok({ ok: true });
});
