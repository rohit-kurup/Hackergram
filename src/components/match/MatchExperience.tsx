"use client";

import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { FolderKanban, Heart, Loader2, MessageCircle, RefreshCw, RotateCcw, Sparkles, Star, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { DeckCard } from "@/lib/deck";
import { DeveloperCard } from "./DeveloperCard";
import { MatchCelebration, type MatchPayload } from "./MatchCelebration";

type Dir = "left" | "right" | "super";
type CardHandle = { swipe: (d: Dir) => void };

export function MatchExperience({
  initialCards,
  initialContext,
  projects,
  me,
  matches: initialMatches,
}: {
  initialCards: DeckCard[];
  initialContext: string;
  projects: { id: string; title: string; isListing: boolean }[];
  me: { name: string; image: string | null };
  matches: { id: string; conversationId: string | null; user: { id: string; name: string; image: string | null } }[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [context, setContext] = useState(initialContext);
  const [history, setHistory] = useState<DeckCard[]>([]);
  const [match, setMatch] = useState<MatchPayload | null>(null);
  const [matches, setMatches] = useState(initialMatches);
  const [loading, setLoading] = useState(false);
  const topRef = useRef<CardHandle>(null);
  const locked = useRef(false);
  const router = useRouter();
  const projectMode = context !== "global";

  const loadDeck = useCallback(async (ctx: string) => {
    setLoading(true);
    try {
      const d = await api(`/api/match?context=${ctx}`);
      setCards(d.cards);
      setHistory([]);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const switchContext = (ctx: string) => {
    setContext(ctx);
    router.replace(ctx === "global" ? "/match" : `/match?project=${ctx}`, { scroll: false });
    loadDeck(ctx);
  };

  const commit = useCallback(
    async (card: DeckCard, direction: Dir) => {
      setCards((cs) => cs.filter((c) => c.id !== card.id));
      setHistory((h) => [card, ...h].slice(0, 10));
      locked.current = false;
      try {
        const r = await api("/api/match", { body: { targetId: card.id, direction, context } });
        if (r.matched) {
          setMatch(r.match);
          setMatches((m) => [{ id: card.id, conversationId: r.match.conversationId, user: { id: card.id, name: card.name, image: card.image } }, ...m]);
        } else if (r.invited) toast(`Invited ${card.name.split(" ")[0]} to your project 🚀`);
        else if (direction === "super") toast.info(`Super Like sent to ${card.name.split(" ")[0]} ⭐`);
      } catch {
        // Put the card back if the swipe didn't save.
        setCards((cs) => [card, ...cs]);
      }
    },
    [context],
  );

  const press = useCallback((d: Dir) => {
    if (locked.current || !topRef.current) return;
    locked.current = true;
    topRef.current.swipe(d);
  }, []);

  const undo = async () => {
    const last = history[0];
    if (!last) return;
    try {
      await api(`/api/match?context=${context}`, { method: "DELETE" });
      setHistory((h) => h.slice(1));
      setCards((cs) => [last, ...cs]);
    } catch {}
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (match || (e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === "ArrowLeft") press("left");
      if (e.key === "ArrowRight") press("right");
      if (e.key === "ArrowUp") press("super");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, match]);

  const visible = cards.slice(0, 3);

  return (
    <div className="relative mx-auto max-w-[1180px] px-4 py-4 md:px-8 md:py-8">
      {/* soft backdrop */}
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-coral/25 via-tang/15 to-grape/15 blur-3xl" />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-center">
        <div className="mx-auto w-full max-w-[410px] lg:mx-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-extrabold md:text-[28px]">
                <span className="bg-match-grad bg-clip-text text-transparent">Match</span>
                <Heart className="h-6 w-6 text-coral" fill="#FF668C" />
              </h1>
              <p className="text-xs text-ink-mute md:text-sm">{projectMode ? "Recruiting for your project" : "Swipe right on people you'd build with"}</p>
            </div>
            <div className="relative">
              <select
                className="input w-[172px] appearance-none truncate rounded-full py-2 pl-9 pr-4 text-[13px] font-semibold"
                value={context}
                onChange={(e) => switchContext(e.target.value)}
                aria-label="Discovery mode"
              >
                <option value="global">Discover people</option>
                {projects.map((p) => <option key={p.id} value={p.id}>For: {p.title}</option>)}
              </select>
              {projectMode ? <FolderKanban className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky" /> : <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coral" />}
            </div>
          </div>

          {/* Deck */}
          <div className="relative h-[clamp(470px,calc(100dvh-290px),660px)] md:h-[clamp(500px,calc(100dvh-220px),640px)]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-coral" /></div>
            )}
            {!loading && cards.length === 0 && (
              <div className="flex h-full items-center justify-center rounded-[34px] border-2 border-dashed border-coral/30 bg-white/70">
                <EmptyState icon={Sparkles} accent="coral" title="You've seen everyone for now" body={projectMode ? "No more candidates for this project. Try discovering people or check back as new builders join." : "New builders join every day. Check back soon, or recruit for a specific project."}>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button className="btn-outline" onClick={() => loadDeck(context)}><RefreshCw className="h-4 w-4" /> Refresh</button>
                    {!projectMode && <Link href="/projects/new" className="btn-primary">Post a project</Link>}
                  </div>
                </EmptyState>
              </div>
            )}
            <AnimatePresence>
              {visible
                .map((card, i) => (
                  <SwipeCard
                    key={card.id}
                    card={card}
                    index={i}
                    ref={i === 0 ? topRef : undefined}
                    onSwiped={(d) => commit(card, d)}
                  />
                ))
                .reverse()}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="mt-5 flex items-center justify-center gap-4">
            <RoundBtn onClick={undo} disabled={!history.length} size={46} label="Undo" className="text-sun-deep">
              <RotateCcw className="h-5 w-5" />
            </RoundBtn>
            <RoundBtn onClick={() => press("left")} disabled={!cards.length} size={64} label="Pass" className="text-ink-mute hover:text-ink">
              <X className="h-8 w-8" strokeWidth={3} />
            </RoundBtn>
            <RoundBtn onClick={() => press("super")} disabled={!cards.length} size={52} label="Super Like" className="text-sky">
              <Star className="h-6 w-6" fill="#4285FF" />
            </RoundBtn>
            <motion.button
              whileHover={{ scale: 1.08, y: -3 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => press("right")}
              disabled={!cards.length}
              aria-label="Interested"
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-match-grad text-white shadow-[0_14px_30px_-8px_rgba(255,102,140,.65)] disabled:opacity-40"
            >
              <Heart className="h-8 w-8" fill="white" />
            </motion.button>
          </div>
          <p className="mt-3 hidden text-center text-xs text-ink-faint md:block">Tip: use ← → ↑ on your keyboard</p>
        </div>

        {/* Side panel */}
        <aside className="w-full space-y-5 lg:w-[320px]">
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Your matches</h2>
              <span className="chip bg-coral-soft text-coral-deep">{matches.length}</span>
            </div>
            {matches.length === 0 ? (
              <p className="text-sm text-ink-mute">No matches yet. When someone you liked likes you back, they&apos;ll show up here.</p>
            ) : (
              <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
                {matches.map((m) => (
                  <Link key={m.id} href={m.conversationId ? `/messages/${m.conversationId}` : "/messages"} className="group flex w-16 shrink-0 flex-col items-center gap-1 lg:w-auto">
                    <span className="relative">
                      <Avatar name={m.user.name} src={m.user.image} size={54} ring />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow"><MessageCircle className="h-3 w-3 text-coral" /></span>
                    </span>
                    <span className="w-full truncate text-center text-[11px] font-semibold text-ink-soft group-hover:text-ink">{m.user.name.split(" ")[0]}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="bg-gradient-to-br from-sky-soft to-aqua-soft p-5">
              <FolderKanban className="h-6 w-6 text-sky" />
              <h3 className="mt-2 font-bold">Recruit for a project</h3>
              <p className="mt-1 text-sm text-ink-soft">Swipe through people ranked by the skills your project needs. A right swipe sends them an invite.</p>
            </div>
            <div className="p-4">
              {projects.length ? (
                <div className="flex flex-wrap gap-2">
                  {projects.slice(0, 4).map((p) => (
                    <button key={p.id} onClick={() => switchContext(p.id)} className={cn("chip py-1.5", context === p.id ? "bg-sky text-white" : "bg-sky-soft text-sky-deep")}>
                      {p.title}
                    </button>
                  ))}
                  {projectMode && <button onClick={() => switchContext("global")} className="chip bg-paper-soft py-1.5 text-ink-soft">Back to people</button>}
                </div>
              ) : (
                <Link href="/projects/new" className="btn-outline w-full">Create a project listing</Link>
              )}
            </div>
          </div>

          <div className="hidden rounded-3xl border border-dashed border-paper-line p-5 text-sm text-ink-mute lg:block">
            <p className="font-semibold text-ink-soft">How matching works</p>
            <p className="mt-1">We rank people by shared and complementary skills, interests, school, distance and availability. The % on each card is that score, and the reasons are shown underneath. No black box.</p>
          </div>
        </aside>
      </div>

      <MatchCelebration match={match} me={me} onClose={() => setMatch(null)} />
    </div>
  );
}

function SwipeCard({ card, index, onSwiped, ref }: { card: DeckCard; index: number; onSwiped: (d: Dir) => void; ref?: Ref<CardHandle> }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
  const likeOpacity = useTransform(x, [30, 130], [0, 1]);
  const nopeOpacity = useTransform(x, [-130, -30], [1, 0]);
  const superOpacity = useTransform(y, [-140, -40], [1, 0]);
  const isTop = index === 0;
  const done = useRef(false);

  const fly = useCallback(
    (d: Dir) => {
      if (done.current) return;
      done.current = true;
      const w = typeof window !== "undefined" ? window.innerWidth : 1000;
      const opts = { type: "tween" as const, duration: 0.38, ease: [0.4, 0, 0.6, 1] as const };
      if (d === "super") animate(y, -1100, opts).then(() => onSwiped(d));
      else animate(x, d === "right" ? w * 1.1 : -w * 1.1, opts).then(() => onSwiped(d));
    },
    [onSwiped, x, y],
  );

  useImperativeHandle(ref, () => ({ swipe: fly }), [fly]);

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, y, rotate, zIndex: 10 - index, touchAction: isTop ? "none" : "auto" }}
      initial={{ scale: 0.9, y: 30, opacity: 0 }}
      animate={{ scale: 1 - index * 0.045, y: index * 16, opacity: index > 2 ? 0 : 1 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      drag={isTop}
      dragElastic={0.7}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      whileDrag={{ cursor: "grabbing", scale: 1.02 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120 || info.velocity.x > 700) fly("right");
        else if (info.offset.x < -120 || info.velocity.x < -700) fly("left");
        else if (info.offset.y < -130 || info.velocity.y < -800) fly("super");
      }}
    >
      <div className={cn("relative h-full", isTop && "cursor-grab")}>
        <DeveloperCard card={card} />
        {isTop && (
          <>
            <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-6 top-24 -rotate-12 rounded-2xl border-[5px] border-mint bg-white/85 px-4 py-1.5 font-display text-3xl font-extrabold tracking-wide text-mint shadow-lift">
              LET&apos;S BUILD
            </motion.div>
            <motion.div style={{ opacity: nopeOpacity }} className="pointer-events-none absolute right-6 top-24 rotate-12 rounded-2xl border-[5px] border-coral bg-white/85 px-4 py-1.5 font-display text-3xl font-extrabold tracking-wide text-coral shadow-lift">
              PASS
            </motion.div>
            <motion.div style={{ opacity: superOpacity }} className="pointer-events-none absolute inset-x-0 bottom-32 mx-auto w-fit rounded-2xl border-[5px] border-sky bg-white/85 px-4 py-1.5 font-display text-3xl font-extrabold tracking-wide text-sky shadow-lift">
              SUPER ⭐
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function RoundBtn({ children, onClick, disabled, size, label, className }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; size: number; label: string; className?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -3 }}
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn("flex items-center justify-center rounded-full bg-white shadow-lift ring-1 ring-black/5 transition-colors disabled:opacity-40", className)}
      style={{ width: size, height: size }}
    >
      {children}
    </motion.button>
  );
}
