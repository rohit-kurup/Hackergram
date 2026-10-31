"use client";

/* eslint-disable @next/next/no-img-element */
import { motion } from "framer-motion";
import { Code2, FolderKanban, Github, HelpCircle, ImagePlus, Loader2, Rocket, Trophy, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { ComposerPreset } from "@/components/shell/AppShell";

export const POST_KINDS = [
  { kind: "update", label: "Update", icon: Code2, color: "#8257FF", placeholder: "What are you building today?" },
  { kind: "project", label: "Project", icon: FolderKanban, color: "#4285FF", placeholder: "Show off something you shipped ✨" },
  { kind: "question", label: "Question", icon: HelpCircle, color: "#FF984F", placeholder: "Stuck on something? Ask the community…" },
  { kind: "collab", label: "Looking for team", icon: Rocket, color: "#FF668C", placeholder: "Who are you looking for? What will you build?" },
  { kind: "hackathon", label: "Hackathon", icon: Trophy, color: "#35C98A", placeholder: "Share your hackathon story 🏆" },
  { kind: "repo", label: "Repo", icon: Github, color: "#15131F", placeholder: "Why should people check out this repo?" },
] as const;

export function Composer({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: ComposerPreset }) {
  const [kind, setKind] = useState<string>("update");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [projectId, setProjectId] = useState("");
  const [hackathonId, setHackathonId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [opts, setOpts] = useState<{ projects: { id: string; title: string }[]; events: { id: string; name: string }[] }>({ projects: [], events: [] });
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setKind(preset?.kind ?? "update");
    setContent(preset?.content ?? "");
    setRepoUrl(preset?.repoUrl ?? "");
    setProjectId(preset?.projectId ?? "");
    setHackathonId(preset?.hackathonId ?? "");
    setImageUrl(null);
    api("/api/composer", { silent: true }).then(setOpts).catch(() => {});
  }, [open, preset]);

  const k = POST_KINDS.find((x) => x.kind === kind)!;

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImageUrl(data.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setPosting(true);
    try {
      await api("/api/posts", {
        body: { kind, content, imageUrl, repoUrl: repoUrl.trim() || null, projectId: projectId || null, hackathonId: hackathonId || null },
      });
      toast("Posted! 🚀");
      onClose();
      router.refresh();
      window.dispatchEvent(new Event("hg:posted"));
    } catch {
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create post" className="sm:max-w-xl">
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {POST_KINDS.map((x) => (
          <motion.button
            key={x.kind}
            whileTap={{ scale: 0.94 }}
            onClick={() => setKind(x.kind)}
            className={cn("chip shrink-0 px-3 py-2 text-[13px] transition-colors", kind === x.kind ? "text-white" : "border border-paper-line bg-white text-ink-soft")}
            style={kind === x.kind ? { background: x.color } : undefined}
          >
            <x.icon className="h-3.5 w-3.5" /> {x.label}
          </motion.button>
        ))}
      </div>
      <textarea
        autoFocus
        className="min-h-[130px] w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-ink-faint"
        placeholder={k.placeholder}
        value={content}
        maxLength={2000}
        onChange={(e) => setContent(e.target.value)}
      />
      {imageUrl && (
        <div className="relative mt-2 overflow-hidden rounded-3xl">
          <img src={imageUrl} alt="Upload preview" className="max-h-72 w-full object-cover" />
          <button onClick={() => setImageUrl(null)} className="absolute right-3 top-3 rounded-full bg-ink/70 p-1.5 text-white" aria-label="Remove image">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="mt-3 space-y-3">
        {(kind === "repo" || kind === "project" || repoUrl) && (
          <div className="relative">
            <Github className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input className="input pl-10" placeholder="https://github.com/owner/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
          </div>
        )}
        {(kind === "project" || kind === "collab") && opts.projects.length > 0 && (
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Attach one of your projects (optional)</option>
            {opts.projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
        {kind === "hackathon" && opts.events.length > 0 && (
          <select className="input" value={hackathonId} onChange={(e) => setHackathonId(e.target.value)}>
            <option value="">Tag an event (optional)</option>
            {opts.events.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-paper-line pt-4">
        <div className="flex items-center gap-1">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button className="btn-ghost p-2.5" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Add image">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5 text-mint" />}
          </button>
          <button className="btn-ghost p-2.5" onClick={() => setRepoUrl(repoUrl || "https://github.com/")} aria-label="Attach repository">
            <Github className="h-5 w-5" />
          </button>
          <span className="ml-2 text-xs text-ink-faint">{content.length}/2000</span>
        </div>
        <button className="btn-brand px-6" disabled={!content.trim() || posting || uploading} onClick={submit}>
          {posting && <Loader2 className="h-4 w-4 animate-spin" />} Post
        </button>
      </div>
    </Modal>
  );
}
