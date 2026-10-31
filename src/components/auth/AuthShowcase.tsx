"use client";

import { motion } from "framer-motion";
import { Code2, Heart, MapPin, Sparkles, Star, Users } from "lucide-react";
import { Logo } from "@/components/Logo";

const floaters = [
  { icon: Heart, label: "It's a match!", sub: "You both love Rust", color: "#FF668C", x: "4%", y: "16%", r: -6, d: 0 },
  { icon: Star, label: "+128 stars", sub: "on your CLI this week", color: "#FFD65A", x: "52%", y: "4%", r: 5, d: 0.15 },
  { icon: MapPin, label: "Hackathon · 2.1 mi", sub: "14 builders going", color: "#35C98A", x: "50%", y: "58%", r: -4, d: 0.3 },
  { icon: Sparkles, label: "Draft ready", sub: "Gemma drafted your app", color: "#42C9E8", x: "2%", y: "44%", r: 4, d: 0.45 },
];

export function AuthShowcase() {
  return (
    <div className="relative hidden overflow-hidden bg-paper-off lg:block">
      {/* soft color blobs */}
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-grape/20 blur-3xl" />
      <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-coral/20 blur-3xl" />
      <div className="absolute right-1/3 top-1/3 h-64 w-64 rounded-full bg-aqua/20 blur-3xl" />
      <div className="relative flex h-full flex-col p-12">
        <Logo />
        <div className="relative flex-1">
          {floaters.map((f) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 30, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: f.r }}
              transition={{ delay: 0.2 + f.d, type: "spring", stiffness: 120, damping: 14 }}
              className="absolute"
              style={{ left: f.x, top: f.y }}
            >
              <div className="flex animate-float items-center gap-3 rounded-3xl border border-white bg-white/90 px-4 py-3 shadow-lift backdrop-blur" style={{ animationDelay: `${f.d * 4}s` }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${f.color}22` }}>
                  <f.icon className="h-5 w-5" style={{ color: f.color }} fill={f.icon === Heart ? f.color : "none"} />
                </span>
                <div>
                  <div className="text-sm font-bold">{f.label}</div>
                  <div className="text-xs text-ink-mute">{f.sub}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="max-w-md">
          <h2 className="text-5xl font-extrabold leading-[1.02]">
            Where builders <span className="bg-brand-grad bg-clip-text text-transparent">find their people.</span>
          </h2>
          <p className="mt-4 text-ink-soft">
            Turn your GitHub into a portfolio, swipe to find teammates, and discover hackathons near you.
          </p>
          <div className="mt-6 flex gap-5 text-sm font-semibold text-ink-soft">
            <span className="flex items-center gap-1.5"><Code2 className="h-4 w-4 text-sky" /> GitHub-powered</span>
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-coral" /> Team matching</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-grape" /> Gemma 4 AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
