import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { errorResponse, HttpError, ok, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { uniqueUsername } from "@/lib/users";
import { signupSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const ip = (await headers()).get("x-forwarded-for") ?? "local";
    if (!rateLimit(`signup:${ip}`, 10, 3600_000).ok) throw new HttpError(429, "Too many sign-ups from this network");
    const body = await parseBody(req, signupSchema);
    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) throw new HttpError(409, "An account with this email already exists");
    const user = await db.user.create({
      data: {
        email: body.email,
        name: body.name,
        username: await uniqueUsername(body.email.split("@")[0]!),
        passwordHash: await bcrypt.hash(body.password, 12),
      },
    });
    await createSession(user.id);
    return ok({ ok: true, next: "/onboarding" });
  } catch (e) {
    return errorResponse(e);
  }
}
