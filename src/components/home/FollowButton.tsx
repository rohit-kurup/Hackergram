"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

export function FollowButton({ userId, initial = false, size = "sm", onChange }: { userId: string; initial?: boolean; size?: "sm" | "md"; onChange?: (following: boolean, followers: number) => void }) {
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    setFollowing(!following);
    try {
      const r = await api(`/api/users/${userId}/follow`, { method: "POST" });
      setFollowing(r.following);
      onChange?.(r.following, r.followers);
    } catch {
      setFollowing(following);
    } finally {
      setBusy(false);
    }
  };
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={toggle}
      disabled={busy}
      className={cn(
        "btn shrink-0",
        size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-5 py-2.5",
        following ? "border border-paper-line bg-white text-ink-soft hover:border-coral hover:text-coral" : "bg-grape text-white hover:bg-grape-deep",
      )}
    >
      {following ? "Following" : "Follow"}
    </motion.button>
  );
}
