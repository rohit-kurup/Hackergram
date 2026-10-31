"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string };

const listeners = new Set<(t: ToastItem) => void>();
let nextId = 1;

export function toast(message: string, kind: ToastKind = "success") {
  const t = { id: nextId++, kind, message };
  listeners.forEach((l) => l(t));
}
toast.error = (m: string) => toast(m, "error");
toast.info = (m: string) => toast(m, "info");

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-mint" />,
  error: <XCircle className="h-5 w-5 text-coral" />,
  info: <Info className="h-5 w-5 text-grape" />,
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const l = (t: ToastItem) => {
      setItems((xs) => [...xs, t]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 3800);
    };
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-paper-line bg-white px-4 py-3 text-sm font-medium text-ink shadow-lift"
            role="status"
          >
            {ICONS[t.kind]}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
