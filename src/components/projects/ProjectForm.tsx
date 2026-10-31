"use client";

/* eslint-disable @next/next/no-img-element */
import { motion } from "framer-motion";
import { ImagePlus, Loader2, Megaphone, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { TagPicker } from "@/components/ui/TagPicker";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { CATEGORIES, LANGUAGES, TECHNOLOGIES } from "@/lib/catalog";
import { ACCENTS, cn, type Accent } from "@/lib/utils";

export type ProjectFormValues = {
  title: string; tagline: string; description: string; tech: string[]; category: string; repoUrl: string; demoUrl: string; color: Accent;
  thumbnail: string | null; isListing: boolean; rolesNeeded: string[]; requiredSkills: string[]; teamSize: number;
  stage: "Idea" | "Prototype" | "MVP" | "Launched"; commitment: string; remote: boolean; location: string; beginnerFriendly: boolean;
};

export const EMPTY_PROJECT: ProjectFormValues = {
  title: "", tagline: "", description: "", tech: [], category: "Web", repoUrl: "", demoUrl: "", color: "blue", thumbnail: null,
  isListing: true, rolesNeeded: [], requiredSkills: [], teamSize: 4, stage: "Idea", commitment: "5-10 hrs/week", remote: true, location: "", beginnerFriendly: false,
};

const ROLES = ["Frontend developer", "Backend developer", "Full-stack developer", "ML engineer", "Mobile developer", "Product designer", "Data scientist", "Hardware engineer", "DevOps", "Product manager"];

export function ProjectForm({ initial = EMPTY_PROJECT, id, aiReady }: { initial?: ProjectFormValues; id?: string; aiReady: boolean }) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [writing, setWriting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const set = <K extends keyof ProjectFormValues>(k: K, v: ProjectFormValues[K]) => setF((x) => ({ ...x, [k]: v }));

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json();
    setUploading(false);
    if (!res.ok) return toast.error(d.error);
    set("thumbnail", d.url);
  };

  const aiDescribe = async () => {
    setWriting(true);
    try {
      const r = await api("/api/ai/tools", { body: { tool: "description", input: { title: f.title, tagline: f.tagline, notes: f.description, tech: f.tech, rolesNeeded: f.rolesNeeded } } });
      set("description", r.content);
      toast("Draft written. Edit it to make it yours ✍️");
    } catch {
    } finally {
      setWriting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (id) {
        await api(`/api/projects/${id}`, { method: "PATCH", body: f });
        toast("Project updated");
        router.push(`/projects/${id}`);
      } else {
        const r = await api("/api/projects", { body: f });
        toast("Project created 🚀");
        router.push(`/projects/${r.id}`);
      }
      router.refresh();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <section className="card space-y-4 p-5 md:p-6">
          <h2 className="font-bold">The basics</h2>
          <div>
            <label className="label">Project name</label>
            <input className="input" maxLength={80} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="MedLens" />
          </div>
          <div>
            <label className="label">One-liner</label>
            <input className="input" maxLength={140} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="AI-assisted medical imaging triage for rural clinics" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Description</label>
              <button type="button" onClick={aiDescribe} disabled={!aiReady || writing || !f.title} className="mb-1.5 flex items-center gap-1 text-xs font-bold text-grape disabled:opacity-40" title={aiReady ? "Draft with Gemma" : "AI not configured"}>
                {writing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Write with AI
              </button>
            </div>
            <textarea className="input min-h-36" maxLength={3000} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="What problem does it solve? What's built so far? What's next?" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Category</label>
              <select className="input" value={f.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Stage</label>
              <select className="input" value={f.stage} onChange={(e) => set("stage", e.target.value as ProjectFormValues["stage"])}>
                {["Idea", "Prototype", "MVP", "Launched"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Repository URL</label>
              <input className="input" value={f.repoUrl} onChange={(e) => set("repoUrl", e.target.value)} placeholder="https://github.com/you/project" />
            </div>
            <div>
              <label className="label">Demo URL</label>
              <input className="input" value={f.demoUrl} onChange={(e) => set("demoUrl", e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div>
            <label className="label">Tech stack</label>
            <TagPicker value={f.tech} onChange={(v) => set("tech", v)} suggestions={[...LANGUAGES.slice(0, 8), ...TECHNOLOGIES.slice(0, 12)]} accent="blue" />
          </div>
        </section>

        <section className="card overflow-hidden">
          <button type="button" onClick={() => set("isListing", !f.isListing)} className="flex w-full items-center gap-4 bg-gradient-to-r from-coral-soft to-tang-soft p-5 text-left">
            <Megaphone className="h-6 w-6 text-coral" />
            <div className="flex-1">
              <div className="font-bold">Recruit collaborators</div>
              <div className="text-sm text-ink-soft">List this project so builders can find it, and swipe for teammates in Match.</div>
            </div>
            <span className="relative h-7 w-12 rounded-full transition-colors" style={{ background: f.isListing ? "#FF668C" : "#E4E3EC" }}>
              <motion.span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow" animate={{ left: f.isListing ? 24 : 4 }} />
            </span>
          </button>
          {f.isListing && (
            <div className="space-y-4 p-5 md:p-6">
              <div>
                <label className="label">Roles you need</label>
                <TagPicker value={f.rolesNeeded} onChange={(v) => set("rolesNeeded", v)} suggestions={ROLES} accent="coral" max={8} />
              </div>
              <div>
                <label className="label">Required skills</label>
                <TagPicker value={f.requiredSkills} onChange={(v) => set("requiredSkills", v)} suggestions={[...LANGUAGES.slice(0, 6), ...TECHNOLOGIES.slice(0, 14)]} accent="orange" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Team size</label>
                  <input className="input" type="number" min={1} max={20} value={f.teamSize} onChange={(e) => set("teamSize", Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Time commitment</label>
                  <input className="input" value={f.commitment} onChange={(e) => set("commitment", e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Check on={f.remote} onChange={(v) => set("remote", v)} label="Remote friendly" />
                <Check on={f.beginnerFriendly} onChange={(v) => set("beginnerFriendly", v)} label="Beginners welcome" />
              </div>
              {!f.remote && (
                <div>
                  <label className="label">Where do you meet?</label>
                  <input className="input" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Austin, TX" />
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-5">
        <section className="card p-5">
          <h2 className="mb-3 font-bold">Look & feel</h2>
          <button type="button" onClick={() => fileRef.current?.click()} className={cn("relative flex h-40 w-full items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br text-white", ACCENTS[f.color].grad)}>
            {f.thumbnail ? <img src={f.thumbnail} alt="" className="h-full w-full object-cover" /> : <span className="font-display text-6xl font-extrabold text-white/85">{f.title[0] ?? "?"}</span>}
            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Cover image
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          {f.thumbnail && <button className="mt-2 text-xs font-semibold text-ink-mute hover:text-coral" onClick={() => set("thumbnail", null)}>Remove image</button>}
          <div className="mt-4 flex gap-2.5">
            {(Object.keys(ACCENTS) as Accent[]).map((k) => (
              <button key={k} type="button" onClick={() => set("color", k)} aria-label={k} className={cn("h-8 w-8 rounded-full bg-gradient-to-br ring-offset-2", ACCENTS[k].grad, f.color === k && "ring-2 ring-ink")} />
            ))}
          </div>
        </section>
        <button className="btn-brand w-full py-3.5 text-[15px]" onClick={save} disabled={saving || f.title.trim().length < 2}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {id ? "Save changes" : "Publish project"}
        </button>
      </aside>
    </div>
  );
}

function Check({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className={cn("chip border px-3.5 py-2 text-[13px]", on ? "border-transparent bg-ink text-white" : "border-paper-line bg-white text-ink-soft")}>
      {on ? "✓ " : ""}{label}
    </button>
  );
}
