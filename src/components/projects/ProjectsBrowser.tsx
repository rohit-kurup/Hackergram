"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "framer-motion";
import { Clock, FolderKanban, Globe, MapPin, Plus, Search, Sparkles, Sprout, Star, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, SampleBadge, TechTag } from "@/components/ui/primitives";
import { accentOf, cn, compact, timeAgo } from "@/lib/utils";

type P = {
  id: string; title: string; tagline: string; color: string; thumbnail: string | null; category: string; stars: number; tech: string[];
  isListing: boolean; rolesNeeded: string[]; requiredSkills: string[]; stage: string; commitment: string; remote: boolean; location: string;
  beginnerFriendly: boolean; teamSize: number; owner: { id: string; name: string; username: string; image: string | null; isSample: boolean };
  members: { name: string; image: string | null }[]; createdAt: string; fit: number | null;
};

const STAGES = ["Idea", "Prototype", "MVP", "Launched"];
const STAGE_COLOR: Record<string, string> = { Idea: "#FFD65A", Prototype: "#FF984F", MVP: "#4285FF", Launched: "#35C98A" };

export function ProjectsBrowser({ projects, meId }: { projects: P[]; meId: string }) {
  const [tab, setTab] = useState<"recruiting" | "showcase" | "mine">("recruiting");
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [remote, setRemote] = useState(false);
  const [beginner, setBeginner] = useState(false);
  const [sort, setSort] = useState<"fit" | "new" | "stars">("fit");

  const list = useMemo(() => {
    const term = q.toLowerCase();
    let xs = projects.filter((p) => (tab === "recruiting" ? p.isListing : tab === "mine" ? p.owner.id === meId : true));
    if (term) xs = xs.filter((p) => `${p.title} ${p.tagline} ${p.tech.join(" ")} ${p.requiredSkills.join(" ")} ${p.rolesNeeded.join(" ")} ${p.category}`.toLowerCase().includes(term));
    if (stage) xs = xs.filter((p) => p.stage === stage);
    if (remote) xs = xs.filter((p) => p.remote);
    if (beginner) xs = xs.filter((p) => p.beginnerFriendly);
    return [...xs].sort((a, b) =>
      sort === "stars" ? b.stars - a.stars : sort === "new" || tab !== "recruiting" ? +new Date(b.createdAt) - +new Date(a.createdAt) : (b.fit ?? 0) - (a.fit ?? 0),
    );
  }, [projects, tab, q, stage, remote, beginner, sort, meId]);

  return (
    <div>
      {/* Hero CTA */}
      <div className="relative mb-6 overflow-hidden rounded-4xl bg-project-grad p-6 text-white shadow-lift md:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15" />
        <div className="absolute bottom-0 right-24 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-lg">
            <h2 className="text-2xl font-extrabold md:text-3xl">Got an idea? Recruit your dream team.</h2>
            <p className="mt-1 text-white/85">Post what you&apos;re building and the roles you need. We&apos;ll surface builders whose skills fit.</p>
          </div>
          <Link href="/projects/new" className="btn bg-white px-5 py-3 text-sky-deep shadow-lift hover:scale-[1.03]">
            <Plus className="h-4 w-4" /> New project
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full bg-white p-1 shadow-card">
          {(["recruiting", "showcase", "mine"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("relative rounded-full px-4 py-2 text-sm font-semibold capitalize", tab === t ? "text-white" : "text-ink-soft")}>
              {tab === t && <motion.span layoutId="proj-tab" className="absolute inset-0 rounded-full bg-sky" />}
              <span className="relative">{t === "mine" ? "My projects" : t}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input className="input rounded-full py-2.5 pl-10" placeholder="Search by skill, role, or idea…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {STAGES.map((s) => (
          <button key={s} onClick={() => setStage(stage === s ? "" : s)} className={cn("chip shrink-0 border py-1.5", stage === s ? "border-transparent text-ink" : "border-paper-line bg-white text-ink-soft")} style={stage === s ? { background: `${STAGE_COLOR[s]}33` } : undefined}>
            <span className="h-2 w-2 rounded-full" style={{ background: STAGE_COLOR[s] }} /> {s}
          </button>
        ))}
        <button onClick={() => setRemote(!remote)} className={cn("chip shrink-0 border py-1.5", remote ? "border-transparent bg-aqua-soft text-aqua-deep" : "border-paper-line bg-white text-ink-soft")}><Globe className="h-3 w-3" /> Remote</button>
        <button onClick={() => setBeginner(!beginner)} className={cn("chip shrink-0 border py-1.5", beginner ? "border-transparent bg-mint-soft text-mint-deep" : "border-paper-line bg-white text-ink-soft")}><Sprout className="h-3 w-3" /> Beginner friendly</button>
        {tab === "recruiting" && (
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="chip ml-auto shrink-0 border border-paper-line bg-white py-1.5 outline-none">
            <option value="fit">Best fit for me</option>
            <option value="new">Newest</option>
            <option value="stars">Most stars</option>
          </select>
        )}
      </div>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState icon={FolderKanban} accent="blue" title="No projects match" body="Try different filters, or start your own.">
            <Link href="/projects/new" className="btn-primary"><Plus className="h-4 w-4" /> New project</Link>
          </EmptyState>
        </div>
      ) : tab === "recruiting" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence>{list.map((p, i) => <ListingCard key={p.id} p={p} i={i} />)}</AnimatePresence>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>{list.map((p, i) => <ShowcaseCard key={p.id} p={p} i={i} />)}</AnimatePresence>
        </div>
      )}
    </div>
  );
}

/** Recruiting listing: a "help wanted" poster with open role slots. */
function ListingCard({ p, i }: { p: P; i: number }) {
  const a = accentOf(p.color);
  const open = Math.max(0, p.teamSize - p.members.length);
  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }} whileHover={{ y: -4 }}>
      <Link href={`/projects/${p.id}`} className="card group flex h-full flex-col overflow-hidden hover:shadow-lift">
        <div className="flex items-start gap-4 p-5 pb-4">
          <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-2xl font-extrabold text-white shadow-card transition-transform group-hover:rotate-[-6deg]", a.grad)}>{p.title[0]}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-bold">{p.title}</h3>
              {p.owner.isSample && <SampleBadge />}
            </div>
            <p className="line-clamp-2 text-sm text-ink-mute">{p.tagline}</p>
          </div>
          {p.fit != null && (
            <div className="shrink-0 rounded-2xl bg-grape-soft px-2.5 py-1.5 text-center">
              <div className="font-display text-lg font-extrabold leading-none text-grape-deep">{p.fit}%</div>
              <div className="text-[9px] font-bold uppercase text-grape">fit</div>
            </div>
          )}
        </div>
        <div className="px-5">
          <div className="eyebrow mb-2">Looking for</div>
          <div className="flex flex-wrap gap-1.5">
            {p.rolesNeeded.map((r) => <span key={r} className="chip border border-dashed border-coral/50 bg-coral-soft py-1 text-coral-deep"><Plus className="h-3 w-3" />{r}</span>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{p.requiredSkills.slice(0, 5).map((t) => <TechTag key={t} name={t} />)}</div>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-paper-line px-5 py-3 text-xs font-semibold text-ink-mute">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: STAGE_COLOR[p.stage] }} />{p.stage}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{p.commitment}</span>
          <span className="flex items-center gap-1">{p.remote ? <><Globe className="h-3.5 w-3.5" />Remote</> : <><MapPin className="h-3.5 w-3.5" />{p.location || "In person"}</>}</span>
          {p.beginnerFriendly && <span className="flex items-center gap-1 text-mint-deep"><Sprout className="h-3.5 w-3.5" />Beginners welcome</span>}
          <span className="ml-auto flex items-center gap-2">
            <span className="flex -space-x-2">
              {p.members.slice(0, 3).map((m, j) => <span key={j} className="rounded-full ring-2 ring-white"><Avatar name={m.name} src={m.image} size={24} /></span>)}
              {Array.from({ length: Math.min(open, 3) }).map((_, j) => <span key={`o${j}`} className="h-6 w-6 rounded-full border-2 border-dashed border-ink-faint bg-white" />)}
            </span>
            <span><Users className="mr-0.5 inline h-3.5 w-3.5" />{p.members.length}/{p.teamSize}</span>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function ShowcaseCard({ p, i }: { p: P; i: number }) {
  const a = accentOf(p.color);
  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }} whileHover={{ y: -5 }}>
      <Link href={`/projects/${p.id}`} className="group block overflow-hidden rounded-4xl bg-white shadow-card ring-1 ring-paper-line hover:shadow-lift">
        <div className={cn("relative h-40 overflow-hidden bg-gradient-to-br", a.grad)}>
          {p.thumbnail ? (
            <img src={p.thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          ) : (
            <>
              <span className="absolute -bottom-6 -right-2 font-display text-[140px] font-extrabold leading-none text-white/20">{p.title[0]}</span>
              <span className="absolute bottom-4 left-5 font-display text-2xl font-extrabold text-white">{p.title}</span>
            </>
          )}
          <span className="absolute left-4 top-4 chip bg-white/90 text-ink">{p.category}</span>
          {p.isListing && <span className="absolute right-4 top-4 chip bg-coral text-white"><Sparkles className="h-3 w-3" /> Hiring</span>}
        </div>
        <div className="p-5">
          <h3 className="text-lg font-bold">{p.title}</h3>
          <p className="mt-1 line-clamp-2 min-h-[40px] text-sm text-ink-mute">{p.tagline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{p.tech.slice(0, 3).map((t) => <TechTag key={t} name={t} />)}</div>
          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
              <Avatar name={p.owner.name} src={p.owner.image} size={26} /> {p.owner.name.split(" ")[0]}
            </span>
            <span className="flex items-center gap-1 text-sm font-bold"><Star className="h-4 w-4 text-sun" fill="#FFD65A" />{compact(p.stars)}</span>
          </div>
          <div className="mt-1 text-right text-[11px] text-ink-faint">{timeAgo(p.createdAt)}</div>
        </div>
      </Link>
    </motion.div>
  );
}
