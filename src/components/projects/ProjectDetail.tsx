"use client";

/* eslint-disable @next/next/no-img-element */
import { motion } from "framer-motion";
import { Check, Clock, ExternalLink, GitFork, Github, Globe, Heart, Loader2, MapPin, MessageCircle, Pencil, Plus, Share2, Sprout, Star, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShell } from "@/components/shell/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { SampleBadge, TechTag } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { accentOf, cn, compact, formatDate } from "@/lib/utils";

type Member = { id: string; role: string; status: string; user: { id: string; name: string; username: string; image: string | null; headline: string } };
type Props = {
  isOwner: boolean;
  myStatus: string | null;
  project: {
    id: string; title: string; tagline: string; description: string; color: string; thumbnail: string | null; category: string; tech: string[];
    repoUrl: string; demoUrl: string; stars: number; forks: number; source: string; isListing: boolean; status: string; rolesNeeded: string[];
    requiredSkills: string[]; teamSize: number; stage: string; commitment: string; remote: boolean; location: string; beginnerFriendly: boolean;
    createdAt: string; owner: { id: string; name: string; username: string; image: string | null; headline: string; isSample: boolean };
  };
  members: Member[];
  recommendations: { id: string; name: string; username: string; image: string | null; headline: string; score: number; reasons: string[]; skills: string[] }[];
};

export function ProjectDetail({ isOwner, myStatus, project: p, members, recommendations }: Props) {
  const a = accentOf(p.color);
  const router = useRouter();
  const { openComposer } = useShell();
  const [joinOpen, setJoinOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const active = members.filter((m) => m.status === "active");
  const requests = members.filter((m) => m.status === "requested");
  const invited = members.filter((m) => m.status === "invited");
  const isMember = myStatus === "active";

  const act = async (key: string, url: string, body?: unknown, msg?: string) => {
    setBusy(key);
    try {
      const r = await api(url, { method: "POST", body: body ?? {} });
      if (msg) toast(msg);
      if (r.conversationId) router.push(`/messages/${r.conversationId}`);
      else router.refresh();
    } catch {
    } finally {
      setBusy(null);
    }
  };
  const teamChat = async () => {
    const { id } = await api("/api/conversations", { body: { projectId: p.id } });
    router.push(`/messages/${id}`);
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-10 pt-4 md:px-8 md:pt-8">
      {/* Hero */}
      <section className={cn("relative overflow-hidden rounded-[40px] bg-gradient-to-br text-white shadow-lift", a.grad)}>
        {p.thumbnail && <img src={p.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/15" />
        <span className="pointer-events-none absolute -bottom-16 right-6 font-display text-[220px] font-extrabold leading-none text-white/15">{p.title[0]}</span>
        <div className="relative p-6 md:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-white/25 text-white backdrop-blur">{p.category}</span>
            <span className="chip bg-white/25 text-white backdrop-blur">{p.stage}</span>
            {p.isListing && p.status === "open" && <span className="chip bg-white text-coral-deep"><Heart className="h-3 w-3" fill="currentColor" /> Recruiting</span>}
            {p.status === "closed" && <span className="chip bg-ink/40 text-white">Team full</span>}
            {p.source === "github" && <span className="chip bg-ink/40 text-white"><Github className="h-3 w-3" /> Imported from GitHub</span>}
          </div>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight md:text-5xl">{p.title}</h1>
          {p.tagline && <p className="mt-2 max-w-2xl text-lg text-white/90">{p.tagline}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isOwner ? (
              <>
                <Link href={`/projects/${p.id}/edit`} className="btn bg-white text-ink hover:shadow-lift"><Pencil className="h-4 w-4" /> Edit</Link>
                {p.isListing && <Link href={`/match?project=${p.id}`} className="btn bg-ink/80 text-white hover:bg-ink"><Heart className="h-4 w-4" /> Swipe for teammates</Link>}
                <button onClick={() => openComposer({ kind: p.isListing ? "collab" : "project", projectId: p.id })} className="btn bg-white/20 text-white backdrop-blur hover:bg-white/30"><Share2 className="h-4 w-4" /> Share</button>
              </>
            ) : myStatus === "invited" ? (
              <>
                <button onClick={() => act("accept", `/api/projects/${p.id}/respond`, { accept: true }, "Welcome to the team! 🎉")} disabled={!!busy} className="btn bg-white text-mint-deep hover:shadow-lift">
                  {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept invite
                </button>
                <button onClick={() => act("decline", `/api/projects/${p.id}/respond`, { accept: false }, "Invite declined")} disabled={!!busy} className="btn bg-white/20 text-white">Decline</button>
              </>
            ) : myStatus === "requested" ? (
              <span className="btn bg-white/25 text-white">⏳ Request sent</span>
            ) : !isMember && p.isListing && p.status === "open" ? (
              <button onClick={() => setJoinOpen(true)} className="btn bg-white text-ink hover:shadow-lift"><Plus className="h-4 w-4" /> Request to join</button>
            ) : null}
            {(isMember || isOwner) && <button onClick={teamChat} className="btn bg-white/20 text-white backdrop-blur hover:bg-white/30"><MessageCircle className="h-4 w-4" /> Team chat</button>}
            {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="btn bg-white/20 text-white backdrop-blur hover:bg-white/30"><Github className="h-4 w-4" /> Code</a>}
            {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noopener noreferrer" className="btn bg-white/20 text-white backdrop-blur hover:bg-white/30"><ExternalLink className="h-4 w-4" /> Demo</a>}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-3 text-lg font-bold">About this project</h2>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">{p.description || p.tagline || "No description yet."}</p>
            <div className="mt-5 flex flex-wrap gap-2">{p.tech.map((t) => <TechTag key={t} name={t} className="py-1.5 text-[13px]" />)}</div>
            <div className="mt-5 flex flex-wrap gap-5 border-t border-paper-line pt-4 text-sm font-semibold text-ink-mute">
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-sun" fill="#FFD65A" />{compact(p.stars)} stars</span>
              <span className="flex items-center gap-1.5"><GitFork className="h-4 w-4" />{compact(p.forks)} forks</span>
              <span>Created {formatDate(p.createdAt, { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </section>

          {p.isListing && (
            <section className="card overflow-hidden">
              <div className="bg-gradient-to-r from-coral-soft to-tang-soft px-6 py-4">
                <h2 className="text-lg font-bold">Open roles</h2>
              </div>
              <div className="grid gap-3 p-6 sm:grid-cols-2">
                {p.rolesNeeded.map((r) => (
                  <motion.div key={r} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-coral/40 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-soft"><Plus className="h-5 w-5 text-coral" /></span>
                    <span className="font-semibold">{r}</span>
                  </motion.div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-paper-line px-6 py-4 text-sm font-medium text-ink-soft">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-tang" />{p.commitment}</span>
                <span className="flex items-center gap-1.5">{p.remote ? <><Globe className="h-4 w-4 text-aqua" />Remote</> : <><MapPin className="h-4 w-4 text-mint" />{p.location || "In person"}</>}</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-sky" />Team of {p.teamSize}</span>
                {p.beginnerFriendly && <span className="flex items-center gap-1.5 text-mint-deep"><Sprout className="h-4 w-4" />Beginners welcome</span>}
              </div>
              {p.requiredSkills.length > 0 && (
                <div className="border-t border-paper-line px-6 py-4">
                  <div className="eyebrow mb-2">Skills that help</div>
                  <div className="flex flex-wrap gap-1.5">{p.requiredSkills.map((s) => <TechTag key={s} name={s} />)}</div>
                </div>
              )}
            </section>
          )}

          {isOwner && recommendations.length > 0 && (
            <section className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Recommended collaborators</h2>
                <Link href={`/match?project=${p.id}`} className="text-sm font-bold text-coral hover:underline">Swipe all →</Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {recommendations.map((r) => (
                  <div key={r.id} className="rounded-3xl border border-paper-line p-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/u/${r.username}`}><Avatar name={r.name} src={r.image} size={44} /></Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/u/${r.username}`} className="block truncate font-bold hover:underline">{r.name}</Link>
                        <div className="truncate text-xs text-ink-mute">{r.headline}</div>
                      </div>
                      <span className="chip bg-grape-soft text-grape-deep">{r.score}%</span>
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">{r.reasons[0] ?? ""}</p>
                    <button
                      onClick={() => act(`inv${r.id}`, "/api/match", { targetId: r.id, direction: "right", context: p.id }, `Invited ${r.name.split(" ")[0]}`)}
                      disabled={!!busy}
                      className="btn-outline mt-3 w-full py-2 text-xs"
                    >
                      {busy === `inv${r.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Invite to team
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <div className="eyebrow mb-3">Created by</div>
            <Link href={`/u/${p.owner.username}`} className="flex items-center gap-3">
              <Avatar name={p.owner.name} src={p.owner.image} size={48} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-bold">{p.owner.name} {p.owner.isSample && <SampleBadge />}</div>
                <div className="truncate text-sm text-ink-mute">{p.owner.headline}</div>
              </div>
            </Link>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow">Team</span>
              <span className="text-xs font-bold text-ink-mute">{active.length}/{p.teamSize}</span>
            </div>
            <div className="space-y-2">
              {active.map((m) => (
                <MemberRow key={m.id} m={m}>
                  {isOwner && m.user.id !== p.owner.id && (
                    <button onClick={() => act(`rm${m.id}`, `/api/projects/${p.id}/member`, { userId: m.id, decision: "remove" }, "Removed from team")} className="p-1 text-ink-faint hover:text-coral" aria-label="Remove member"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </MemberRow>
              ))}
              {Array.from({ length: Math.max(0, p.teamSize - active.length) }).slice(0, 4).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-paper-line p-2 text-sm text-ink-faint">
                  <span className="h-9 w-9 rounded-full border-2 border-dashed border-paper-line" /> Open spot
                </div>
              ))}
            </div>
            {isMember && !isOwner && (
              <button onClick={() => act("leave", `/api/projects/${p.id}/leave`, {}, "You left the team")} className="mt-3 text-xs font-semibold text-ink-mute hover:text-coral">Leave team</button>
            )}
          </section>

          {isOwner && requests.length > 0 && (
            <section className="card border-coral/30 p-5">
              <div className="eyebrow mb-3 text-coral">Join requests</div>
              <div className="space-y-2">
                {requests.map((m) => (
                  <MemberRow key={m.id} m={m}>
                    <button onClick={() => act(`a${m.id}`, `/api/projects/${p.id}/member`, { userId: m.id, decision: "accept" }, "Added to team")} className="rounded-full bg-mint p-1.5 text-white" aria-label="Accept"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => act(`d${m.id}`, `/api/projects/${p.id}/member`, { userId: m.id, decision: "decline" })} className="rounded-full bg-paper-soft p-1.5 text-ink-mute" aria-label="Decline"><X className="h-3.5 w-3.5" /></button>
                  </MemberRow>
                ))}
              </div>
            </section>
          )}
          {isOwner && invited.length > 0 && (
            <section className="card p-5">
              <div className="eyebrow mb-3">Invited</div>
              <div className="space-y-2">{invited.map((m) => <MemberRow key={m.id} m={m}><span className="text-xs text-ink-faint">pending</span></MemberRow>)}</div>
            </section>
          )}
          {isOwner && (
            <div className="flex flex-col gap-2">
              {p.isListing && (
                <button onClick={async () => { await api(`/api/projects/${p.id}`, { method: "PATCH", body: { status: p.status === "open" ? "closed" : "open" } }); router.refresh(); }} className="btn-outline w-full">
                  {p.status === "open" ? "Mark team as full" : "Reopen recruiting"}
                </button>
              )}
              <button onClick={() => setConfirmDelete(true)} className="btn-ghost w-full text-coral-deep">Delete project</button>
            </div>
          )}
        </aside>
      </div>

      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} roles={p.rolesNeeded} onSubmit={(body) => act("join", `/api/projects/${p.id}/join`, body, "Request sent! The owner has been notified.").then(() => setJoinOpen(false))} />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        title="Delete this project?"
        body="This removes the project, its listing and team memberships. This can't be undone."
        confirmLabel="Delete"
        onConfirm={async () => { await api(`/api/projects/${p.id}`, { method: "DELETE" }); toast("Project deleted"); router.push("/projects"); }}
      />
    </div>
  );
}

function MemberRow({ m, children }: { m: Member; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl p-2 hover:bg-paper-off">
      <Link href={`/u/${m.user.username}`}><Avatar name={m.user.name} src={m.user.image} size={36} /></Link>
      <div className="min-w-0 flex-1">
        <Link href={`/u/${m.user.username}`} className="block truncate text-sm font-bold hover:underline">{m.user.name}</Link>
        <div className="truncate text-xs text-ink-mute">{m.role}</div>
      </div>
      {children}
    </div>
  );
}

function JoinModal({ open, onClose, roles, onSubmit }: { open: boolean; onClose: () => void; roles: string[]; onSubmit: (b: { role: string; note: string }) => Promise<void> }) {
  const [role, setRole] = useState(roles[0] ?? "Collaborator");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Request to join">
      <label className="label">Which role?</label>
      <div className="mb-4 flex flex-wrap gap-2">
        {[...roles, "Collaborator"].filter((v, i, a) => a.indexOf(v) === i).map((r) => (
          <button key={r} onClick={() => setRole(r)} className={cn("chip px-3 py-2 text-[13px]", role === r ? "bg-coral text-white" : "border border-paper-line bg-white text-ink-soft")}>{r}</button>
        ))}
      </div>
      <label className="label">Why are you a good fit?</label>
      <textarea className="input min-h-28" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="I built something similar last semester…" />
      <button className="btn-brand mt-4 w-full" disabled={busy} onClick={async () => { setBusy(true); await onSubmit({ role, note }); setBusy(false); }}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send request
      </button>
    </Modal>
  );
}
