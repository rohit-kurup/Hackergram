import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/AuthForms";
import { GithubButton } from "@/components/auth/GithubButton";
import { githubConfigured } from "@/lib/github";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  const demo = process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
  return (
    <>
      <h1 className="text-4xl font-extrabold">Welcome back 👋</h1>
      <p className="mb-8 mt-2 text-ink-mute">Log in to see what your people are building.</p>
      <GithubButton configured={githubConfigured()} />
      <div className="my-6 flex items-center gap-3 text-xs font-semibold text-ink-faint">
        <span className="h-px flex-1 bg-paper-line" /> or with email <span className="h-px flex-1 bg-paper-line" />
      </div>
      <Suspense>
        <LoginForm demo={demo} />
      </Suspense>
      <p className="mt-8 text-center text-sm text-ink-mute">
        New here?{" "}
        <Link href="/signup" className="font-bold text-grape hover:underline">Create an account</Link>
      </p>
    </>
  );
}
