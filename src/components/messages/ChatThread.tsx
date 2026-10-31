"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCheck, FolderKanban, GitFork, Github, ImagePlus, Loader2, Plus, Rocket, Send, Star, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, isOnline } from "@/components/ui/Avatar";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { accentOf, cn, langColor } from "@/lib/utils";
import type { ChatMessage } from "@/lib/messages";

type Member = { id: string; name: string; username: string; image: string | null; headline: string; lastSeenAt: string };

export function ChatThread({
  id, meId, kind, projectId, title, members, initialMessages, initialReads, myProjects,
}: {
  id: string; meId: string; kind: string; projectId: string | null; title: string; members: Member[];
  initialMessages: ChatMessage[]; initialReads: Record<string, string>; myProjects: { id: string; title: string }[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [reads, setReads] = useState(initialReads);
  const [typing, setTyping] = useState<string[]>([]);
  const [online, setOnline] = useState<string[]>(members.filter((m) => isOnline(m.lastSeenAt)).map((m) => m.id));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attach, setAttach] = useState<null | "menu" | "repo" | "invite">(null);
  const [repoUrl, setRepoUrl] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastTyping = useRef(0);
  const latest = useRef(initialMessages.at(-1)?.createdAt ?? null);
  const direct = kind === "direct";
  const other = members[0];

  const scrollDown = (smooth = true) => requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: smooth ? "smooth" : "auto" }));

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((xs) => {
      const seen = new Set(xs.map((x) => x.id));
      const add = incoming.filter((m) => !seen.has(m.id));
      return add.length ? [...xs, ...add] : xs;
    });
    latest.current = incoming.at(-1)!.createdAt;
    scrollDown();
  }, []);

  // Poll for new messages, typing and read receipts.
  useEffect(() => {
    scrollDown(false);
    let alive = true;
    const poll = async () => {
      try {
        const d = await api(`/api/conversations/${id}${latest.current ? `?after=${encodeURIComponent(latest.current)}` : ""}`, { silent: true });
        if (!alive) return;
        merge(d.messages);
        setTyping(d.typing);
        setReads(d.reads);
        setOnline(d.online);
      } catch {}
    };
    const t = setInterval(poll, 2500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id, merge]);

  const send = async (body: Record<string, unknown>) => {
    setSending(true);
    try {
      const { message } = await api(`/api/conversations/${id}`, { body });
      merge([message]);
      return true;
    } catch {
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendText = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    if (!(await send({ kind: "text", content: t }))) setText(t);
  };

  const onType = (v: string) => {
    setText(v);
    if (Date.now() - lastTyping.current > 2500) {
      lastTyping.current = Date.now();
      fetch(`/api/conversations/${id}`, { method: "PUT" }).catch(() => {});
    }
  };

  const upload = async (file: File) => {
    setAttach(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (!res.ok) return toast.error(d.error);
    await send({ kind: "image", url: d.url, content: "" });
  };

  // Last message of mine that each other member has read.
  // Read receipts, Instagram-style: only shown when the latest message is yours.
  const last = messages.at(-1);
  const seenBy = last && last.senderId === meId ? members.filter((m) => reads[m.id] && reads[m.id]! >= last.createdAt) : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white md:static md:z-auto md:h-full">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-paper-line px-3 py-3 md:px-5">
        <Link href="/messages" className="btn-ghost p-2 md:hidden" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
        {direct && other ? (
          <Link href={`/u/${other.username}`} className="flex min-w-0 items-center gap-3">
            <Avatar name={other.name} src={other.image} size={42} online={online.includes(other.id)} />
            <div className="min-w-0">
              <div className="truncate font-bold">{title}</div>
              <div className="truncate text-xs text-ink-mute">{typing.length ? <span className="text-aqua-deep">typing…</span> : online.includes(other.id) ? "Active now" : other.headline}</div>
            </div>
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#42C9E8] to-[#8257FF] text-white"><Users className="h-5 w-5" /></span>
            <div className="min-w-0">
              <div className="truncate font-bold">{title}</div>
              <div className="truncate text-xs text-ink-mute">{typing.length ? <span className="text-aqua-deep">{typing.join(", ")} typing…</span> : `${members.length + 1} members · ${online.length} online`}</div>
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!direct && <div className="hidden -space-x-2 sm:flex">{members.slice(0, 4).map((m) => <span key={m.id} className="rounded-full ring-2 ring-white"><Avatar name={m.name} src={m.image} size={28} /></span>)}</div>}
          {projectId && <Link href={`/projects/${projectId}`} className="btn-ghost p-2" aria-label="Open project"><FolderKanban className="h-5 w-5 text-sky" /></Link>}
        </div>
      </header>

      {/* Messages */}
      <div ref={scroller} className="flex-1 overflow-y-auto bg-gradient-to-b from-paper-off/60 to-white px-3 py-5 md:px-6">
        <div className="mx-auto max-w-2xl space-y-1">
          {messages.map((m, i) => {
            const mine = m.senderId === meId;
            const prev = messages[i - 1];
            const grouped = prev && prev.senderId === m.senderId && +new Date(m.createdAt) - +new Date(prev.createdAt) < 5 * 60_000 && prev.kind !== "system";
            const showTime = !prev || +new Date(m.createdAt) - +new Date(prev.createdAt) > 30 * 60_000;
            if (m.kind === "system")
              return (
                <div key={m.id} className="py-3 text-center">
                  <span className="chip bg-gradient-to-r from-coral-soft to-grape-soft px-3 py-1.5 text-ink-soft">{m.content}</span>
                </div>
              );
            return (
              <div key={m.id}>
                {showTime && <div className="py-3 text-center text-[11px] font-semibold text-ink-faint">{new Date(m.createdAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>}
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", !grouped && "mt-2")}>
                  {!mine && <span className="w-7 shrink-0">{!grouped && <Avatar name={m.sender.name} src={m.sender.image} size={28} />}</span>}
                  <div className={cn("max-w-[78%]", mine && "items-end")}>
                    {!mine && !direct && !grouped && <div className="mb-0.5 ml-3 text-[11px] font-semibold text-ink-mute">{m.sender.name}</div>}
                    <Bubble m={m} mine={mine} />
                  </div>
                </motion.div>
              </div>
            );
          })}
          {seenBy.length > 0 && (
            <div className="flex items-center justify-end gap-1 pt-1 text-[11px] font-semibold text-ink-faint">
              <CheckCheck className="h-3.5 w-3.5 text-aqua" /> Seen{!direct && ` by ${seenBy.map((s) => s.name.split(" ")[0]).join(", ")}`}
            </div>
          )}
          <AnimatePresence>
            {typing.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 pt-2">
                <span className="w-7" />
                <span className="flex gap-1 rounded-3xl rounded-bl-md bg-paper-soft px-4 py-3">
                  {[0, 1, 2].map((d) => <motion.span key={d} className="h-2 w-2 rounded-full bg-ink-faint" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15 }} />)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Composer */}
      <div className="relative border-t border-paper-line bg-white px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5">
        <AnimatePresence>
          {attach && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-3 mb-2 w-[min(360px,calc(100%-24px))] rounded-3xl border border-paper-line bg-white p-3 shadow-lift">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold">{attach === "repo" ? "Share a repository" : attach === "invite" ? "Invite to a project" : "Attach"}</span>
                <button onClick={() => setAttach(null)} aria-label="Close"><X className="h-4 w-4 text-ink-mute" /></button>
              </div>
              {attach === "menu" && (
                <div className="grid grid-cols-3 gap-2">
                  <AttachBtn icon={ImagePlus} color="#35C98A" label="Photo" onClick={() => fileRef.current?.click()} />
                  <AttachBtn icon={Github} color="#15131F" label="Repo" onClick={() => setAttach("repo")} />
                  <AttachBtn icon={Rocket} color="#FF668C" label="Invite" onClick={() => setAttach("invite")} />
                </div>
              )}
              {attach === "repo" && (
                <form onSubmit={async (e) => { e.preventDefault(); if (await send({ kind: "repo", url: repoUrl.trim() })) { setRepoUrl(""); setAttach(null); } }} className="flex gap-2">
                  <input className="input py-2" autoFocus placeholder="https://github.com/owner/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
                  <button className="btn-primary" disabled={sending}>Send</button>
                </form>
              )}
              {attach === "invite" && (
                <div className="space-y-1">
                  {myProjects.length === 0 && <p className="text-sm text-ink-mute">Create a project first.</p>}
                  {myProjects.map((p) => (
                    <button key={p.id} onClick={async () => { if (await send({ kind: "invite", projectId: p.id })) setAttach(null); }} className="flex w-full items-center gap-2 rounded-2xl p-2 text-left text-sm font-semibold hover:bg-paper-off">
                      <FolderKanban className="h-4 w-4 text-sky" /> {p.title}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <button onClick={() => setAttach(attach ? null : "menu")} className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition", attach ? "rotate-45 bg-ink text-white" : "bg-paper-soft text-ink-soft hover:bg-paper-line")} aria-label="Attach">
            <Plus className="h-5 w-5" />
          </button>
          <textarea
            rows={1}
            value={text}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText();
              }
            }}
            placeholder="Message…"
            maxLength={4000}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-3xl border border-paper-line bg-paper-off px-4 py-2.5 text-[15px] outline-none focus:border-aqua focus:bg-white"
          />
          <motion.button whileTap={{ scale: 0.88 }} onClick={sendText} disabled={!text.trim() || sending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#42C9E8] to-[#8257FF] text-white shadow-glow disabled:opacity-40" aria-label="Send">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function AttachBtn({ icon: Icon, color, label, onClick }: { icon: typeof Github; color: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl p-3 hover:bg-paper-off">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${color}18` }}><Icon className="h-5 w-5" style={{ color }} /></span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

function Bubble({ m, mine }: { m: ChatMessage; mine: boolean }) {
  const base = cn("rounded-3xl px-4 py-2.5 text-[15px] leading-snug", mine ? "rounded-br-md bg-gradient-to-br from-[#8257FF] to-[#6A45F0] text-white" : "rounded-bl-md bg-paper-soft text-ink");
  if (m.kind === "image")
    return (
      <a href={m.meta.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-3xl border border-paper-line">
        <img src={m.meta.url} alt="Shared" className="max-h-72 max-w-full object-cover" />
      </a>
    );
  if (m.kind === "repo")
    return (
      <a href={m.meta.url} target="_blank" rel="noopener noreferrer" className="block w-72 max-w-full overflow-hidden rounded-3xl border border-paper-line bg-white text-ink shadow-card">
        <div className="flex items-center gap-2 bg-ink px-4 py-2.5 text-white"><Github className="h-4 w-4" /><span className="truncate font-mono text-sm">{m.meta.fullName}</span></div>
        <div className="p-3.5">
          {m.meta.description && <p className="line-clamp-2 text-sm text-ink-soft">{m.meta.description}</p>}
          <div className="mt-2 flex gap-3 text-xs font-semibold text-ink-mute">
            {m.meta.language && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: langColor(m.meta.language) }} />{m.meta.language}</span>}
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-sun" fill="#FFD65A" />{m.meta.stars}</span>
            <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{m.meta.forks}</span>
          </div>
        </div>
      </a>
    );
  if (m.kind === "invite") {
    const a = accentOf(m.meta.color);
    return (
      <div className="w-72 max-w-full overflow-hidden rounded-3xl border border-paper-line bg-white text-ink shadow-card">
        <div className={cn("bg-gradient-to-br p-4 text-white", a.grad)}>
          <Rocket className="h-5 w-5" />
          <div className="mt-2 text-xs font-bold uppercase tracking-wider text-white/80">Project invite</div>
          <div className="text-lg font-extrabold">{m.meta.title}</div>
        </div>
        <div className="p-3.5">
          {m.meta.tagline && <p className="text-sm text-ink-soft">{m.meta.tagline}</p>}
          <Link href={`/projects/${m.meta.projectId}`} className="btn-primary mt-3 w-full py-2 text-xs">{mine ? "View project" : "View & accept"}</Link>
        </div>
      </div>
    );
  }
  return <div className={cn(base, "whitespace-pre-wrap break-words")}>{m.content}</div>;
}
