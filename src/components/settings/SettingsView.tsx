"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Eye, Github, KeyRound, Loader2, LogOut, RefreshCw, Save, ShieldCheck, Trash2, Unplug, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { TagPicker } from "@/components/ui/TagPicker";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { AVAILABILITY, INTERESTS, LANGUAGES, PROJECT_TYPES, TECHNOLOGIES } from "@/lib/catalog";
import { ACCENTS, cn, timeAgo, type Accent } from "@/lib/utils";
import type { Privacy } from "@/lib/validation";

type Profile = {
  name: string; username: string; email: string; headline: string; bio: string; location: string; lat: number | null; lng: number | null;
  university: string; major: string; gradYear: number | null; company: string; languages: string[]; technologies: string[]; interests: string[];
  projectTypes: string[]; lookingForCollab: boolean; openToHackathons: boolean; availability: string; accent: Accent;
};

const SECTIONS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "github", label: "GitHub", icon: Github },
  { key: "privacy", label: "Privacy", icon: Eye },
  { key: "security", label: "Account", icon: ShieldCheck },
] as const;

export function SettingsView({ profile, privacy, github, hasPassword, githubConfigured, flash }: { profile: Profile; privacy: Privacy; github: { username: string | null; syncedAt: string | null; scopes: string; repoCount: number }; hasPassword: boolean; githubConfigured: boolean; flash: string | null }) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>(flash ? "github" : "profile");
  useEffect(() => {
    if (flash) (flash.includes("already") ? toast.error : toast)(flash);
  }, [flash]);
  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <nav className="no-scrollbar flex gap-1 overflow-x-auto md:flex-col">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} className={cn("relative flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-semibold", section === s.key ? "text-ink" : "text-ink-soft hover:bg-white")}>
            {section === s.key && <motion.span layoutId="settings-nav" className="absolute inset-0 rounded-2xl bg-white shadow-card" />}
            <s.icon className="relative h-4 w-4" /> <span className="relative">{s.label}</span>
          </button>
        ))}
      </nav>
      <div>
        {section === "profile" && <ProfileForm initial={profile} />}
        {section === "github" && <GithubSettings github={github} configured={githubConfigured} />}
        {section === "privacy" && <PrivacyForm initial={privacy} />}
        {section === "security" && <Security hasPassword={hasPassword} username={profile.username} email={profile.email} />}
      </div>
    </div>
  );
}

function ProfileForm({ initial }: { initial: Profile }) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      const { email, ...body } = f;
      await api("/api/me", { method: "PATCH", body });
      toast("Profile saved");
      router.refresh();
    } catch {
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-5">
      <section className="card space-y-4 p-5 md:p-6">
        <h2 className="font-bold">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div><label className="label">Username</label><input className="input" value={f.username} onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} /></div>
        </div>
        <div><label className="label">Headline</label><input className="input" maxLength={120} value={f.headline} onChange={(e) => set("headline", e.target.value)} /></div>
        <div><label className="label">Bio</label><textarea className="input min-h-24" maxLength={400} value={f.bio} onChange={(e) => set("bio", e.target.value)} /></div>
        <div><label className="label">Location</label><LocationPicker value={{ location: f.location, lat: f.lat, lng: f.lng }} onChange={(v) => setF((x) => ({ ...x, ...v }))} /></div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
          <div><label className="label">University</label><input className="input" value={f.university} onChange={(e) => set("university", e.target.value)} /></div>
          <div><label className="label">Major</label><input className="input" value={f.major} onChange={(e) => set("major", e.target.value)} /></div>
          <div><label className="label">Grad year</label><input className="input" type="number" value={f.gradYear ?? ""} onChange={(e) => set("gradYear", e.target.value ? Number(e.target.value) : null)} /></div>
        </div>
        <div><label className="label">Current job / internship</label><input className="input" value={f.company} onChange={(e) => set("company", e.target.value)} /></div>
      </section>
      <section className="card space-y-5 p-5 md:p-6">
        <h2 className="font-bold">Skills & interests</h2>
        <div><label className="label">Languages</label><TagPicker value={f.languages} onChange={(v) => set("languages", v)} suggestions={LANGUAGES} accent="orange" /></div>
        <div><label className="label">Frameworks & tools</label><TagPicker value={f.technologies} onChange={(v) => set("technologies", v)} suggestions={TECHNOLOGIES} accent="blue" /></div>
        <div><label className="label">Interests</label><TagPicker value={f.interests} onChange={(v) => set("interests", v)} suggestions={INTERESTS} accent="coral" /></div>
        <div><label className="label">Projects you want to build</label><TagPicker value={f.projectTypes} onChange={(v) => set("projectTypes", v)} suggestions={PROJECT_TYPES} accent="purple" /></div>
      </section>
      <section className="card space-y-4 p-5 md:p-6">
        <h2 className="font-bold">Collaboration</h2>
        <Toggle on={f.lookingForCollab} onChange={(v) => set("lookingForCollab", v)} label="Looking for collaborators" />
        <Toggle on={f.openToHackathons} onChange={(v) => set("openToHackathons", v)} label="Open to hackathon teams" />
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY.map((a) => <button key={a} onClick={() => set("availability", a)} className={cn("chip px-3 py-2", f.availability === a ? "bg-ink text-white" : "border border-paper-line bg-white text-ink-soft")}>{a}</button>)}
        </div>
        <div className="flex gap-2.5 pt-1">
          {(Object.keys(ACCENTS) as Accent[]).map((k) => <button key={k} onClick={() => set("accent", k)} aria-label={k} className={cn("h-9 w-9 rounded-full bg-gradient-to-br ring-offset-2", ACCENTS[k].grad, f.accent === k && "ring-2 ring-ink")} />)}
        </div>
      </section>
      <div className="sticky bottom-24 flex justify-end md:bottom-6">
        <button onClick={save} disabled={saving} className="btn-brand px-6 py-3 shadow-pop">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile</button>
      </div>
    </div>
  );
}

function GithubSettings({ github, configured }: { github: { username: string | null; syncedAt: string | null; scopes: string; repoCount: number }; configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const hasPrivate = github.scopes.split(/[ ,]/).includes("repo");
  const sync = async () => {
    setBusy("sync");
    try {
      await api("/api/github", { method: "POST" });
      toast("GitHub synced");
      router.refresh();
    } catch {
    } finally {
      setBusy(null);
    }
  };
  const disconnect = async () => {
    setBusy("disc");
    try {
      await api("/api/github", { method: "DELETE" });
      toast("GitHub disconnected and imported data removed");
      router.refresh();
    } catch {
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="card overflow-hidden">
      <div className="bg-gradient-to-br from-[#15131F] to-[#3a2f6b] p-6 text-white">
        <Github className="h-8 w-8" />
        <h2 className="mt-2 text-xl font-bold">{github.username ? `Connected as @${github.username}` : "Connect GitHub"}</h2>
        <p className="mt-1 text-sm text-white/75">{github.username ? `${github.repoCount} repositories imported${github.syncedAt ? ` · last synced ${timeAgo(github.syncedAt)} ago` : ""}` : "Build your portfolio from your real code."}</p>
      </div>
      <div className="space-y-4 p-6">
        {!configured ? (
          <div className="rounded-2xl bg-sun-soft p-4 text-sm text-sun-deep">
            <b>GitHub OAuth isn&apos;t configured on this server.</b> Create an OAuth App at github.com/settings/developers with callback <code className="font-mono">/api/auth/github/callback</code>, then set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env. See the README.
          </div>
        ) : github.username ? (
          <>
            <div className="flex flex-wrap gap-2">
              <button onClick={sync} disabled={!!busy} className="btn-primary">{busy === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync now</button>
              {!hasPrivate && <a href="/api/auth/github?mode=connect&private=1&next=/settings" className="btn-outline">Include private repos</a>}
              <button onClick={() => setConfirm(true)} disabled={!!busy} className="btn-ghost text-coral-deep">{busy === "disc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />} Disconnect</button>
            </div>
            <p className="text-xs text-ink-mute">Granted scopes: <code className="font-mono">{github.scopes || "read:user"}</code>. {hasPrivate ? "Private repositories are imported but only ever shown to you." : "Only public repositories are imported."}</p>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <a href="/api/auth/github?mode=connect&next=/settings" className="btn-primary"><Github className="h-4 w-4" /> Connect (public repos)</a>
            <a href="/api/auth/github?mode=connect&private=1&next=/settings" className="btn-outline">Connect with private repos</a>
          </div>
        )}
        <div className="rounded-2xl border border-dashed border-paper-line p-4 text-xs leading-relaxed text-ink-mute">
          <p className="mb-1 font-semibold text-ink-soft">What we access</p>
          Your profile, email, repositories, languages, READMEs of top repos, the last year of contribution totals (GraphQL), and up to 90 days of public events. Your token is encrypted at rest (AES-256-GCM), never sent to the browser, and deleted when you disconnect. Private repo data is only read if you grant the <code className="font-mono">repo</code> scope.
        </div>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={disconnect} danger title="Disconnect GitHub?" body="We'll delete your stored token and all GitHub-derived data (repos, stats, activity, imported projects that aren't listings). Information you entered yourself is kept." confirmLabel="Disconnect" />
    </section>
  );
}

const PRIVACY_ITEMS: { key: keyof Privacy; label: string; body: string }[] = [
  { key: "showInMatch", label: "Show me in Hackergram Match", body: "Others can discover you in the swipe deck and recommendations." },
  { key: "showUniversity", label: "Show university & major", body: "Visible on your profile and match card." },
  { key: "showLocation", label: "Show my city", body: "Used for local feed, nearby matches and events." },
  { key: "showRepos", label: "Show GitHub stats & repositories", body: "Your GitHub tab and repo search results." },
  { key: "showActivity", label: "Show activity", body: "Posts, events you're attending and GitHub activity." },
  { key: "showEmail", label: "Show my email", body: "Display your email address on your profile." },
];

function PrivacyForm({ initial }: { initial: Privacy }) {
  const [p, setP] = useState(initial);
  const update = async (key: keyof Privacy, v: boolean) => {
    const prev = p;
    setP({ ...p, [key]: v });
    try {
      await api("/api/me", { method: "PATCH", body: { privacy: { [key]: v } } });
      toast("Privacy updated");
    } catch {
      setP(prev);
    }
  };
  return (
    <section className="card divide-y divide-paper-line">
      {PRIVACY_ITEMS.map((it) => (
        <div key={it.key} className="flex items-center gap-4 p-5">
          <div className="flex-1">
            <div className="font-semibold">{it.label}</div>
            <div className="text-sm text-ink-mute">{it.body}</div>
          </div>
          <Switch on={p[it.key]} onChange={(v) => update(it.key, v)} />
        </div>
      ))}
    </section>
  );
}

function Security({ hasPassword, username, email }: { hasPassword: boolean; username: string; email: string }) {
  const router = useRouter();
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const savePw = async () => {
    setBusy(true);
    try {
      await api("/api/me", { method: "PUT", body: { current: cur || undefined, password: pw } });
      toast(hasPassword ? "Password changed" : "Password set");
      setCur("");
      setPw("");
      router.refresh();
    } catch {
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
  const deleteAccount = async () => {
    await api("/api/me", { method: "DELETE", body: { confirm: confirmText } });
    toast("Your account and data have been deleted");
    router.push("/signup");
  };
  return (
    <div className="space-y-5">
      <section className="card space-y-3 p-6">
        <h2 className="flex items-center gap-2 font-bold"><KeyRound className="h-4 w-4 text-grape" /> {hasPassword ? "Change password" : "Set a password"}</h2>
        <p className="text-sm text-ink-mute">Signed in as {email}</p>
        {hasPassword && <input className="input" type="password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />}
        <input className="input" type="password" placeholder="New password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <button className="btn-primary" disabled={busy || pw.length < 8} onClick={savePw}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save password</button>
      </section>
      <section className="card flex items-center justify-between p-6">
        <div><h2 className="font-bold">Sign out</h2><p className="text-sm text-ink-mute">End your session on this device.</p></div>
        <button onClick={logout} className="btn-outline"><LogOut className="h-4 w-4" /> Sign out</button>
      </section>
      <section className="card border-coral/30 p-6">
        <h2 className="flex items-center gap-2 font-bold text-coral-deep"><AlertTriangle className="h-4 w-4" /> Delete account</h2>
        <p className="mt-1 text-sm text-ink-mute">Permanently deletes your profile, posts, projects, matches, messages, GitHub data and AI drafts. This cannot be undone.</p>
        <button onClick={() => setDel(true)} className="btn mt-3 bg-coral text-white hover:bg-coral-deep"><Trash2 className="h-4 w-4" /> Delete my account</button>
      </section>
      <Modal open={del} onClose={() => setDel(false)} title="Delete your account?">
        <p className="text-sm text-ink-soft">Type <b>{username}</b> to confirm. All of your data will be permanently removed.</p>
        <input className="input mt-3" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={username} />
        <button className="btn mt-4 w-full bg-coral text-white" disabled={confirmText !== username} onClick={deleteAccount}>Permanently delete</button>
      </Modal>
    </div>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="relative h-7 w-12 shrink-0 rounded-full transition-colors" style={{ background: on ? "#8257FF" : "#E4E3EC" }}>
      <motion.span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow" animate={{ left: on ? 24 : 4 }} />
    </button>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-semibold">{label}</span>
      <Switch on={on} onChange={onChange} />
    </div>
  );
}
