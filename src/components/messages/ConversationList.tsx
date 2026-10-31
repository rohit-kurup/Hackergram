"use client";

import { motion } from "framer-motion";
import { Loader2, MessageCirclePlus, Search, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, isOnline } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client";
import { cn, timeAgo } from "@/lib/utils";
import type { ConversationRow } from "@/lib/messages";

export function ConversationList({ initial }: { initial: ConversationRow[] }) {
  const [items, setItems] = useState(initial);
  const [q, setQ] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const pathname = usePathname();
  const activeId = pathname.split("/")[2];

  useEffect(() => {
    const load = () => api("/api/conversations", { silent: true }).then((d) => setItems(d.conversations)).catch(() => {});
    const t = setInterval(load, 6000);
    load();
    return () => clearInterval(t);
  }, [activeId]);

  const shown = items.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <aside className={cn("flex w-full shrink-0 flex-col border-paper-line bg-white md:w-[340px] md:border-r", activeId && "hidden md:flex")}>
      <div className="p-4 pb-2">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">Messages</h1>
          <button onClick={() => setGroupOpen(true)} className="btn-ghost p-2" aria-label="New group chat" title="New group">
            <MessageCirclePlus className="h-5 w-5 text-aqua-deep" />
          </button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input className="input rounded-full bg-paper-off py-2.5 pl-10" placeholder="Search conversations" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {shown.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-mute">No conversations yet. Match with someone or join a project team to start chatting.</p>}
        {shown.map((c) => {
          const online = c.kind === "direct" && c.others[0] && isOnline(c.others[0].lastSeenAt);
          return (
            <Link key={c.id} href={`/messages/${c.id}`} className={cn("relative flex items-center gap-3 rounded-2xl p-3 transition-colors", activeId === c.id ? "bg-aqua-soft" : "hover:bg-paper-off")}>
              {c.kind === "direct" ? (
                <Avatar name={c.title} src={c.image} size={50} online={Boolean(online)} />
              ) : (
                <span className="relative flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#42C9E8] to-[#8257FF] text-white">
                  <Users className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-[15px]", c.unread ? "font-extrabold" : "font-semibold")}>{c.title}</span>
                  {c.last && <span className="shrink-0 text-[11px] text-ink-faint">{timeAgo(c.last.at)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("truncate text-[13px]", c.unread ? "font-semibold text-ink" : "text-ink-mute")}>
                    {c.last ? `${c.kind !== "direct" || c.last.sender === "You" ? `${c.last.sender}: ` : ""}${c.last.content}` : "Say hi 👋"}
                  </span>
                  {c.unread > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">
                      {c.unread}
                    </motion.span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <NewGroup open={groupOpen} onClose={() => setGroupOpen(false)} people={Array.from(new Map(items.flatMap((c) => c.others).map((o) => [o.id, o])).values())} />
    </aside>
  );
}

function NewGroup({ open, onClose, people }: { open: boolean; onClose: () => void; people: { id: string; name: string; image: string | null }[] }) {
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const create = async () => {
    setBusy(true);
    try {
      const { id } = await api("/api/conversations", { body: { title, memberIds: picked } });
      onClose();
      router.push(`/messages/${id}`);
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="New group chat">
      <input className="input" placeholder="Group name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      <p className="mb-2 mt-4 text-sm font-semibold text-ink-soft">Add people you&apos;ve chatted with</p>
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {people.length === 0 && <p className="text-sm text-ink-mute">Start a 1:1 conversation first.</p>}
        {people.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-2xl p-2 hover:bg-paper-off">
            <input type="checkbox" checked={picked.includes(p.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))} />
            <Avatar name={p.name} src={p.image} size={32} />
            <span className="text-sm font-semibold">{p.name}</span>
          </label>
        ))}
      </div>
      <button className="btn-primary mt-4 w-full" disabled={busy || !title.trim() || picked.length < 2} onClick={create}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create group ({picked.length})
      </button>
      {picked.length < 2 && <p className="mt-2 text-center text-xs text-ink-faint">Pick at least 2 people</p>}
    </Modal>
  );
}
