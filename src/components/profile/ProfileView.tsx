"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "framer-motion";
import {
  Award, Briefcase, CalendarDays, ExternalLink, FolderKanban, GitFork, Github, GraduationCap, Info, Loader2, Mail, MapPin, MessageCircle, Pin, Plus,
  RefreshCw, Sparkles, Star, Trash2, Trophy, Users, Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { FollowButton } from "@/components/home/FollowButton";
import { Avatar, isOnline } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, SampleBadge, TechTag } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { accentOf, cn, compact, formatDate, timeAgo } from "@/lib/utils";
import type { FeedPost } from "@/lib/feed";
import type { GithubStats } from "@/lib/github";
import { ContributionHeatmap, LanguageDonut } from "./GithubViz";

type Props = {
  isMe: boolean;
  aiReady: boolean;
  initialFollowing: boolean;
  user: {
    id: string; name: string; username: string; image: string | null; headline: string; bio: string; accent: string; email: string | null;
    location: string; university: string; major: string; gradYear: number | null; company: string; availability: string;
    lookingForCollab: boolean; openToHackathons: boolean; isSample: boolean; lastSeenAt: string; githubUsername: string | null; githubSyncedAt: string | null;
    languages: string[]; technologies: string[]; interests: string[]; projectTypes: string[];
    aiSummary: string | null; aiSummaryModel: string | null; aiSummaryAt: string | null;
    counts: { followers: number; following: number; projects: number; posts: number };
  };
  github: {
    stats: GithubStats & { sample?: boolean };
    repos: { id: string; name: string; description: string; url: string; language: string | null; stars: number; forks: number; isPrivate: boolean; topics: string[]; pushedAt: string | null }[];
    activity: { id: string; title: string; url: string; type: string; occurredAt: string }[];
  } | null;
  projects: { id: string; title: string; tagline: string; color: string; thumbnail: string | null; tech: string[]; category: string; stars: number; forks: number; repoUrl: string; demoUrl: string; pinned: boolean; source: string; isListing: boolean; members: { name: string; image: string | null }[] }[];
  teams: { id: string; title: string; color: string; role: string }[];
  education: { id: string; school: string; degree: string; field: string; startYear: number | null; endYear: number | null }[];
  experience: { id: string; kind: string; title: string; org: string; start: string; end: string; description: string; current: boolean }[];
  events: { id: string; name: string; startsAt: string; where: string }[];
  posts: FeedPost[];
};

const TABS = [
  { key: "portfolio", label: "Portfolio", icon: FolderKanban },
  { key: "github", label: "GitHub", icon: Github },
  { key: "about", label: "About", icon: Info },
  { key: "posts", label: "Posts", icon: MessageCircle },
] as const;

export function ProfileView(p: Props) {
  const { user, isMe } = p;
  const a = accentOf(user.accent);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("portfolio");
  const [followers, setFollowers] = useState(user.counts.followers);
  const router = useRouter();

  const message = async () => {
    const { id } = await api("/api/conversations", { body: { userId: user.id } });
    router.push(`/messages/${id}`);
  };

  return (
    <div className="mx-auto max-w-[1000px] px-4 pb-10 pt-4 md:px-8 md:pt-8">
      {/* Header */}
      <section className="card overflow-hidden">
        <div className={cn("relative h-36 bg-gradient-to-br md:h-44", a.grad)}>
          <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden>
            <defs><pattern id="pp" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M0 11h22M11 0v22" stroke="white" strokeWidth="1" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#pp)" />
          </svg>
          <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/20" />
          <div className="absolute bottom-4 right-5 flex flex-wrap justify-end gap-1.5">
            {user.lookingForCollab && <span className="chip bg-white/90 text-mint-deep"><Zap className="h-3 w-3" fill="currentColor" /> Open to collaborate</span>}
            {user.openToHackathons && <span className="chip bg-white/90 text-tang-deep"><Trophy className="h-3 w-3" /> Hackathon-ready</span>}
          </div>
        </div>
        <div className="relative px-5 pb-6 md:px-8">
          <div className="-mt-14 flex flex-wrap items-end justify-between gap-4">
            <div className="rotate-[-3deg] rounded-[32px] bg-white p-1.5 shadow-lift">
              {user.image ? (
                <img src={user.image} alt={user.name} className="h-28 w-28 rounded-[26px] object-cover md:h-32 md:w-32" />
              ) : (
                <div className={cn("flex h-28 w-28 items-center justify-center rounded-[26px] bg-gradient-to-br font-display text-5xl font-extrabold text-white md:h-32 md:w-32", a.grad)}>{user.name[0]}</div>
              )}
            </div>
            <div className="flex gap-2 pb-1">
              {isMe ? (
                <Link href="/settings" className="btn-outline">Edit profile</Link>
              ) : (
                <>
                  <button onClick={message} className="btn-outline"><MessageCircle className="h-4 w-4" /> Message</button>
                  <FollowButton userId={user.id} initial={p.initialFollowing} size="md" onChange={(_, n) => setFollowers(n)} />
                </>
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold">{user.name}</h1>
              {user.isSample && <SampleBadge />}
              {isOnline(user.lastSeenAt) && <span className="chip bg-mint-soft text-mint-deep"><span className="h-1.5 w-1.5 rounded-full bg-mint" /> Online</span>}
            </div>
            <p className="text-ink-mute">@{user.username}{user.headline && <> · <span className="text-ink-soft">{user.headline}</span></>}</p>
            {user.bio && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{user.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-medium text-ink-soft">
              {user.university && <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-grape" />{user.university}{user.gradYear && ` · ${user.gradYear}`}</span>}
              {user.company && <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-tang" />{user.company}</span>}
              {user.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-mint" />{user.location}</span>}
              {user.githubUsername && (
                <a href={`https://github.com/${user.githubUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-ink"><Github className="h-4 w-4" />{user.githubUsername}</a>
              )}
              {user.email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-sky" />{user.email}</span>}
            </div>
            <div className="mt-5 grid max-w-lg grid-cols-4 gap-2">
              <Stat n={followers} label="Followers" />
              <Stat n={user.counts.following} label="Following" />
              <Stat n={user.counts.projects} label="Projects" />
              <Stat n={user.counts.posts} label="Posts" />
            </div>
          </div>
        </div>
      </section>

      {/* AI summary */}
      <AiSummary {...p} />

      {/* Tabs */}
      <div className="no-scrollbar sticky top-[61px] z-20 -mx-4 mt-6 flex gap-1 overflow-x-auto bg-paper-off/85 px-4 py-2 backdrop-blur-xl md:top-0">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold", tab === t.key ? "text-white" : "text-ink-soft hover:bg-white")}>
            {tab === t.key && <motion.span layoutId="profile-tab" className="absolute inset-0 rounded-full" style={{ background: a.solid }} />}
            <t.icon className="relative h-4 w-4" />
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="mt-4">
          {tab === "portfolio" && <Portfolio {...p} />}
          {tab === "github" && <GithubTab {...p} />}
          {tab === "about" && <About {...p} />}
          {tab === "posts" &&
            (p.posts.length ? (
              <div className="mx-auto max-w-[640px] space-y-4">{p.posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
            ) : (
              <div className="card"><EmptyState icon={MessageCircle} title="No posts yet" body={isMe ? "Share what you're building. The community wants to see it." : "Nothing shared yet."} /></div>
            ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-paper-off px-3 py-2.5 text-center">
      <div className="font-display text-xl font-extrabold">{compact(n)}</div>
      <div className="text-[11px] font-semibold text-ink-mute">{label}</div>
    </div>
  );
}

function SourceTag({ kind }: { kind: "github" | "user" | "ai" | "sample" }) {
  const map = {
    github: { label: "From GitHub", cls: "bg-ink text-white" },
    user: { label: "Added by user", cls: "bg-paper-soft text-ink-soft" },
    ai: { label: "AI-generated", cls: "bg-ai-grad text-white" },
    sample: { label: "Sample data", cls: "border border-dashed border-ink-faint text-ink-mute" },
  }[kind];
  return <span className={cn("chip text-[10px] uppercase tracking-wider", map.cls)}>{map.label}</span>;
}

function AiSummary({ user, isMe, aiReady, github }: Props) {
  const [summary, setSummary] = useState(user.aiSummary);
  const [model, setModel] = useState(user.aiSummaryModel);
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true);
    try {
      const r = await api("/api/ai/summary", { method: "POST" });
      setSummary(r.summary);
      setModel(r.model);
      toast("Summary updated ✨");
    } catch {
    } finally {
      setLoading(false);
    }
  };
  if (!summary && !isMe) return null;
  return (
    <section className="relative mt-5 overflow-hidden rounded-4xl bg-white p-5 shadow-card md:p-6">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-aqua/20 blur-2xl" />
      <div className="absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-grape/15 blur-2xl" />
      <div className="relative">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-xl bg-ai-grad"><Sparkles className="h-4 w-4 text-white" /></span> Developer snapshot</h2>
          <div className="flex items-center gap-2">
            {summary && <SourceTag kind="ai" />}
            {isMe && (
              <button onClick={generate} disabled={loading || !aiReady} className="btn-outline px-3 py-1.5 text-xs" title={aiReady ? "" : "Configure GEMINI_API_KEY to enable"}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {summary ? "Regenerate" : "Generate"}
              </button>
            )}
          </div>
        </div>
        {summary ? (
          <>
            <p className="text-[15px] leading-relaxed text-ink-soft">{summary}</p>
            <p className="mt-2 text-[11px] text-ink-faint">Generated by {model} from {github?.stats.login ? "GitHub data and " : ""}profile info. AI assessments can be wrong.</p>
          </>
        ) : (
          <p className="text-sm text-ink-mute">
            {aiReady
              ? "Generate an AI summary of your strengths from your GitHub repos and profile. You can regenerate it any time."
              : "AI isn't configured on this server yet. Add a GEMINI_API_KEY (Gemma 4) to .env to enable developer snapshots."}
          </p>
        )}
      </div>
    </section>
  );
}

function Portfolio({ projects, isMe, teams, events }: Props) {
  const [items, setItems] = useState(projects);
  const pin = async (id: string) => {
    const r = await api(`/api/projects/${id}/pin`, { method: "POST" }).catch(() => null);
    if (r) setItems((xs) => xs.map((x) => (x.id === id ? { ...x, pinned: r.pinned } : x)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.stars - a.stars));
  };
  return (
    <div className="space-y-8">
      {items.length === 0 ? (
        <div className="card">
          <EmptyState icon={FolderKanban} accent="blue" title="No projects yet" body={isMe ? "Connect GitHub to import repos, or add a project manually." : "Nothing in the portfolio yet."}>
            {isMe && <div className="flex gap-2"><Link href="/projects/new" className="btn-primary"><Plus className="h-4 w-4" /> Add project</Link><Link href="/settings" className="btn-outline"><Github className="h-4 w-4" /> Connect GitHub</Link></div>}
          </EmptyState>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((pr, i) => {
            const a = accentOf(pr.color);
            return (
              <motion.div key={pr.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -4 }} className="group card overflow-hidden hover:shadow-lift">
                <Link href={`/projects/${pr.id}`} className={cn("relative block h-32 overflow-hidden bg-gradient-to-br", a.grad)}>
                  {pr.thumbnail ? (
                    <img src={pr.thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <span className="absolute bottom-2 left-4 font-display text-6xl font-extrabold text-white/85">{pr.title[0]}</span>
                  )}
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    {pr.pinned && <span className="chip bg-white/90 text-ink"><Pin className="h-3 w-3" /> Pinned</span>}
                    {pr.isListing && <span className="chip bg-white/90 text-coral-deep">Recruiting</span>}
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/projects/${pr.id}`} className="font-bold hover:underline">{pr.title}</Link>
                    {isMe && (
                      <button onClick={() => pin(pr.id)} className={cn("rounded-full p-1.5 transition", pr.pinned ? "bg-grape-soft text-grape" : "text-ink-faint hover:bg-paper-soft")} aria-label="Pin project">
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-[40px] text-sm text-ink-mute">{pr.tagline || "No description"}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{pr.tech.slice(0, 3).map((t) => <TechTag key={t} name={t} />)}</div>
                  <div className="mt-3 flex items-center justify-between border-t border-paper-line pt-3 text-xs font-semibold text-ink-mute">
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-sun" fill="#FFD65A" />{compact(pr.stars)}</span>
                      <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" />{compact(pr.forks)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {pr.source === "github" && <Github className="h-3.5 w-3.5" aria-label="Imported from GitHub" />}
                      <span className="flex -space-x-2">{pr.members.slice(0, 3).map((m) => <Avatar key={m.name} name={m.name} src={m.image} size={22} className="ring-2 ring-white rounded-full" />)}</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      {(teams.length > 0 || events.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-sky" /> Teams joined</h3>
              <div className="space-y-2">
                {teams.map((t) => (
                  <Link key={t.id} href={`/projects/${t.id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-paper-off">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br font-bold text-white", accentOf(t.color).grad)}>{t.title[0]}</span>
                    <div><div className="text-sm font-bold">{t.title}</div><div className="text-xs text-ink-mute">{t.role}</div></div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {events.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold"><Trophy className="h-4 w-4 text-mint" /> Hackathons</h3>
              <div className="space-y-2">
                {events.map((e) => (
                  <Link key={e.id} href={`/map?event=${e.id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-paper-off">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint-soft"><CalendarDays className="h-4 w-4 text-mint" /></span>
                    <div><div className="text-sm font-bold">{e.name}</div><div className="text-xs text-ink-mute">{formatDate(e.startsAt)} · {e.where}</div></div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GithubTab({ github, isMe, user }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  if (!github || (!user.githubUsername && !github.stats.sample)) {
    return (
      <div className="card">
        <EmptyState icon={Github} title={isMe ? "Connect GitHub" : "GitHub not connected"} body={isMe ? "Import your repos, languages and contribution history automatically." : "This builder hasn't connected GitHub, or keeps it private."}>
          {isMe && <Link href="/settings" className="btn-primary"><Github className="h-4 w-4" /> Connect GitHub</Link>}
        </EmptyState>
      </div>
    );
  }
  const s = github.stats;
  const sync = async () => {
    setSyncing(true);
    try {
      await api("/api/github", { method: "POST" });
      toast("GitHub synced");
      router.refresh();
    } catch {
    } finally {
      setSyncing(false);
    }
  };
  const tiles = [
    { label: "Contributions (12 mo)", v: s.totalContributions, c: "#35C98A" },
    { label: "Commits", v: s.commits, c: "#8257FF" },
    { label: "PRs merged", v: s.mergedPullRequests, c: "#4285FF" },
    { label: "Issues opened", v: s.issues, c: "#FF984F" },
    { label: "Total stars", v: s.totalStars, c: "#FFD65A" },
    { label: "Public repos", v: s.publicRepos, c: "#FF668C" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SourceTag kind={s.sample ? "sample" : "github"} />
          {user.githubSyncedAt && <span className="text-xs text-ink-mute">Synced {timeAgo(user.githubSyncedAt)} ago</span>}
        </div>
        {isMe && user.githubUsername && (
          <button onClick={sync} disabled={syncing} className="btn-outline px-3 py-1.5 text-xs">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync now
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="font-display text-2xl font-extrabold" style={{ color: t.v == null ? undefined : t.c }}>{t.v == null ? "—" : compact(t.v)}</div>
            <div className="mt-1 text-[11px] font-semibold text-ink-mute">{t.label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
        <div className="card min-w-0 p-5">
          <h3 className="mb-3 font-bold">Contribution activity</h3>
          {s.calendar?.length ? <ContributionHeatmap calendar={s.calendar} /> : <p className="text-sm text-ink-mute">Contribution calendar unavailable.</p>}
        </div>
        <div className="card min-w-0 p-5">
          <h3 className="mb-3 font-bold">Languages</h3>
          {s.languageBytes && Object.keys(s.languageBytes).length ? <LanguageDonut bytes={s.languageBytes} /> : <p className="text-sm text-ink-mute">No language data yet.</p>}
        </div>
      </div>
      {github.repos.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-bold">Top repositories</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {github.repos.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="group rounded-2xl border border-paper-line p-4 transition hover:border-transparent hover:shadow-lift">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-sm font-bold group-hover:text-sky">{r.name}</span>
                  {r.isPrivate && <span className="chip bg-paper-soft text-ink-mute">Private · only you see this</span>}
                  <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-ink-faint" />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-mute">{r.description || "No description"}</p>
                <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-ink-mute">
                  {r.language && <TechTag name={r.language} />}
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-sun" fill="#FFD65A" />{r.stars}</span>
                  <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" />{r.forks}</span>
                  {r.pushedAt && <span>Updated {timeAgo(r.pushedAt)}</span>}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {github.activity.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-bold">Recent activity</h3>
          <ul className="space-y-2.5">
            {github.activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mint" />
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-ink-soft hover:text-ink">{a.title}</a>
                <span className="shrink-0 text-xs text-ink-faint">{timeAgo(a.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.limitations && (
        <div className="rounded-3xl border border-dashed border-paper-line p-4 text-xs text-ink-mute">
          <p className="mb-1 font-semibold text-ink-soft">What GitHub's API can and can't show</p>
          <ul className="list-disc space-y-0.5 pl-4">{s.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function About({ user, education, experience, isMe }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "education" | "experience">(null);
  const del = async (kind: string, id: string) => {
    await api(`/api/profile/${kind}?id=${id}`, { method: "DELETE" });
    router.refresh();
  };
  const groups = [
    { title: "Languages", items: user.languages, color: "orange" },
    { title: "Frameworks & tools", items: user.technologies, color: "blue" },
    { title: "Interests", items: user.interests, color: "coral" },
    { title: "Wants to build", items: user.projectTypes, color: "purple" },
  ];
  const certs = experience.filter((e) => e.kind === "certification");
  const work = experience.filter((e) => e.kind !== "certification");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5 md:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold">Skills</h3>
          <SourceTag kind="user" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="eyebrow mb-2">{g.title}</div>
              <div className="flex flex-wrap gap-1.5">
                {g.items.length ? g.items.map((s) => {
                  const a = accentOf(g.color);
                  return (
                    <motion.span key={s} whileHover={{ y: -2, scale: 1.04 }} className="chip cursor-default py-1.5 text-[13px]" style={{ background: a.soft, color: a.text }}>{s}</motion.span>
                  );
                }) : <span className="text-sm text-ink-faint">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold"><GraduationCap className="h-4 w-4 text-grape" /> Education</h3>
          {isMe && <button onClick={() => setModal("education")} className="btn-ghost p-1.5" aria-label="Add education"><Plus className="h-4 w-4" /></button>}
        </div>
        {education.length === 0 && <p className="text-sm text-ink-mute">{user.university || "Not added yet."}</p>}
        <div className="space-y-3">
          {education.map((e) => (
            <div key={e.id} className="group flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grape-soft font-bold text-grape">{e.school[0]}</span>
              <div className="flex-1">
                <div className="font-semibold">{e.school}</div>
                <div className="text-sm text-ink-mute">{[e.degree, e.field].filter(Boolean).join(", ")}{e.startYear || e.endYear ? ` · ${e.startYear ?? ""}–${e.endYear ?? ""}` : ""}</div>
              </div>
              {isMe && <button onClick={() => del("education", e.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Remove"><Trash2 className="h-4 w-4 text-ink-faint hover:text-coral" /></button>}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold"><Briefcase className="h-4 w-4 text-tang" /> Experience</h3>
          {isMe && <button onClick={() => setModal("experience")} className="btn-ghost p-1.5" aria-label="Add experience"><Plus className="h-4 w-4" /></button>}
        </div>
        {work.length === 0 && <p className="text-sm text-ink-mute">{user.company || "Not added yet."}</p>}
        <div className="space-y-3">
          {work.map((e) => (
            <div key={e.id} className="group flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tang-soft font-bold text-tang-deep">{e.org[0]}</span>
              <div className="flex-1">
                <div className="font-semibold">{e.title} <span className="font-normal text-ink-mute">· {e.org}</span></div>
                <div className="text-xs text-ink-mute">{e.kind === "internship" ? "Internship · " : ""}{e.start}{e.current ? " – present" : e.end ? ` – ${e.end}` : ""}</div>
                {e.description && <p className="mt-1 text-sm text-ink-soft">{e.description}</p>}
              </div>
              {isMe && <button onClick={() => del("experience", e.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Remove"><Trash2 className="h-4 w-4 text-ink-faint hover:text-coral" /></button>}
            </div>
          ))}
        </div>
        {certs.length > 0 && (
          <>
            <div className="eyebrow mb-2 mt-5 flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Certifications</div>
            {certs.map((c) => (
              <div key={c.id} className="group flex items-center justify-between py-1 text-sm">
                <span><b>{c.title}</b> · {c.org}</span>
                {isMe && <button onClick={() => del("experience", c.id)} className="opacity-0 group-hover:opacity-100" aria-label="Remove"><Trash2 className="h-4 w-4 text-ink-faint" /></button>}
              </div>
            ))}
          </>
        )}
      </div>
      <EntryModal kind={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh(); }} />
    </div>
  );
}

function EntryModal({ kind, onClose, onSaved }: { kind: null | "education" | "experience"; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Record<string, string | boolean>>({ kind: "internship" });
  const [saving, setSaving] = useState(false);
  const v = (k: string) => (f[k] as string) ?? "";
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setSaving(true);
    try {
      const body =
        kind === "education"
          ? { school: v("school"), degree: v("degree"), field: v("field"), startYear: v("startYear") ? Number(v("startYear")) : null, endYear: v("endYear") ? Number(v("endYear")) : null }
          : { kind: v("kind"), title: v("title"), org: v("org"), start: v("start"), end: v("end"), description: v("description"), current: Boolean(f.current) };
      await api(`/api/profile/${kind}`, { body });
      setF({ kind: "internship" });
      onSaved();
    } catch {
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={kind !== null} onClose={onClose} title={kind === "education" ? "Add education" : "Add experience"}>
      <div className="space-y-3">
        {kind === "education" ? (
          <>
            <input className="input" placeholder="School" value={v("school")} onChange={set("school")} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Degree (B.S.)" value={v("degree")} onChange={set("degree")} />
              <input className="input" placeholder="Field" value={v("field")} onChange={set("field")} />
              <input className="input" type="number" placeholder="Start year" value={v("startYear")} onChange={set("startYear")} />
              <input className="input" type="number" placeholder="End year" value={v("endYear")} onChange={set("endYear")} />
            </div>
          </>
        ) : (
          <>
            <select className="input" value={v("kind")} onChange={set("kind")}>
              <option value="internship">Internship</option>
              <option value="job">Job</option>
              <option value="certification">Certification</option>
            </select>
            <input className="input" placeholder={v("kind") === "certification" ? "Certification name" : "Title"} value={v("title")} onChange={set("title")} />
            <input className="input" placeholder={v("kind") === "certification" ? "Issuer" : "Company / organization"} value={v("org")} onChange={set("org")} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Start (e.g. Jun 2025)" value={v("start")} onChange={set("start")} />
              <input className="input" placeholder="End" value={v("end")} onChange={set("end")} disabled={Boolean(f.current)} />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <input type="checkbox" checked={Boolean(f.current)} onChange={(e) => setF({ ...f, current: e.target.checked })} /> I currently do this
            </label>
            <textarea className="input min-h-20" placeholder="What did you work on?" value={v("description")} onChange={set("description")} />
          </>
        )}
        <button className="btn-primary w-full" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
      </div>
    </Modal>
  );
}
