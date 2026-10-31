"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Compass, FolderKanban, Github, Loader2, MessageCircle, Search, Sparkles, Star, TrendingUp, UserPlus, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FollowButton } from "@/components/home/FollowButton";
import { Avatar, isOnline } from "@/components/ui/Avatar";
import { EmptyState, SampleBadge, SectionTitle, TechTag } from "@/components/ui/primitives";
import { api } from "@/lib/client";
import { accentOf, cn, compact, formatDate, langColor, timeAgo } from "@/lib/utils";

type Results = {
  people?: { id: string; name: string; username: string; image: string | null; headline: string; university: string; company: string; languages: string[]; isSample: boolean }[];
  projects?: { id: string; title: string; tagline: string; color: string; tech: string[]; isListing: boolean; stars: number }[];
  repos?: { id: string; fullName: string; description: string; url: string; language: string | null; stars: number; owner: string }[];
  events?: { id: string; name: string; city: string; isOnline: boolean; startsAt: string; source: string }[];
  posts?: { id: string; content: string; createdAt: string; author: { name: string; username: string; image: string | null } }[];
};

const TYPES = [
  { key: "all", label: "All" },
  { key: "people", label: "Developers", icon: Users },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "repos", label: "Repositories", icon: Github },
  { key: "events", label: "Hackathons", icon: CalendarDays },
  { key: "posts", label: "Posts", icon: MessageCircle },
] as const;

type Props = {
  initialQuery: string;
  trendingDevs: { id: string; name: string; username: string; image: string | null; headline: string; accent: string; isSample: boolean; followers: number; skills: string[] }[];
  recommended: { id: string; name: string; username: string; image: string | null; headline: string; isSample: boolean; lastSeenAt: string; skills: string[]; score: number; reason: string }[];
  projects: { id: string; title: string; tagline: string; color: string; thumbnail: string | null; stars: number; tech: string[]; isListing: boolean; owner: { name: string; username: string; image: string | null } }[];
  technologies: { name: string; count: number }[];
  events: { id: string; name: string; city: string; startsAt: string; going: number; source: string; prize: string }[];
  newest: { id: string; name: string; username: string; image: string | null; headline: string; isSample: boolean }[];
};

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function ExploreView(p: Props) {
  const [q, setQ] = useState(p.initialQuery);
  const [submitted, setSubmitted] = useState(p.initialQuery);
  const [type, setType] = useState("all");
  const [suggest, setSuggest] = useState<Results | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState(false);
  const dq = useDebounced(q, 220);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Autocomplete
  useEffect(() => {
    if (!dq.trim() || dq === submitted) return setSuggest(null);
    api(`/api/search?q=${encodeURIComponent(dq)}&limit=small`, { silent: true }).then((d) => setSuggest(d.results)).catch(() => {});
  }, [dq, submitted]);

  // Full results
  useEffect(() => {
    if (!submitted.trim()) return setResults(null);
    setLoading(true);
    api(`/api/search?q=${encodeURIComponent(submitted)}&type=${type}`, { silent: true })
      .then((d) => setResults(d.results))
      .catch(() => setResults({}))
      .finally(() => setLoading(false));
  }, [submitted, type]);

  const run = (term: string) => {
    setQ(term);
    setSubmitted(term);
    setSuggest(null);
    inputRef.current?.blur();
    router.replace(term ? `/explore?q=${encodeURIComponent(term)}` : "/explore", { scroll: false });
  };

  const total = results ? Object.values(results).reduce((n, xs) => n + (xs?.length ?? 0), 0) : 0;

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-5 md:px-8 md:py-8">
      {/* Search hero */}
      <section className="relative mb-8 rounded-[40px] bg-white p-6 shadow-card md:p-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[40px]">
          <div className="absolute -left-10 -top-16 h-56 w-56 rounded-full bg-sky/20 blur-3xl" />
          <div className="absolute -bottom-16 right-10 h-56 w-56 rounded-full bg-coral/15 blur-3xl" />
          <div className="absolute right-1/3 top-0 h-40 w-40 rounded-full bg-sun/20 blur-3xl" />
        </div>
        <div className="relative">
          <h1 className="flex items-center gap-3 text-3xl font-extrabold md:text-4xl">
            <Compass className="h-8 w-8 text-sky" /> Explore
          </h1>
          <p className="mt-1 text-ink-mute">Search builders, projects, repos, hackathons, technologies and posts.</p>
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
            <input
              ref={inputRef}
              className="w-full rounded-full border-2 border-paper-line bg-paper-off py-4 pl-14 pr-12 text-[17px] outline-none transition focus:border-sky focus:bg-white focus:shadow-lift"
              placeholder="Try “Rust”, “UT Austin”, “health”, or a name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setTimeout(() => setFocus(false), 150)}
              onKeyDown={(e) => e.key === "Enter" && run(q)}
            />
            {q && <button onClick={() => run("")} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-paper-soft" aria-label="Clear"><X className="h-4 w-4" /></button>}
            <AnimatePresence>
              {focus && suggest && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-30 mt-2 w-full overflow-hidden rounded-3xl border border-paper-line bg-white py-2 shadow-pop">
                  {suggest.people?.map((u) => (
                    <Link key={u.id} href={`/u/${u.username}`} className="flex items-center gap-3 px-4 py-2 hover:bg-paper-off">
                      <Avatar name={u.name} src={u.image} size={30} /> <span className="text-sm font-semibold">{u.name}</span> <span className="truncate text-xs text-ink-mute">{u.headline}</span>
                    </Link>
                  ))}
                  {suggest.projects?.map((pr) => (
                    <Link key={pr.id} href={`/projects/${pr.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-paper-off">
                      <span className={cn("flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold text-white", accentOf(pr.color).grad)}>{pr.title[0]}</span>
                      <span className="text-sm font-semibold">{pr.title}</span> <span className="truncate text-xs text-ink-mute">{pr.tagline}</span>
                    </Link>
                  ))}
                  {suggest.events?.map((e) => (
                    <Link key={e.id} href={`/map?event=${e.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-paper-off">
                      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-mint-soft"><CalendarDays className="h-4 w-4 text-mint" /></span>
                      <span className="text-sm font-semibold">{e.name}</span>
                    </Link>
                  ))}
                  <button onMouseDown={() => run(q)} className="flex w-full items-center gap-2 border-t border-paper-line px-4 py-2.5 text-sm font-semibold text-sky"><Search className="h-4 w-4" /> See all results for “{q}”</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {p.technologies.slice(0, 10).map((t) => (
              <button key={t.name} onClick={() => run(t.name)} className="chip border border-paper-line bg-white py-1.5 text-ink-soft transition hover:-translate-y-0.5 hover:shadow-card">
                <span className="h-2 w-2 rounded-full" style={{ background: langColor(t.name) }} /> {t.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {submitted ? (
        <section>
          <div className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto">
            {TYPES.map((t) => (
              <button key={t.key} onClick={() => setType(t.key)} className={cn("chip shrink-0 px-3.5 py-2 text-[13px]", type === t.key ? "bg-sky text-white" : "border border-paper-line bg-white text-ink-soft")}>{t.label}</button>
            ))}
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-sky" /></div>
          ) : total === 0 ? (
            <div className="card"><EmptyState icon={Search} accent="blue" title={`No results for “${submitted}”`} body="Try a broader term, a technology, or a university name." /></div>
          ) : (
            <div className="space-y-8">
              {!!results?.people?.length && (
                <div>
                  <SectionTitle title="Developers" icon={Users} accent="purple" />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {results.people.map((u) => (
                      <Link key={u.id} href={`/u/${u.username}`} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                        <Avatar name={u.name} src={u.image} size={48} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate font-bold">{u.name} {u.isSample && <SampleBadge />}</div>
                          <div className="truncate text-xs text-ink-mute">{u.headline || u.university}</div>
                          <div className="mt-1 flex gap-1">{u.languages.map((l) => <TechTag key={l} name={l} />)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {!!results?.projects?.length && (
                <div>
                  <SectionTitle title="Projects" icon={FolderKanban} accent="blue" />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {results.projects.map((pr) => (
                      <Link key={pr.id} href={`/projects/${pr.id}`} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-extrabold text-white", accentOf(pr.color).grad)}>{pr.title[0]}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 truncate font-bold">{pr.title} {pr.isListing && <span className="chip bg-coral-soft text-coral-deep">Hiring</span>}</div>
                          <div className="truncate text-xs text-ink-mute">{pr.tagline}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {!!results?.repos?.length && (
                <div>
                  <SectionTitle title="Repositories" icon={Github} />
                  <div className="grid gap-3 md:grid-cols-2">
                    {results.repos.map((r) => (
                      <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="card p-4 transition hover:shadow-lift">
                        <div className="font-mono text-sm font-bold">{r.fullName}</div>
                        <p className="mt-1 line-clamp-2 text-sm text-ink-mute">{r.description}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-ink-mute">
                          {r.language && <TechTag name={r.language} />}
                          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-sun" fill="#FFD65A" />{r.stars}</span>
                          <span>by @{r.owner}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {!!results?.events?.length && (
                <div>
                  <SectionTitle title="Hackathons & events" icon={CalendarDays} accent="green" />
                  <div className="grid gap-3 md:grid-cols-2">
                    {results.events.map((e) => (
                      <Link key={e.id} href={`/map?event=${e.id}`} className="card flex items-center gap-3 p-4 transition hover:shadow-lift">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-event-grad text-white"><CalendarDays className="h-5 w-5" /></span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 truncate font-bold">{e.name} {e.source === "sample" && <SampleBadge />}</div>
                          <div className="text-xs text-ink-mute">{formatDate(e.startsAt)} · {e.isOnline ? "Online" : e.city}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {!!results?.posts?.length && (
                <div>
                  <SectionTitle title="Posts" icon={MessageCircle} accent="orange" />
                  <div className="space-y-2">
                    {results.posts.map((po) => (
                      <Link key={po.id} href={`/post/${po.id}`} className="card flex gap-3 p-4 transition hover:shadow-lift">
                        <Avatar name={po.author.name} src={po.author.image} size={36} />
                        <div className="min-w-0">
                          <div className="text-sm font-bold">{po.author.name} <span className="font-normal text-ink-faint">· {timeAgo(po.createdAt)}</span></div>
                          <p className="line-clamp-2 text-sm text-ink-soft">{po.content}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <Discover {...p} onTech={run} />
      )}
    </div>
  );
}

function Discover({ trendingDevs, recommended, projects, technologies, events, newest, onTech }: Props & { onTech: (t: string) => void }) {
  const max = Math.max(1, ...technologies.map((t) => t.count));
  return (
    <div className="space-y-10">
      <section>
        <SectionTitle title="Trending builders" icon={TrendingUp} accent="coral" />
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
          {trendingDevs.map((u, i) => {
            const a = accentOf(u.accent);
            return (
              <motion.div key={u.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }} className="w-[200px] shrink-0">
                <Link href={`/u/${u.username}`} className="block overflow-hidden rounded-4xl bg-white shadow-card ring-1 ring-paper-line">
                  <div className={cn("relative flex h-24 items-end justify-center bg-gradient-to-br", a.grad)}>
                    <span className="absolute left-3 top-3 font-display text-xs font-extrabold text-white/80">#{i + 1}</span>
                    <div className="translate-y-8 rounded-full ring-4 ring-white"><Avatar name={u.name} src={u.image} size={64} /></div>
                  </div>
                  <div className="px-4 pb-4 pt-10 text-center">
                    <div className="truncate font-bold">{u.name}</div>
                    <div className="truncate text-xs text-ink-mute">{u.headline}</div>
                    <div className="mt-2 flex justify-center gap-1">{u.skills.slice(0, 2).map((s) => <TechTag key={s} name={s} />)}</div>
                    <div className="mt-2 text-xs font-semibold text-ink-soft">{compact(u.followers)} followers</div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <SectionTitle title="Trending projects" icon={FolderKanban} accent="blue" action={<Link href="/projects" className="text-xs font-bold text-sky">All →</Link>} />
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((pr) => (
              <Link key={pr.id} href={`/projects/${pr.id}`} className="group card overflow-hidden transition hover:-translate-y-1 hover:shadow-lift">
                <div className={cn("relative h-24 bg-gradient-to-br", accentOf(pr.color).grad)}>
                  <span className="absolute bottom-2 left-4 font-display text-2xl font-extrabold text-white">{pr.title}</span>
                  {pr.isListing && <span className="absolute right-3 top-3 chip bg-white/90 text-coral-deep">Hiring</span>}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm text-ink-mute">{pr.tagline}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-ink-soft"><Avatar name={pr.owner.name} src={pr.owner.image} size={22} />{pr.owner.name}</span>
                    <span className="flex items-center gap-1 text-xs font-bold"><Star className="h-3.5 w-3.5 text-sun" fill="#FFD65A" />{compact(pr.stars)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle title="Popular technologies" icon={Sparkles} accent="orange" />
          <div className="card space-y-2.5 p-5">
            {technologies.slice(0, 10).map((t) => (
              <button key={t.name} onClick={() => onTech(t.name)} className="group flex w-full items-center gap-3 text-left">
                <span className="w-24 truncate text-sm font-semibold group-hover:text-sky">{t.name}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-soft">
                  <motion.span className="block h-full rounded-full" style={{ background: langColor(t.name) }} initial={{ width: 0 }} animate={{ width: `${(t.count / max) * 100}%` }} transition={{ duration: 0.8 }} />
                </span>
                <span className="w-6 text-right text-xs font-bold text-ink-mute">{t.count}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionTitle title="Recommended collaborators" icon={Users} accent="purple" action={<Link href="/match" className="text-xs font-bold text-coral">Swipe →</Link>} />
          <div className="grid gap-3 sm:grid-cols-2">
            {recommended.map((u) => (
              <div key={u.id} className="card flex items-center gap-3 p-4">
                <Link href={`/u/${u.username}`}><Avatar name={u.name} src={u.image} size={48} online={isOnline(u.lastSeenAt)} /></Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${u.username}`} className="flex items-center gap-1.5 truncate font-bold hover:underline">{u.name}{u.isSample && <SampleBadge />}</Link>
                  <div className="truncate text-xs text-ink-mute">{u.reason}</div>
                </div>
                <span className="chip bg-grape-soft text-grape-deep">{u.score}%</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle title="Upcoming hackathons" icon={CalendarDays} accent="green" />
          <div className="space-y-2.5">
            {events.map((e) => (
              <Link key={e.id} href={`/map?event=${e.id}`} className="card flex items-center gap-3 p-3 transition hover:shadow-lift">
                <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-event-grad text-white">
                  <span className="text-[9px] font-bold uppercase">{formatDate(e.startsAt, { month: "short" })}</span>
                  <span className="font-display text-lg font-extrabold leading-none">{new Date(e.startsAt).getDate()}</span>
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-sm font-bold">{e.name}</div>
                  <div className="truncate text-xs text-ink-mute">{e.city} · {e.going} going</div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-7" />
          <SectionTitle title="New on Hackergram" icon={UserPlus} accent="cyan" />
          <div className="card space-y-1 p-2">
            {newest.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-paper-off">
                <Link href={`/u/${u.username}`}><Avatar name={u.name} src={u.image} size={36} /></Link>
                <Link href={`/u/${u.username}`} className="min-w-0 flex-1 truncate text-sm font-semibold">{u.name}</Link>
                <FollowButton userId={u.id} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
