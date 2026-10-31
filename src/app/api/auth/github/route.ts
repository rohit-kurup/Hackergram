import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { authorizeUrl, githubConfigured } from "@/lib/github";

/** Starts GitHub OAuth. ?mode=login|connect  &private=1 to request the `repo` scope. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!githubConfigured()) {
    return NextResponse.redirect(new URL("/login?error=github_not_configured", url));
  }
  const mode = url.searchParams.get("mode") === "connect" ? "connect" : "login";
  const includePrivate = url.searchParams.get("private") === "1";
  const next = url.searchParams.get("next") ?? "";
  const state = randomToken(16);
  (await cookies()).set("hg_oauth", JSON.stringify({ state, mode, next: next.startsWith("/") ? next : "" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return NextResponse.redirect(authorizeUrl(state, includePrivate));
}
