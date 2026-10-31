"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/Avatar";

export type MatchPayload = {
  conversationId: string | null;
  user: { id: string; name: string; username: string; image: string | null };
  sharedSkills: string[];
  sharedInterests: string[];
  complementary: string[];
  ideas: string[];
};

const COLORS = ["#8257FF", "#4285FF", "#FF668C", "#FF984F", "#35C98A", "#FFD65A", "#42C9E8"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 900,
        y: -(Math.random() * 500 + 200),
        r: Math.random() * 720 - 360,
        s: Math.random() * 0.6 + 0.6,
        c: COLORS[i % COLORS.length]!,
        round: i % 3 === 0,
        d: Math.random() * 0.25,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block"
          style={{ width: 10 * p.s, height: (p.round ? 10 : 16) * p.s, background: p.c, borderRadius: p.round ? 999 : 3 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 900], rotate: p.r, opacity: [1, 1, 0] }}
          transition={{ duration: 2.6, delay: p.d, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
}

export function MatchCelebration({ match, me, onClose }: { match: MatchPayload | null; me: { name: string; image: string | null }; onClose: () => void }) {
  return (
    <AnimatePresence>
      {match && (
        <motion.div
          className="fixed inset-0 z-[90] overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,#FF984F_0%,#FF668C_40%,#8257FF_100%)]" initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 0.6 }} />
          <div className="fixed inset-0 overflow-hidden"><Confetti /></div>
          <div className="relative flex min-h-full items-center justify-center px-4 py-10">
          <button onClick={onClose} className="fixed right-5 top-5 z-10 rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30" aria-label="Close">
            <X className="h-5 w-5" />
          </button>

          <div className="relative w-full max-w-md text-center text-white">
            <div className="relative mx-auto flex h-40 items-center justify-center">
              <motion.div initial={{ x: -160, rotate: -30, opacity: 0 }} animate={{ x: -38, rotate: -10, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 12, delay: 0.1 }} className="absolute rounded-full ring-[6px] ring-white">
                <Avatar name={me.name} src={me.image} size={124} />
              </motion.div>
              <motion.div initial={{ x: 160, rotate: 30, opacity: 0 }} animate={{ x: 38, rotate: 10, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 12, delay: 0.1 }} className="absolute rounded-full ring-[6px] ring-white">
                <Avatar name={match.user.name} src={match.user.image} size={124} />
              </motion.div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ delay: 0.45, duration: 0.5 }} className="absolute z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white text-3xl shadow-pop">
                💞
              </motion.div>
            </div>

            <motion.h2
              initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: -3 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 260, damping: 14 }}
              className="mt-4 font-display text-6xl font-extrabold italic tracking-tight drop-shadow-lg"
            >
              It&apos;s a match!
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-2 text-white/90">
              You and <b>{match.user.name}</b> both want to build together.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mt-6 space-y-3 rounded-[28px] bg-white p-5 text-left text-ink shadow-pop">
              {match.sharedSkills.length > 0 && (
                <Row label="Overlapping skills">
                  {match.sharedSkills.slice(0, 5).map((s) => <span key={s} className="chip bg-grape-soft text-grape-deep">{s}</span>)}
                </Row>
              )}
              {match.sharedInterests.length > 0 && (
                <Row label="Shared interests">
                  {match.sharedInterests.map((s) => <span key={s} className="chip bg-coral-soft text-coral-deep">{s}</span>)}
                </Row>
              )}
              {match.complementary.length > 0 && (
                <Row label={`${match.user.name.split(" ")[0]} brings`}>
                  {match.complementary.map((s) => <span key={s} className="chip bg-sky-soft text-sky-deep">{s}</span>)}
                </Row>
              )}
              <div>
                <div className="eyebrow mb-1.5 flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5 text-sun-deep" /> You could build</div>
                <ul className="space-y-1.5">
                  {match.ideas.map((i) => <li key={i} className="rounded-2xl bg-paper-off px-3 py-2 text-[13px] font-medium text-ink-soft">{i}</li>)}
                </ul>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95 }} className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              {match.conversationId && (
                <Link href={`/messages/${match.conversationId}`} className="btn flex-1 bg-white py-3.5 text-[15px] text-coral-deep shadow-lift hover:scale-[1.02]">
                  <MessageCircle className="h-5 w-5" /> Send a message
                </Link>
              )}
              <button onClick={onClose} className="btn flex-1 border-2 border-white/70 py-3.5 text-[15px] text-white hover:bg-white/10">
                Keep swiping
              </button>
            </motion.div>
          </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
