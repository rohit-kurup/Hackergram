"use client";

import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { toast } from "@/components/ui/Toast";

const ERRORS: Record<string, string> = {
  github_not_configured: "GitHub sign-in isn't configured on this server yet.",
  oauth_state: "That sign-in link expired. Please try again.",
  oauth_denied: "GitHub sign-in was cancelled.",
  access_denied: "GitHub sign-in was cancelled.",
  github_failed: "We couldn't reach GitHub. Please try again.",
  email_exists_connect_from_settings: "An account with your GitHub email already exists. Log in with your password, then connect GitHub from Settings.",
};

function useSubmit() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const run = async (fn: () => Promise<{ next?: string } | void>) => {
    setLoading(true);
    try {
      const r = await fn();
      if (r && r.next) {
        router.push(r.next);
        router.refresh();
      }
    } catch {
      /* toast already shown */
    } finally {
      setLoading(false);
    }
  };
  return { loading, run };
}

export function LoginForm({ demo }: { demo: boolean }) {
  const params = useSearchParams();
  const err = params.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loading, run } = useSubmit();
  return (
    <>
      {err && <div className="mb-4 rounded-2xl bg-coral-soft px-4 py-3 text-sm font-medium text-coral-deep">{ERRORS[err] ?? "Sign-in failed."}</div>}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => api("/api/auth/login", { body: { email, password } }));
        }}
      >
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="mb-1.5 text-xs font-semibold text-grape hover:underline">Forgot?</Link>
          </div>
          <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn-primary w-full py-3" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Log in
        </button>
      </form>
      {demo && (
        <button
          className="btn-outline mt-3 w-full py-3"
          disabled={loading}
          onClick={() => run(() => api("/api/auth/demo", { method: "POST" }))}
        >
          <Sparkles className="h-4 w-4 text-grape" /> Explore with the demo account
        </button>
      )}
    </>
  );
}

export function SignupForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { loading, run } = useSubmit();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => api("/api/auth/signup", { body: form }));
      }}
    >
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" className="input" required autoComplete="name" value={form.name} onChange={set("name")} placeholder="Ada Lovelace" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@school.edu" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" className="input" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" />
      </div>
      <button className="btn-brand w-full py-3" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
      </button>
    </form>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<{ devLink?: string } | null>(null);
  const { loading, run } = useSubmit();
  if (sent)
    return (
      <div className="rounded-3xl bg-mint-soft p-5 text-sm text-mint-deep">
        <p className="font-semibold">If an account exists for {email}, a reset link is on its way.</p>
        {sent.devLink ? (
          <p className="mt-3 text-ink-soft">
            Dev mode (no email provider configured):{" "}
            <a className="break-all font-semibold text-grape underline" href={sent.devLink}>open your reset link</a>
          </p>
        ) : (
          <p className="mt-2 text-ink-soft">The link expires in one hour.</p>
        )}
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => setSent(await api("/api/auth/forgot", { body: { email } })));
      }}
    >
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <button className="btn-primary w-full py-3" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link
      </button>
    </form>
  );
}

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const { loading, run } = useSubmit();
  if (!token) return <p className="text-sm text-coral-deep">Missing reset token. Request a new link.</p>;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          await api("/api/auth/reset", { body: { token, password } });
          toast("Password updated. Welcome back!");
          return { next: "/" };
        });
      }}
    >
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input id="password" className="input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="btn-primary w-full py-3" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Update password
      </button>
    </form>
  );
}
