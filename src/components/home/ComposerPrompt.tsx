"use client";

import { FolderKanban, HelpCircle, ImagePlus, Rocket } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useShell } from "@/components/shell/AppShell";

export function ComposerPrompt() {
  const { me, openComposer } = useShell();
  return (
    <div className="mt-4">
      <button
        onClick={() => openComposer()}
        className="flex w-full items-center gap-3 rounded-full border border-paper-line bg-paper-off py-2 pl-2 pr-4 text-left text-ink-faint transition hover:border-grape/40 hover:bg-white hover:shadow-card"
      >
        <Avatar name={me.name} src={me.image} size={36} />
        <span className="flex-1 text-[15px]">Share an update, project, or question…</span>
        <ImagePlus className="h-5 w-5 text-mint" />
      </button>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button onClick={() => openComposer({ kind: "project" })} className="chip bg-sky-soft py-1.5 text-sky-deep hover:brightness-95">
          <FolderKanban className="h-3.5 w-3.5" /> Share a project
        </button>
        <button onClick={() => openComposer({ kind: "collab" })} className="chip bg-coral-soft py-1.5 text-coral-deep hover:brightness-95">
          <Rocket className="h-3.5 w-3.5" /> Find teammates
        </button>
        <button onClick={() => openComposer({ kind: "question" })} className="chip bg-tang-soft py-1.5 text-tang-deep hover:brightness-95">
          <HelpCircle className="h-3.5 w-3.5" /> Ask a question
        </button>
      </div>
    </div>
  );
}
