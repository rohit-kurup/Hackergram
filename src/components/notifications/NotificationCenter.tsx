"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AtSign, Bell, CalendarClock, CheckCheck, Heart, MessageCircle, Rocket, Sparkles, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/primitives";
import { api } from "@/lib/client";
import { cn, timeAgo } from "@/lib/utils";

type N = { id: string; type: string; title: string; body: string; href: string; read: boolean; createdAt: string; actor: { name: string; image: string | null; username: string } | null };

const TYPE: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  follow: { icon: UserPlus, color: "#8257FF", label: "Follows" },
  match: { icon: Heart, color: "#FF668C", label: "Matches" },
  message: { icon: MessageCircle, color: "#42C9E8", label: "Messages" },
  like: { icon: Heart, color: "#FF668C", label: "Likes" },
  comment: { icon: AtSign, color: "#4285FF", label: "Comments" },
  invite: { icon: Rocket, color: "#FF984F", label: "Invites" },
  collab: { icon: Users, color: "#FF984F", label: "Collab" },
  team: { icon: Users, color: "#35C98A", label: "Teams" },
  reminder: { icon: CalendarClock, color: "#35C98A", label: "Events" },
  event: { icon: CalendarClock, color: "#35C98A", label: "Events" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "social", label: "Social", types: ["follow", "like", "comment"] },
  { key: "match", label: "Matches", types: ["match"] },
  { key: "teams", label: "Teams", types: ["invite", "collab", "team"] },
  { key: "events", label: "Events", types: ["reminder", "event"] },
];

export function NotificationCenter({ initial }: { initial: N[] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  // Poll for new notifications.
  useEffect(() => {
    const t = setInterval(() => api("/api/notifications", { silent: true }).then((d) => setItems(d.notifications)).catch(() => {}), 10_000);
    return () => clearInterval(t);
  }, []);

  const f = FILTERS.find((x) => x.key === filter)!;
  const shown = items.filter((n) => !("types" in f) || f.types!.includes(n.type));
  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    setItems((xs) => xs.map((x) => ({ ...x, read: true })));
    await api("/api/notifications", { body: {} }).catch(() => {});
    router.refresh();
  };
  const open = (n: N) => {
    if (!n.read) {
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      api("/api/notifications", { body: { id: n.id }, silent: true }).catch(() => {});
    }
  };

  const today = shown.filter((n) => Date.now() - +new Date(n.createdAt) < 864e5);
  const earlier = shown.filter((n) => Date.now() - +new Date(n.createdAt) >= 864e5);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTERS.map((x) => (
            <button key={x.key} onClick={() => setFilter(x.key)} className={cn("chip shrink-0 px-3.5 py-2 text-[13px]", filter === x.key ? "bg-ink text-white" : "border border-paper-line bg-white text-ink-soft")}>{x.label}</button>
          ))}
        </div>
        {unread > 0 && <button onClick={markAll} className="btn-ghost px-3 py-2 text-xs"><CheckCheck className="h-4 w-4" /> Mark all read ({unread})</button>}
      </div>
      {shown.length === 0 ? (
        <div className="card"><EmptyState icon={Sparkles} accent="orange" title="You're all caught up" body="When people follow you, match with you, or invite you to projects, it shows up here." /></div>
      ) : (
        <div className="space-y-6">
          {[["Today", today], ["Earlier", earlier]].map(([label, list]) =>
            (list as N[]).length ? (
              <div key={label as string}>
                <p className="eyebrow mb-2 px-1">{label as string}</p>
                <div className="card divide-y divide-paper-line overflow-hidden">
                  <AnimatePresence initial={false}>
                    {(list as N[]).map((n) => {
                      const t = TYPE[n.type] ?? { icon: Bell, color: "#8257FF", label: "" };
                      return (
                        <motion.div key={n.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                          <Link href={n.href || "#"} onClick={() => open(n)} className={cn("flex items-start gap-3 p-4 transition-colors hover:bg-paper-off", !n.read && "bg-tang-soft/40")}>
                            <span className="relative shrink-0">
                              {n.actor ? <Avatar name={n.actor.name} src={n.actor.image} size={44} /> : <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: `${t.color}1f` }}><t.icon className="h-5 w-5" style={{ color: t.color }} /></span>}
                              {n.actor && (
                                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white" style={{ background: t.color }}>
                                  <t.icon className="h-3 w-3 text-white" fill={n.type === "match" || n.type === "like" ? "white" : "none"} />
                                </span>
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-[15px]", !n.read ? "font-bold" : "font-medium")}>{n.title}</p>
                              {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-ink-mute">{n.body}</p>}
                              <p className="mt-1 text-xs text-ink-faint">{timeAgo(n.createdAt)}</p>
                            </div>
                            {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-tang" />}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
