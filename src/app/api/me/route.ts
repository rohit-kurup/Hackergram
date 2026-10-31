import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { destroySession } from "@/lib/auth";
import { parseObj, toList } from "@/lib/json";
import { DEFAULT_PRIVACY, passwordSchema, privacySchema, profileSchema } from "@/lib/validation";

export const GET = authed(async (_req, { user }) => {
  const { passwordHash, ...safe } = user;
  return ok({ user: { ...safe, hasPassword: Boolean(passwordHash) } });
});

const patchSchema = profileSchema.partial().extend({
  onboarded: z.boolean().optional(),
  privacy: privacySchema.partial().optional(),
});

export const PATCH = authed(async (req, { user }) => {
  const body = await parseBody(req, patchSchema);
  if (body.username && body.username !== user.username) {
    const taken = await db.user.findUnique({ where: { username: body.username } });
    if (taken) throw new HttpError(409, "That username is taken");
  }
  const { interests, languages, technologies, projectTypes, privacy, ...rest } = body;
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...rest,
      ...(interests && { interests: toList(interests) }),
      ...(languages && { languages: toList(languages) }),
      ...(technologies && { technologies: toList(technologies) }),
      ...(projectTypes && { projectTypes: toList(projectTypes) }),
      ...(privacy && { privacy: JSON.stringify({ ...parseObj(user.privacy, DEFAULT_PRIVACY), ...privacy }) }),
    },
  });
  return ok({ ok: true, username: updated.username });
});

/** Set or change password. */
export const PUT = authed(
  async (req, { user }) => {
    const body = await parseBody(req, z.object({ current: z.string().optional(), password: passwordSchema }));
    if (user.passwordHash) {
      if (!body.current || !(await bcrypt.compare(body.current, user.passwordHash))) throw new HttpError(400, "Current password is incorrect");
    }
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.password, 12) } });
    return ok({ ok: true });
  },
  { limit: 5 },
);

/** Permanently delete the account and everything it owns (cascades). */
export const DELETE = authed(async (req, { user }) => {
  const body = await parseBody(req, z.object({ confirm: z.string() }));
  if (body.confirm !== user.username) throw new HttpError(400, "Type your username to confirm");
  await destroySession();
  await db.user.delete({ where: { id: user.id } });
  return ok({ ok: true });
});
