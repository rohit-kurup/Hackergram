"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { accentOf, cn } from "@/lib/utils";

/** Pick from suggestions or type your own. Selected values float to the top as chips. */
export function TagPicker({
  value,
  onChange,
  suggestions,
  accent = "purple",
  placeholder = "Add your own…",
  max = 20,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  accent?: string;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const a = accentOf(accent);
  const has = (s: string) => value.some((v) => v.toLowerCase() === s.toLowerCase());
  const toggle = (s: string) => {
    if (has(s)) onChange(value.filter((v) => v.toLowerCase() !== s.toLowerCase()));
    else if (value.length < max) onChange([...value, s]);
  };
  const add = () => {
    const t = draft.trim();
    if (t && !has(t) && value.length < max) onChange([...value, t]);
    setDraft("");
  };
  const rest = suggestions.filter((s) => !has(s));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {value.map((v) => (
            <motion.button
              type="button"
              layout
              key={v}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              onClick={() => toggle(v)}
              className="chip gap-1.5 py-1.5 pl-3 pr-2 text-[13px] text-white shadow-sm"
              style={{ background: a.solid }}
            >
              {v} <X className="h-3.5 w-3.5 opacity-80" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      <div className={cn("flex flex-wrap gap-2", value.length && "mt-3")}>
        {rest.map((s) => (
          <motion.button
            type="button"
            key={s}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => toggle(s)}
            className="chip border border-paper-line bg-white py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-transparent"
            onMouseEnter={(e) => (e.currentTarget.style.background = a.soft)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
          >
            <Plus className="h-3 w-3" /> {s}
          </motion.button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="input py-2.5"
          value={draft}
          placeholder={placeholder}
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-outline" onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}
