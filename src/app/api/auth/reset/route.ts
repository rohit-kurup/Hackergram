import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";
import { errorResponse, HttpError, ok, parseBody } from "@/lib/api";
import { passwordSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const { token, password } = await parseBody(req, z.object({ token: z.string().min(10).max(200), password: passwordSchema }));
    const rec = await db.passwordResetToken.findUnique({ where: { id: sha256(token) } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) throw new HttpError(400, "This reset link is invalid or expired");
    await db.$transaction([
      db.user.update({ where: { id: rec.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
      db.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
      db.session.deleteMany({ where: { userId: rec.userId } }), // sign out everywhere
    ]);
    await createSession(rec.userId);
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
