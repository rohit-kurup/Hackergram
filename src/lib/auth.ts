import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";

export const SESSION_COOKIE = "hg_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.session.create({ data: { id: sha256(token), userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Current user (cached per request). Returns null when signed out. */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  // Presence: refresh lastSeen at most once a minute.
  if (Date.now() - session.user.lastSeenAt.getTime() > 60_000) {
    db.user.update({ where: { id: session.userId }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For server components: redirect to login (or onboarding) if needed. */
export async function requireUser(opts: { allowUnonboarded?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.onboarded && !opts.allowUnonboarded) redirect("/onboarding");
  return user;
}
