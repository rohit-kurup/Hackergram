/* eslint-disable @next/next/no-img-element */
import { Briefcase, Clock, GitPullRequest, Github, GraduationCap, MapPin, Sparkles, Star, Zap } from "lucide-react";
import { SampleBadge } from "@/components/ui/primitives";
import { accentOf, cn, compact, initials, langColor } from "@/lib/utils";
import type { DeckCard } from "@/lib/deck";

/**
 * A "collectible character card" for a developer: hero art, a match-score gem,
 * trading-card stat bars from GitHub, and their best projects as mini tiles.
 */
export function DeveloperCard({ card }: { card: DeckCard }) {
  const a = accentOf(card.accent);
  const skills = [...card.languages, ...card.technologies];
  const gh = card.github;

  return (
    <div className="flex h-full w-full select-none flex-col overflow-hidden rounded-[34px] bg-white shadow-pop ring-1 ring-black/5">
      {/* Hero */}
      <div className={cn("relative shrink-0 overflow-hidden bg-gradient-to-br px-5 pb-5 pt-4", a.grad)} style={{ height: "40%" }}>
        {/* decorative pattern */}
        <svg className="absolute inset-0 h-full w-full opacity-[.16]" aria-hidden>
          <defs>
            <pattern id={`dots-${card.id}`} width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.6" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#dots-${card.id})`} />
        </svg>
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/20" />
        <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10" />

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <span className="chip bg-white/25 text-white backdrop-blur"><Clock className="h-3 w-3" /> {card.availability}</span>
            {card.isSample && <SampleBadge className="border-white/60 bg-white/20 text-white" />}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1 rounded-2xl bg-white px-2.5 py-1.5 shadow-lift">
              <Sparkles className="h-3.5 w-3.5" style={{ color: a.solid }} />
              <span className="font-display text-lg font-extrabold leading-none" style={{ color: a.text }}>{card.score}%</span>
            </div>
            {card.superLikedYou && <span className="chip bg-sky text-white shadow"><Star className="h-3 w-3" fill="white" /> Super-liked you</span>}
          </div>
        </div>

        <div className="relative mt-2 flex items-end gap-4">
          <div className="relative shrink-0">
            <div className="h-[104px] w-[104px] rotate-[-4deg] overflow-hidden rounded-[30px] border-4 border-white bg-white shadow-lift">
              {card.image ? (
                <img src={card.image} alt={card.name} draggable={false} className="h-full w-full object-cover" />
              ) : (
                <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br font-display text-4xl font-extrabold text-white", a.grad)}>
                  {initials(card.name)}
                </div>
              )}
            </div>
            {card.lookingForCollab && (
              <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-mint text-white ring-4 ring-white" title="Looking for collaborators">
                <Zap className="h-4 w-4" fill="white" />
              </span>
            )}
          </div>
          <div className="min-w-0 pb-1 text-white">
            <h2 className="truncate text-[26px] font-extrabold leading-tight drop-shadow-sm">{card.name}</h2>
            <p className="line-clamp-2 text-[13px] font-medium text-white/90">{card.headline || `@${card.username}`}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden px-5 pb-5 pt-4">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] font-semibold text-ink-soft">
          {card.university && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5 text-grape" />{card.university}{card.gradYear ? ` '${String(card.gradYear).slice(2)}` : ""}</span>}
          {card.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-mint" />{card.location}</span>}
          {card.company && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 text-tang" />{card.company}</span>}
        </div>

        {/* Trading-card stats */}
        {gh && (
          <div className="rounded-3xl bg-paper-off p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                <Github className="h-3.5 w-3.5" /> {gh.username ? `@${gh.username}` : "GitHub"} {gh.sample && "· sample stats"}
              </span>
              <Spark data={gh.recent} color={a.solid} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Contribs" value={gh.contributions} icon={<Zap className="h-3 w-3 text-mint" />} />
              <Stat label="Stars" value={gh.stars} icon={<Star className="h-3 w-3 text-sun" fill="#FFD65A" />} />
              <Stat label="PRs merged" value={gh.prs} icon={<GitPullRequest className="h-3 w-3 text-grape" />} />
            </div>
            {gh.langs.length > 0 && (
              <div className="mt-2.5 flex h-2 overflow-hidden rounded-full">
                {gh.langs.map((l) => <span key={l.name} title={`${l.name} ${l.pct}%`} style={{ width: `${l.pct}%`, background: langColor(l.name) }} />)}
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 7).map((s) => {
            const shared = card.shared.some((x) => x.toLowerCase() === s.toLowerCase());
            return (
              <span
                key={s}
                className={cn("chip border py-1", shared ? "border-transparent text-white" : "border-paper-line bg-white text-ink-soft")}
                style={shared ? { background: langColor(s) } : undefined}
              >
                {!shared && <span className="h-2 w-2 rounded-full" style={{ background: langColor(s) }} />}
                {s}
              </span>
            );
          })}
        </div>

        {/* Best projects */}
        {card.projects.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {card.projects.map((p) => {
              const pa = accentOf(p.color);
              return (
                <div key={p.id} className="flex items-center gap-2.5 rounded-2xl border border-paper-line p-2">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-display text-lg font-extrabold text-white", pa.grad)}>{p.title[0]}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold">{p.title}</div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-ink-mute"><Star className="h-3 w-3 text-sun" fill="#FFD65A" />{compact(p.stars)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Why */}
        <div className="mt-auto space-y-1.5">
          {card.reasons.slice(0, 2).map((r) => (
            <div key={r} className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
              <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: a.soft }}>
                <Sparkles className="h-3 w-3" style={{ color: a.solid }} />
              </span>
              {r}
            </div>
          ))}
          {card.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {card.interests.slice(0, 4).map((i) => (
                <span key={i} className="chip" style={{ background: a.soft, color: a.text }}>#{i.replace(/\s*\/\s*/g, "").replace(/\s+/g, "")}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | null; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-2.5 py-2 shadow-sm">
      <div className="font-display text-lg font-extrabold leading-none">{value == null ? "—" : compact(value)}</div>
      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink-mute">{icon}{label}</div>
    </div>
  );
}

function Spark({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-4 items-end gap-[2px]" aria-label="Last 4 weeks of activity">
      {data.map((v, i) => (
        <span key={i} className="w-[3px] rounded-full" style={{ height: `${Math.max(12, (v / max) * 100)}%`, background: v ? color : "#E4E3EC" }} />
      ))}
    </div>
  );
}
