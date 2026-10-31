import { Github } from "lucide-react";

export function GithubButton({ configured, label = "Continue with GitHub", mode = "login" }: { configured: boolean; label?: string; mode?: string }) {
  if (!configured) {
    return (
      <div>
        <button disabled className="btn w-full border border-paper-line bg-paper-off py-3 text-ink-mute">
          <Github className="h-5 w-5" /> {label}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-ink-mute">
          GitHub OAuth isn&apos;t configured yet. Add GITHUB_CLIENT_ID / SECRET to .env (see README).
        </p>
      </div>
    );
  }
  return (
    <a href={`/api/auth/github?mode=${mode}`} className="btn w-full bg-[#15131F] py-3 text-white hover:bg-[#2a2740] hover:shadow-lift">
      <Github className="h-5 w-5" /> {label}
    </a>
  );
}
