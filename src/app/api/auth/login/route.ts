import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { errorResponse, HttpError, ok, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { loginSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, loginSchema);
    if (!rateLimit(`login:${body.email}`, 8, 15 * 60_000).ok) throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
    const user = await db.user.findUnique({ where: { email: body.email } });
    const valid = user?.passwordHash ? await bcrypt.compare(body.password, user.passwordHash) : false;
    if (!user || !valid) {
      throw new HttpError(401, user && !user.passwordHash ? "This account uses GitHub sign-in" : "Wrong email or password");
    }
    await createSession(user.id);
    return ok({ ok: true, next: user.onboarded ? "/" : "/onboarding" });
  } catch (e) {
    return errorResponse(e);
  }
}
