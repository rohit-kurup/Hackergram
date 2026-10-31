import { db } from "@/lib/db";
import { authed, HttpError, ok } from "@/lib/api";
import { syncGithub } from "@/lib/github";

/** POST: re-sync GitHub data. */
export const POST = authed(
  async (_req, { user }) => {
    const acct = await db.account.findFirst({ where: { userId: user.id, provider: "github" } });
    if (!acct) throw new HttpError(400, "Connect GitHub first");
    try {
      const stats = await syncGithub(user.id);
      return ok({ ok: true, stats });
    } catch (e) {
      throw new HttpError(502, e instanceof Error ? e.message : "GitHub sync failed");
    }
  },
  { limit: 5, windowMs: 10 * 60_000 },
);

/**
 * DELETE: disconnect GitHub. Removes the stored token and all GitHub-derived data
 * (repos, activity, stats, GitHub-sourced projects). User-entered data is kept.
 */
export const DELETE = authed(async (_req, { user }) => {
  if (!user.passwordHash) {
    const otherLogins = await db.account.count({ where: { userId: user.id, provider: { not: "github" } } });
    if (!otherLogins) throw new HttpError(400, "Set a password in Settings first, so you can still sign in after disconnecting.");
  }
  await db.$transaction([
    db.account.deleteMany({ where: { userId: user.id, provider: "github" } }),
    db.githubRepo.deleteMany({ where: { userId: user.id } }),
    db.githubActivity.deleteMany({ where: { userId: user.id } }),
    db.project.deleteMany({ where: { ownerId: user.id, source: "github", isListing: false } }),
    db.user.update({
      where: { id: user.id },
      data: { githubUsername: null, githubConnectedAt: null, githubSyncedAt: null, githubStats: "{}", githubScopes: "" },
    }),
  ]);
  return ok({ ok: true });
});
