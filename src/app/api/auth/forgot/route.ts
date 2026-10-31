import { z } from "zod";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { errorResponse, HttpError, ok, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";

/**
 * Creates a one-hour reset token. No email provider is wired up yet, so in
 * development the link is returned to the page and logged to the server console.
 * In production, plug an email service into `deliver()`.
 */
export async function POST(req: Request) {
  try {
    const { email } = await parseBody(req, z.object({ email: z.string().trim().toLowerCase().email() }));
    if (!rateLimit(`forgot:${email}`, 3, 3600_000).ok) throw new HttpError(429, "Too many reset requests");
    const user = await db.user.findUnique({ where: { email } });
    let devLink: string | undefined;
    if (user) {
      const token = randomToken();
      await db.passwordResetToken.create({ data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) } });
      const link = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
      console.info(`[password reset] ${email}: ${link}`);
      if (process.env.NODE_ENV !== "production") devLink = link;
    }
    // Same response whether or not the account exists (no account enumeration).
    return ok({ ok: true, devLink });
  } catch (e) {
    return errorResponse(e);
  }
}
