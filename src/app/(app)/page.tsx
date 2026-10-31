import { CalendarDays, Flame, Heart, MapPin, Sparkles, Star, Trophy, Users, Zap } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFeed } from "@/lib/feed";
import { recommendedUsers, trendingProjects } from "@/lib/recommend";
import { accentOf, cn, compact, formatDate, timeAgo } from "@/lib/utils";
import { Feed } from "@/components/feed/Feed";
import { ComposerPrompt } from "@/components/home/ComposerPrompt";
import { FollowButton } from "@/components/home/FollowButton";
import { Avatar, isOnline } from "@/components/ui/Avatar";
import { SampleBadge, SectionTitle } from "@/components/ui/primitives";

export default async function HomePage() {
  const me = await requireUser();
  const [feed, recs, trending, events, activity, stats] = await Promise.all([
    getFeed(me, "foryou"),
    recommendedUsers(me, 8),
    trendingProjects(4),
    db.hackathon.findMany({
      where: { status: "approved", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 3,
      include: { _count: { select: { attendance: true } } },
    }),
    communityActivity(),
    db.$transaction([db.user.count({ where: { onboarded: true } }), db.project.count({ where: { isListing: true, status: "open" } })]),
  ]);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto flex max-w-[1180px] gap-8 px-4 py-5 md:px-8 md:py-8">
      <div className="min-w-0 flex-1 lg:max-w-[640px]">
        {/* Hero */}
        <section className="relative mb-5 overflow-hidden rounded-4xl bg-white p-6 shadow-card">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-grape/15 blur-2xl" />
          <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-coral/15 blur-2xl" />
          <div className="relative">
            <p className="eyebrow">{greet}, {me.name.split(" ")[0]}</p>
            <h1 className="mt-1 text-[26px] font-extrabold leading-tight md:text-3xl">
              What are you <span className="bg-brand-grad bg-clip-text text-transparent">building</span> today?
            </h1>
            <ComposerPrompt />
            <div className="mt-5 grid grid-cols-3 gap-2">
              <QuickLink href="/match" icon={Heart} color="coral" title="Match" sub={`${recs.length ? "New faces" : "Discover"}`} />
              <QuickLink href="/projects" icon={Users} color="blue" title="Teams" sub={`${stats[1]} recruiting`} />
              <QuickLink href="/map" icon={MapPin} color="green" title="Events" sub={`${events.length ? "Upcoming" : "Explore map"}`} />
            </div>
          </div>
        </section>

        {/* Stories-style builder strip (mobile + tablet) */}
        {recs.length > 0 && (
          <section className="mb-5 lg:hidden">
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
              {recs.map((u) => (
                <Link key={u.id} href={`/u/${u.username}`} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
                  <Avatar name={u.name} src={u.image} size={60} ring online={isOnline(u.lastSeenAt)} />
                  <span className="w-full truncate text-center text-[11px] font-semibold text-ink-soft">{u.name.split(" ")[0]}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Feed initial={feed} />
      </div>

      {/* Right rail */}
      <aside className="hidden w-[340px] shrink-0 space-y-7 lg:block">
        <MatchTeaser people={recs.slice(0, 3)} />

        <section>
          <SectionTitle title="Upcoming hackathons" icon={Trophy} accent="green" action={<Link href="/map" className="text-xs font-bold text-mint-deep hover:underline">Map →</Link>} />
          <div className="space-y-2.5">
            {events.length === 0 && <p className="rounded-3xl bg-white p-4 text-sm text-ink-mute shadow-card">No upcoming events yet. <Link className="font-semibold text-mint-deep" href="/map">Submit one</Link></p>}
            {events.map((e, i) => (
              <Link key={e.id} href={`/map?event=${e.id}`} className="group flex items-center gap-3 rounded-3xl bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-white", i % 2 ? "bg-gradient-to-br from-[#FFD65A] to-[#FF984F]" : "bg-gradient-to-br from-[#35C98A] to-[#42C9E8]")}>
                  <span className="text-[10px] font-bold uppercase">{formatDate(e.startsAt, { month: "short" })}</span>
                  <span className="font-display text-xl font-extrabold leading-none">{new Date(e.startsAt).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold group-hover:text-mint-deep">{e.name}</span>
                    {e.source === "sample" && <SampleBadge />}
                  </div>
                  <div className="truncate text-xs text-ink-mute">{e.isOnline ? "Online" : e.city} · {e._count.attendance} going</div>
                  {e.prize && <div className="mt-0.5 text-xs font-semibold text-tang-deep">🏆 {e.prize}</div>}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="Trending projects" icon={Flame} accent="orange" action={<Link href="/projects" className="text-xs font-bold text-sky hover:underline">All →</Link>} />
          <div className="grid grid-cols-2 gap-2.5">
            {trending.map((p) => {
              const a = accentOf(p.color);
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="group overflow-hidden rounded-3xl bg-white shadow-card transition hover:-translate-y-1 hover:shadow-lift">
                  <div className={cn("relative flex h-20 items-end bg-gradient-to-br p-3", a.grad)}>
                    <span className="font-display text-3xl font-extrabold text-white/90">{p.title[0]}</span>
                    {p.isListing && <span className="absolute right-2 top-2 chip bg-white/90 text-[10px] text-coral-deep">Hiring</span>}
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-bold">{p.title}</div>
                    <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-ink-mute">
                      <span className="truncate">{p.tech[0] ?? "—"}</span>
                      <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-sun" fill="#FFD65A" />{compact(p.stars)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle title="Builders for you" icon={Sparkles} accent="purple" action={<Link href="/explore" className="text-xs font-bold text-grape hover:underline">More →</Link>} />
          <div className="space-y-1 rounded-3xl bg-white p-2 shadow-card">
            {recs.slice(0, 4).map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-paper-off">
                <Link href={`/u/${u.username}`}><Avatar name={u.name} src={u.image} size={42} online={isOnline(u.lastSeenAt)} /></Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${u.username}`} className="flex items-center gap-1.5 truncate text-sm font-bold hover:underline">
                    {u.name} {u.isSample && <SampleBadge />}
                  </Link>
                  <div className="truncate text-xs text-ink-mute">{u.reason}</div>
                </div>
                <FollowButton userId={u.id} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="Community pulse" icon={Zap} accent="cyan" />
          <div className="space-y-3 rounded-3xl bg-white p-4 shadow-card">
            {activity.length === 0 && <p className="text-sm text-ink-mute">Quiet for now.</p>}
            {activity.map((a) => (
              <div key={a.key} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                <p className="text-ink-soft">
                  <Link href={a.href} className="font-semibold text-ink hover:underline">{a.who}</Link> {a.what}
                  <span className="ml-1 text-xs text-ink-faint">{timeAgo(a.at)}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
        <p className="px-2 text-xs text-ink-faint">{stats[0]} builders on Hackergram · <Link href="/settings" className="hover:underline">Privacy</Link></p>
      </aside>
    </div>
  );
}

function QuickLink({ href, icon: Icon, color, title, sub }: { href: string; icon: typeof Heart; color: string; title: string; sub: string }) {
  const a = accentOf(color);
  return (
    <Link href={href} className="group rounded-2xl p-3 transition hover:-translate-y-0.5" style={{ background: a.soft }}>
      <Icon className="h-5 w-5 transition-transform group-hover:scale-110" style={{ color: a.solid }} />
      <div className="mt-2 text-sm font-bold">{title}</div>
      <div className="truncate text-[11px] font-medium text-ink-mute">{sub}</div>
    </Link>
  );
}

function MatchTeaser({ people }: { people: { id: string; name: string; image: string | null }[] }) {
  return (
    <Link href="/match" className="group relative block overflow-hidden rounded-4xl bg-match-grad p-5 text-white shadow-lift transition hover:-translate-y-1 hover:shadow-pop">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15" />
      <div className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-widest text-white/80">Hackergram Match</p>
        <h3 className="mt-1 text-xl font-extrabold leading-tight">Your next teammate<br />is one swipe away</h3>
      </div>
      <div className="relative mt-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-coral-deep transition group-hover:gap-2.5">
          <Heart className="h-4 w-4" fill="currentColor" /> Start swiping
        </span>
        <div className="flex -space-x-3">
          {people.map((p, i) => (
            <div key={p.id} className="rounded-full ring-[3px] ring-white/70" style={{ transform: `rotate(${(i - 1) * 8}deg)` }}>
              <Avatar name={p.name} src={p.image} size={40} />
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

async function communityActivity() {
  const [projects, matches, attend] = await Promise.all([
    db.project.findMany({ where: { isListing: true }, orderBy: { createdAt: "desc" }, take: 3, include: { owner: { select: { name: true, username: true } } } }),
    db.match.findMany({ orderBy: { createdAt: "desc" }, take: 2, include: { userA: { select: { name: true, username: true } }, userB: { select: { name: true } } } }),
    db.eventAttendance.findMany({ orderBy: { createdAt: "desc" }, take: 2, include: { user: { select: { name: true, username: true } }, hackathon: { select: { name: true } } } }),
  ]);
  return [
    ...projects.map((p) => ({ key: `p${p.id}`, who: p.owner.name, href: `/projects/${p.id}`, what: `is recruiting for ${p.title}`, at: p.createdAt, color: "#4285FF" })),
    ...matches.map((m) => ({ key: `m${m.id}`, who: m.userA.name, href: `/u/${m.userA.username}`, what: `matched with ${m.userB.name} 💞`, at: m.createdAt, color: "#FF668C" })),
    ...attend.map((a) => ({ key: `a${a.userId}${a.hackathonId}`, who: a.user.name, href: `/u/${a.user.username}`, what: `is going to ${a.hackathon.name}`, at: a.createdAt, color: "#35C98A" })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);
}
