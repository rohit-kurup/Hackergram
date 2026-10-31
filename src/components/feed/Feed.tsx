"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Compass, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { FeedPost } from "@/lib/feed";
import { PostCard } from "./PostCard";

const FILTERS = [
  { key: "foryou", label: "For You", color: "#8257FF" },
  { key: "following", label: "Following", color: "#4285FF" },
  { key: "projects", label: "Projects", color: "#42C9E8" },
  { key: "discussions", label: "Discussions", color: "#FF984F" },
  { key: "local", label: "Local", color: "#35C98A" },
  { key: "hackathons", label: "Hackathons", color: "#FF668C" },
];

export function Feed({ initial }: { initial: { posts: FeedPost[]; nextCursor: string | null } }) {
  const [filter, setFilter] = useState("foryou");
  const [posts, setPosts] = useState(initial.posts);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [needsLocation, setNeedsLocation] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const load = useCallback(async (f: string, c: string | null, replace: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const d = await api(`/api/posts?filter=${f}${c ? `&cursor=${c}` : ""}`);
      setPosts((p) => (replace ? d.posts : [...p, ...d.posts]));
      setCursor(d.nextCursor);
      setNeedsLocation(Boolean(d.needsLocation));
    } catch {
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  // Refresh after posting from the global composer.
  useEffect(() => {
    const h = () => load(filter, null, true);
    window.addEventListener("hg:posted", h);
    return () => window.removeEventListener("hg:posted", h);
  }, [filter, load]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && cursor && load(filter, cursor, false), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, filter, load]);

  const pick = (f: string) => {
    if (f === filter) return;
    setFilter(f);
    setPosts([]);
    load(f, null, true);
  };

  return (
    <div>
      <div className="no-scrollbar sticky top-[61px] z-20 -mx-4 mb-4 flex gap-1.5 overflow-x-auto bg-paper-off/85 px-4 py-2 backdrop-blur-xl md:top-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => pick(f.key)}
            className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors", filter === f.key ? "text-white" : "text-ink-soft hover:bg-white")}
          >
            {filter === f.key && <motion.span layoutId="feed-filter" className="absolute inset-0 rounded-full" style={{ background: f.color }} transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative">{f.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onDeleted={(id) => setPosts((xs) => xs.filter((x) => x.id !== id))} />
          ))}
        </AnimatePresence>
        {loading && posts.length === 0 && [0, 1, 2].map((i) => <PostSkeleton key={i} />)}
        {!loading && posts.length === 0 &&
          (needsLocation ? (
            <div className="card">
              <EmptyState icon={MapPin} accent="green" title="Set your location to see local builders" body="Add your city in Settings and we'll show posts from developers near you.">
                <Link href="/settings" className="btn-primary">Add location</Link>
              </EmptyState>
            </div>
          ) : (
            <div className="card">
              <EmptyState icon={Compass} title="Nothing here yet" body={filter === "following" ? "Follow some builders to fill your feed." : "Be the first to post in this space."}>
                <Link href="/explore" className="btn-primary">Explore builders</Link>
              </EmptyState>
            </div>
          ))}
        <div ref={sentinel} />
        {loading && posts.length > 0 && <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-grape" /></div>}
        {!cursor && posts.length > 0 && <p className="py-8 text-center text-sm text-ink-faint">You&apos;re all caught up ✨</p>}
      </div>
    </div>
  );
}

export function PostSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <Skeleton className="mt-4 h-40 w-full rounded-3xl" />
    </div>
  );
}
