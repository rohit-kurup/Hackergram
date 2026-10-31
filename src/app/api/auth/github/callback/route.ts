import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, getCurrentUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { exchangeCode, gh, syncGithub, type GhUser } from "@/lib/github";
import { uniqueUsername } from "@/lib/users";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const raw = jar.get("hg_oauth")?.value;
  jar.delete("hg_oauth");
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, url));

  let saved: { state: string; mode: "login" | "connect"; next: string };
  try {
    saved = JSON.parse(raw ?? "");
  } catch {
    return fail("oauth_state");
  }
  if (!saved.state || saved.state !== url.searchParams.get("state")) return fail("oauth_state");
  const code = url.searchParams.get("code");
  if (!code) return fail(url.searchParams.get("error") ?? "oauth_denied");

  try {
    const { token, scope } = await exchangeCode(code);
    const ghUser = await gh<GhUser>(token, "/user");
    let email = ghUser.email;
    if (!email) {
      const emails = await gh<{ email: string; primary: boolean; verified: boolean }[]>(token, "/user/emails").catch(() => []);
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails.find((e) => e.verified)?.email ?? null;
    }

    const providerAccountId = String(ghUser.id);
    const linked = await db.account.findUnique({ where: { provider_providerAccountId: { provider: "github", providerAccountId } } });
    const current = await getCurrentUser();

    let userId: string;
    if (saved.mode === "connect" && current) {
      if (linked && linked.userId !== current.id) {
        return NextResponse.redirect(new URL("/settings?error=github_linked_elsewhere", url));
      }
      userId = current.id;
    } else if (linked) {
      userId = linked.userId;
    } else {
      const byEmail = email ? await db.user.findUnique({ where: { email: email.toLowerCase() } }) : null;
      if (byEmail) {
        // Never silently merge into a password account: ask the user to sign in and connect from Settings.
        if (byEmail.passwordHash) return fail("email_exists_connect_from_settings");
        userId = byEmail.id;
      } else {
        const user = await db.user.create({
          data: {
            email: (email ?? `${ghUser.login}@users.noreply.github.com`).toLowerCase(),
            name: ghUser.name ?? ghUser.login,
            username: await uniqueUsername(ghUser.login),
            image: ghUser.avatar_url,
            bio: ghUser.bio ?? "",
            location: ghUser.location ?? "",
            company: (ghUser.company ?? "").replace(/^@/, ""),
          },
        });
        userId = user.id;
      }
    }

    await db.account.upsert({
      where: { provider_providerAccountId: { provider: "github", providerAccountId } },
      create: { userId, provider: "github", providerAccountId, accessTokenEnc: encrypt(token), scope },
      update: { userId, accessTokenEnc: encrypt(token), scope },
    });
    await db.user.update({
      where: { id: userId },
      data: { githubUsername: ghUser.login, githubConnectedAt: new Date(), githubScopes: scope },
    });

    // Initial sync; failures here shouldn't block sign-in (user can re-sync from Settings).
    await syncGithub(userId).catch((e) => console.error("GitHub sync failed:", e));

    if (!current || current.id !== userId) await createSession(userId);
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const dest = !user.onboarded ? "/onboarding?github=connected" : saved.next || (saved.mode === "connect" ? "/settings?github=connected" : "/");
    return NextResponse.redirect(new URL(dest, url));
  } catch (e) {
    console.error(e);
    return fail("github_failed");
  }
}
