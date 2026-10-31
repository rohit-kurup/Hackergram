"use client";

import { motion } from "framer-motion";
import { Bell, Compass, FolderKanban, Heart, Home, Map, MessageCircle, PenSquare, Plus, Settings, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Logo, LogoMark } from "@/components/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Composer } from "@/components/feed/Composer";
import { cn } from "@/lib/utils";

export type Me = { id: string; name: string; username: string; image: string | null; githubUsername: string | null };

type ShellCtx = { me: Me; openComposer: (preset?: ComposerPreset) => void };
export type ComposerPreset = { kind?: string; content?: string; projectId?: string; hackathonId?: string; repoUrl?: string };
const Ctx = createContext<ShellCtx | null>(null);
export const useShell = () => useContext(Ctx)!;

const NAV = [
  { href: "/", label: "Home", icon: Home, color: "#8257FF" },
  { href: "/explore", label: "Explore", icon: Compass, color: "#4285FF" },
  { href: "/match", label: "Match", icon: Heart, color: "#FF668C" },
  { href: "/projects", label: "Projects", icon: FolderKanban, color: "#4285FF" },
  { href: "/map", label: "Hackathon Map", icon: Map, color: "#35C98A" },
  { href: "/messages", label: "Messages", icon: MessageCircle, color: "#42C9E8", badge: "messages" as const },
  { href: "/notifications", label: "Notifications", icon: Bell, color: "#FF984F", badge: "notifications" as const },
  { href: "/ai", label: "AI Assistant", icon: Sparkles, color: "#8257FF" },
];

const MOBILE_NAV = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/match", icon: Heart, label: "Match" },
  { href: "/messages", icon: MessageCircle, label: "Messages", badge: "messages" as const },
  { href: "/me", icon: User, label: "Profile" },
];

function useCounts() {
  const [counts, setCounts] = useState({ notifications: 0, messages: 0 });
  const pathname = usePathname();
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/counts")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setCounts(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pathname]);
  return counts;
}

export function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  const pathname = usePathname();
  const counts = useCounts();
  const [composer, setComposer] = useState<{ open: boolean; preset?: ComposerPreset }>({ open: false });
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const meHref = `/u/${me.username}`;
  // The chat thread view takes the full screen on mobile.
  const immersive = /^\/messages\/.+/.test(pathname);

  return (
    <Ctx.Provider value={{ me, openComposer: (preset) => setComposer({ open: true, preset }) }}>
      <div className="min-h-screen">
        {/* Desktop / tablet sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[84px] flex-col border-r border-paper-line bg-white px-3 py-5 md:flex xl:w-[260px] xl:px-5">
          <Link href="/" className="mb-8 flex justify-center xl:justify-start xl:px-2">
            <span className="xl:hidden"><LogoMark size={40} /></span>
            <span className="hidden xl:inline-flex"><Logo /></span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((n) => {
              const on = active(n.href);
              const badge = n.badge ? counts[n.badge] : 0;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  title={n.label}
                  className={cn(
                    "group relative flex items-center justify-center gap-3.5 rounded-2xl px-3 py-3 text-[15px] font-semibold transition-colors xl:justify-start",
                    on ? "text-ink" : "text-ink-soft hover:bg-paper-off hover:text-ink",
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: `${n.color}14` }}
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className="relative">
                    <n.icon className="h-[22px] w-[22px] transition-transform group-hover:scale-110" style={{ color: on ? n.color : undefined }} strokeWidth={on ? 2.4 : 2} />
                    {badge > 0 && (
                      <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white ring-2 ring-white">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </span>
                  <span className="relative hidden xl:inline">{n.label}</span>
                </Link>
              );
            })}
            <Link
              href={meHref}
              title="My Profile"
              className={cn(
                "relative flex items-center justify-center gap-3.5 rounded-2xl px-3 py-2.5 text-[15px] font-semibold xl:justify-start",
                active(meHref) ? "bg-grape-soft text-ink" : "text-ink-soft hover:bg-paper-off",
              )}
            >
              <Avatar name={me.name} src={me.image} size={24} />
              <span className="hidden xl:inline">My Profile</span>
            </Link>
            <Link
              href="/settings"
              title="Settings"
              className={cn(
                "flex items-center justify-center gap-3.5 rounded-2xl px-3 py-3 text-[15px] font-semibold xl:justify-start",
                active("/settings") ? "bg-paper-soft text-ink" : "text-ink-soft hover:bg-paper-off",
              )}
            >
              <Settings className="h-[22px] w-[22px]" />
              <span className="hidden xl:inline">Settings</span>
            </Link>
          </nav>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setComposer({ open: true })}
            className="btn-brand mt-4 h-12 w-full px-0 text-[15px]"
            title="Create post"
          >
            <PenSquare className="h-5 w-5" />
            <span className="hidden xl:inline">Create Post</span>
          </motion.button>
        </aside>

        {/* Mobile top bar */}
        {!immersive && (
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-paper-line bg-white/85 px-4 py-3 backdrop-blur-xl md:hidden">
            <Link href="/"><Logo size={30} /></Link>
            <div className="flex items-center gap-1">
              <Link href="/map" className="btn-ghost p-2" aria-label="Hackathon map"><Map className="h-5 w-5 text-mint" /></Link>
              <Link href="/ai" className="btn-ghost p-2" aria-label="AI assistant"><Sparkles className="h-5 w-5 text-grape" /></Link>
              <Link href="/notifications" className="btn-ghost relative p-2" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {counts.notifications > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-white" />}
              </Link>
            </div>
          </header>
        )}

        <main className={cn("md:pl-[84px] xl:pl-[260px]", !immersive && "pb-24 md:pb-0")}>
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            {children}
          </motion.div>
        </main>

        {/* Mobile bottom nav */}
        {!immersive && (
          <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-[28px] border border-paper-line bg-white/90 px-2 py-2 shadow-lift backdrop-blur-xl md:hidden">
            {MOBILE_NAV.slice(0, 2).map((n) => (
              <MobileTab key={n.href} href={n.href} icon={n.icon} label={n.label} on={active(n.href)} />
            ))}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setComposer({ open: true })}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-grad text-white shadow-glow"
              aria-label="Create post"
            >
              <Plus className="h-6 w-6" strokeWidth={2.6} />
            </motion.button>
            {MOBILE_NAV.slice(2).map((n) => (
              <MobileTab
                key={n.href}
                icon={n.icon}
                label={n.label}
                href={n.href === "/me" ? meHref : n.href}
                on={active(n.href === "/me" ? meHref : n.href)}
                badge={n.badge ? counts[n.badge] : 0}
              />
            ))}
          </nav>
        )}

        <Composer open={composer.open} preset={composer.preset} onClose={() => setComposer({ open: false })} />
      </div>
    </Ctx.Provider>
  );
}

function MobileTab({ href, icon: Icon, label, on, badge = 0 }: { href: string; icon: typeof Home; label: string; on: boolean; badge?: number }) {
  return (
    <Link href={href} aria-label={label} className="relative flex h-12 w-12 items-center justify-center">
      {on && <motion.span layoutId="m-tab" className="absolute inset-1 rounded-2xl bg-grape-soft" />}
      <Icon className={cn("relative h-6 w-6", on ? "text-grape" : "text-ink-mute")} strokeWidth={on ? 2.4 : 2} fill={on && label === "Match" ? "#8257FF" : "none"} />
      {badge > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-white" />}
    </Link>
  );
}
