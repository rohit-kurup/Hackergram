import Link from "next/link";
import { SignupForm } from "@/components/auth/AuthForms";
import { GithubButton } from "@/components/auth/GithubButton";
import { githubConfigured } from "@/lib/github";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-4xl font-extrabold">Join the builders ✨</h1>
      <p className="mb-8 mt-2 text-ink-mute">Connect GitHub and we&apos;ll build your portfolio in seconds.</p>
      <GithubButton configured={githubConfigured()} label="Sign up with GitHub" />
      <div className="my-6 flex items-center gap-3 text-xs font-semibold text-ink-faint">
        <span className="h-px flex-1 bg-paper-line" /> or with email <span className="h-px flex-1 bg-paper-line" />
      </div>
      <SignupForm />
      <p className="mt-8 text-center text-sm text-ink-mute">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-grape hover:underline">Log in</Link>
      </p>
    </>
  );
}
