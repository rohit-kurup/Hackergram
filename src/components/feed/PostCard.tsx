"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, CalendarDays, GitFork, Github, Heart, Loader2, MessageCircle, MoreHorizontal, Repeat2, Send, Share2, Star, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { SampleBadge, TechTag } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { useShell } from "@/components/shell/AppShell";
import { api } from "@/lib/client";
import { accentOf, cn, compact, formatDate, langColor, timeAgo } from "@/lib/utils";
import type { FeedPost } from "@/lib/feed";
import { POST_KINDS } from "./Composer";

type Inner = Omit<FeedPost, "liked" | "bookmarked" | "counts" | "repostOf">;

export function PostCard({ post, onDeleted, defaultOpenComments = false }: { post: FeedPost; onDeleted?: (id: string) => void; defaultOpenComments?: boolean }) {
  const { me } = useShell();
  const isRepost = Boolean(post.repostOf);
  const shown: Inner = post.repostOf ?? post;
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.counts.likes);
  const [saved, setSaved] = useState(post.bookmarked);
  const [reposts, setReposts] = useState(post.counts.reposts);
  const [comments, setComments] = useState(post.counts.comments);
  const [showComments, setShowComments] = useState(defaultOpenComments);
  const [menu, setMenu] = useState(false);
  const [burst, setBurst] = useState(0);
  const kind = POST_KINDS.find((k) => k.kind === shown.kind) ?? POST_KINDS[0];
  const targetId = isRepost ? post.repostOf!.id : post.id;

  const like = async () => {
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
    if (!liked) setBurst((b) => b + 1);
    try {
      const r = await api(`/api/posts/${targetId}/like`, { method: "POST" });
      setLiked(r.active);
      setLikes(r.count);
    } catch {
      setLiked(liked);
    }
  };
  const save = async () => {
    setSaved(!saved);
    const r = await api(`/api/posts/${targetId}/bookmark`, { method: "POST" }).catch(() => null);
    if (r) {
      setSaved(r.active);
      toast(r.active ? "Saved to bookmarks" : "Removed from bookmarks");
    }
  };
  const repost = async () => {
    const r = await api(`/api/posts/${targetId}/repost`, { method: "POST" }).catch(() => null);
    if (r) {
      setReposts(r.count);
      toast(r.active ? "Reposted to your followers" : "Repost removed");
    }
  };
  const share = async () => {
    const url = `${location.origin}/post/${targetId}`;
    if (navigator.share) await navigator.share({ url, title: "Hackergram post" }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    }
  };
  const del = async () => {
    await api(`/api/posts/${post.id}`, { method: "DELETE" });
    toast("Post deleted");
    onDeleted?.(post.id);
  };
  const follow = async () => {
    const r = await api(`/api/users/${shown.author.id}/follow`, { method: "POST" }).catch(() => null);
    if (r) toast(r.following ? `Following ${shown.author.name}` : `Unfollowed ${shown.author.name}`);
    setMenu(false);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="card overflow-hidden transition-shadow hover:shadow-lift"
    >
      {isRepost && (
        <div className="flex items-center gap-2 px-5 pt-3.5 text-xs font-semibold text-ink-mute">
          <Repeat2 className="h-3.5 w-3.5 text-mint" /> {post.author.id === me.id ? "You" : post.author.name} reposted
        </div>
      )}
      <div className="flex items-start gap-3 px-5 pt-4">
        <Link href={`/u/${shown.author.username}`}>
          <Avatar name={shown.author.name} src={shown.author.image} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link href={`/u/${shown.author.username}`} className="truncate font-bold hover:underline">{shown.author.name}</Link>
            {shown.author.isSample && <SampleBadge />}
            <span className="text-sm text-ink-faint">· {timeAgo(shown.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-ink-mute">
            <span className="truncate">{shown.author.headline || `@${shown.author.username}`}</span>
          </div>
        </div>
        <span className="chip shrink-0" style={{ background: `${kind.color}14`, color: kind.color }}>
          <kind.icon className="h-3 w-3" /> {kind.label}
        </span>
        <div className="relative">
          <button className="btn-ghost -mr-2 p-1.5" onClick={() => setMenu(!menu)} aria-label="More">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-2xl border border-paper-line bg-white py-1 shadow-lift"
                onMouseLeave={() => setMenu(false)}
              >
                {shown.author.id !== me.id && (
                  <button onClick={follow} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-paper-off">
                    <UserPlus className="h-4 w-4" /> Follow / unfollow
                  </button>
                )}
                <Link href={`/post/${targetId}`} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-paper-off">
                  <MessageCircle className="h-4 w-4" /> Open post
                </Link>
                {post.author.id === me.id && (
                  <button onClick={del} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-coral-deep hover:bg-coral-soft">
                    <Trash2 className="h-4 w-4" /> {isRepost ? "Undo repost" : "Delete post"}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {shown.content && <p className="whitespace-pre-wrap break-words px-5 pt-3 text-[15px] leading-relaxed text-ink">{linkify(shown.content)}</p>}

      {shown.imageUrl && (
        <div className="mt-3 px-5">
          <img src={shown.imageUrl} alt="" className="max-h-[480px] w-full rounded-3xl border border-paper-line object-cover" loading="lazy" />
        </div>
      )}

      {shown.repoPreview && <RepoCard repo={shown.repoPreview} />}
      {shown.project && <ProjectPreview p={shown.project} />}
      {shown.hackathon && (
        <Link href={`/map?event=${shown.hackathon.id}`} className="mx-5 mt-3 flex items-center gap-3 rounded-2xl bg-event-grad/10 p-3 transition hover:shadow-card" style={{ background: "linear-gradient(135deg,#E7F8F0,#FFF8DD)" }}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white"><CalendarDays className="h-5 w-5 text-mint" /></span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{shown.hackathon.name}</div>
            <div className="text-xs text-ink-mute">{formatDate(shown.hackathon.startsAt)} · {shown.hackathon.isOnline ? "Online" : shown.hackathon.city}</div>
          </div>
        </Link>
      )}

      <div className="mt-3 flex items-center gap-1 border-t border-paper-line px-3 py-1.5">
        <Action onClick={like} active={liked} color="#FF668C" label={likes ? compact(likes) : ""} aria="Like">
          <span className="relative">
            <motion.span key={burst} initial={burst ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="block">
              <Heart className="h-[19px] w-[19px]" fill={liked ? "#FF668C" : "none"} />
            </motion.span>
            <AnimatePresence>
              {burst > 0 && liked && (
                <motion.span key={`b${burst}`} className="pointer-events-none absolute inset-0 rounded-full border-2 border-coral" initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 2.4, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
              )}
            </AnimatePresence>
          </span>
        </Action>
        <Action onClick={() => setShowComments(!showComments)} active={showComments} color="#4285FF" label={comments ? compact(comments) : ""} aria="Comments">
          <MessageCircle className="h-[19px] w-[19px]" />
        </Action>
        <Action onClick={repost} color="#35C98A" label={reposts ? compact(reposts) : ""} aria="Repost">
          <Repeat2 className="h-[19px] w-[19px]" />
        </Action>
        <div className="flex-1" />
        <Action onClick={share} color="#8257FF" aria="Share">
          <Share2 className="h-[18px] w-[18px]" />
        </Action>
        <Action onClick={save} active={saved} color="#FF984F" aria="Bookmark">
          <Bookmark className="h-[19px] w-[19px]" fill={saved ? "#FF984F" : "none"} />
        </Action>
      </div>
      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Comments postId={targetId} onCount={setComments} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function Action({ children, onClick, active, color, label, aria }: { children: React.ReactNode; onClick: () => void; active?: boolean; color: string; label?: string; aria: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      aria-label={aria}
      className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-mute transition-colors"
      style={active ? { color } : undefined}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}12`;
        e.currentTarget.style.color = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = active ? color : "";
      }}
    >
      {children}
      {label}
    </motion.button>
  );
}

export function RepoCard({ repo }: { repo: NonNullable<FeedPost["repoPreview"]> }) {
  return (
    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="mx-5 mt-3 block overflow-hidden rounded-3xl border border-paper-line transition hover:shadow-lift">
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#15131F] to-[#2f2a52] px-4 py-3 text-white">
        <Github className="h-5 w-5" />
        <span className="truncate font-mono text-sm font-semibold">{repo.fullName}</span>
      </div>
      <div className="p-4">
        {repo.description && <p className="text-sm text-ink-soft">{repo.description}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-semibold text-ink-mute">
          {repo.language && (
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: langColor(repo.language) }} />{repo.language}</span>
          )}
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-sun" fill="#FFD65A" />{compact(repo.stars)}</span>
          <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" />{compact(repo.forks)}</span>
          {repo.topics?.map((t) => <span key={t} className="chip bg-sky-soft text-sky-deep">{t}</span>)}
          {!repo.verified && <span className="text-ink-faint">preview unavailable</span>}
        </div>
      </div>
    </a>
  );
}

function ProjectPreview({ p }: { p: NonNullable<FeedPost["project"]> }) {
  const a = accentOf(p.color);
  return (
    <Link href={`/projects/${p.id}`} className="mx-5 mt-3 flex overflow-hidden rounded-3xl border border-paper-line transition hover:shadow-lift">
      <div className={cn("relative w-28 shrink-0 bg-gradient-to-br sm:w-36", a.grad)}>
        {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-full w-full object-cover" /> : <span className="absolute inset-0 flex items-center justify-center font-display text-4xl font-extrabold text-white/90">{p.title[0]}</span>}
      </div>
      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-center gap-2">
          <span className="truncate font-bold">{p.title}</span>
          {p.isListing && <span className="chip bg-coral-soft text-coral-deep">Recruiting</span>}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-ink-mute">{p.tagline}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.tech.slice(0, 3).map((t) => <TechTag key={t} name={t} />)}
        </div>
      </div>
    </Link>
  );
}

function Comments({ postId, onCount }: { postId: string; onCount: (n: number) => void }) {
  const { me } = useShell();
  const [items, setItems] = useState<{ id: string; content: string; parentId: string | null; createdAt: string; author: { name: string; username: string; image: string | null } }[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api(`/api/posts/${postId}/comments`, { silent: true }).then((d) => setItems(d.comments)).catch(() => setItems([]));
  }, [postId]);
  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const { comment } = await api(`/api/posts/${postId}/comments`, { body: { content: text, parentId: replyTo?.id ?? null } });
      const next = [...(items ?? []), comment];
      setItems(next);
      onCount(next.length);
      setText("");
      setReplyTo(null);
    } catch {
    } finally {
      setSending(false);
    }
  };
  const roots = (items ?? []).filter((c) => !c.parentId);
  const replies = (id: string) => (items ?? []).filter((c) => c.parentId === id);

  return (
    <div className="border-t border-paper-line bg-paper-off/60 px-5 py-4">
      {items === null ? (
        <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" /></div>
      ) : (
        <div className="space-y-3">
          {roots.length === 0 && <p className="text-center text-sm text-ink-mute">No comments yet. Start the conversation 💬</p>}
          {roots.map((c) => (
            <div key={c.id}>
              <CommentRow c={c} onReply={() => setReplyTo({ id: c.id, name: c.author.name })} />
              <div className="ml-11 mt-2 space-y-2 border-l-2 border-paper-line pl-3">
                {replies(c.id).map((r) => <CommentRow key={r.id} c={r} small />)}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <Avatar name={me.name} src={me.image} size={32} />
        <div className="relative flex-1">
          {replyTo && (
            <button onClick={() => setReplyTo(null)} className="mb-1 text-xs font-semibold text-grape">
              Replying to {replyTo.name} · cancel
            </button>
          )}
          <input
            className="input rounded-full py-2.5 pr-12"
            placeholder="Add a comment…"
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button onClick={send} disabled={sending || !text.trim()} className="absolute bottom-1.5 right-1.5 rounded-full bg-grape p-2 text-white disabled:opacity-40" aria-label="Send comment">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentRow({ c, onReply, small }: { c: { content: string; createdAt: string; author: { name: string; username: string; image: string | null } }; onReply?: () => void; small?: boolean }) {
  return (
    <div className="flex gap-2.5">
      <Avatar name={c.author.name} src={c.author.image} size={small ? 26 : 32} />
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-2xl rounded-tl-md bg-white px-3.5 py-2 shadow-sm">
          <Link href={`/u/${c.author.username}`} className="text-[13px] font-bold hover:underline">{c.author.name}</Link>
          <p className="break-words text-sm text-ink-soft">{c.content}</p>
        </div>
        <div className="mt-1 flex gap-3 px-2 text-[11px] font-semibold text-ink-faint">
          <span>{timeAgo(c.createdAt)}</span>
          {onReply && <button onClick={onReply} className="hover:text-grape">Reply</button>}
        </div>
      </div>
    </div>
  );
}

function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s]+|#[\w-]+)/g).map((part, i) => {
    if (/^https?:\/\//.test(part))
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-sky hover:underline">{part}</a>;
    if (/^#[\w-]+$/.test(part)) return <Link key={i} href={`/explore?q=${encodeURIComponent(part.slice(1))}`} className="font-semibold text-grape">{part}</Link>;
    return part;
  });
}
