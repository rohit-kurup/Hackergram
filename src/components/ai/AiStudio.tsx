"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, BookOpen, Check, ClipboardCopy, FileText, Lightbulb, Link2, ListChecks, Loader2, MessageSquare, Pencil, Save, Send, Sparkles,
  Target, Trash2, Users, Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { cn, timeAgo } from "@/lib/utils";
import { Markdown } from "./Markdown";

type Status = { configured: boolean; provider: string; model: string };
type Draft = { question: string; answer: string; sources: string[]; tips?: string };

const TABS = [
  { key: "apply", label: "Apply with AI", icon: Wand2 },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "tools", label: "Tools", icon: Lightbulb },
  { key: "drafts", label: "Drafts", icon: FileText },
] as const;

export function AiStudio({ status, events, projects, initialEvent, firstName }: { status: Status; events: { id: string; name: string; source: string }[]; projects: { id: string; title: string }[]; initialEvent: string; firstName: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("apply");
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-5 md:px-8 md:py-8">
      {/* Hero */}
      <section className="relative mb-6 overflow-hidden rounded-[40px] bg-white p-6 shadow-card md:p-8">
        <div className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-grape/20 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-aqua/25 blur-3xl" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Orb />
          <div className="flex-1">
            <p className="eyebrow">Your AI companion</p>
            <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Hey {firstName}, I&apos;m <span className="bg-ai-grad bg-clip-text text-transparent">Gemma</span>.</h1>
            <p className="mt-1 max-w-lg text-ink-soft">I read your Hackergram profile and GitHub to help you apply to hackathons, brainstorm ideas, and plan your team. You review and edit everything.</p>
          </div>
        </div>
        <div className={cn("relative mt-5 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm", status.configured ? "bg-aqua-soft text-aqua-deep" : "bg-sun-soft text-sun-deep")}>
          {status.configured ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          {status.configured ? (
            <span>Connected to <b>{status.model}</b> via {status.provider}.</span>
          ) : (
            <span>
              Gemma 4 isn&apos;t configured on this server yet. Add <code className="font-mono">GEMINI_API_KEY</code> (model <code className="font-mono">{status.model}</code>) to <code className="font-mono">.env</code> to unlock drafting, chat and tools.
              Until then, Apply with AI generates <b>fill-in-the-blank templates</b> from your real profile data.
            </span>
          )}
        </div>
      </section>

      <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold", tab === t.key ? "text-white" : "text-ink-soft hover:bg-white")}>
            {tab === t.key && <motion.span layoutId="ai-tab" className="absolute inset-0 rounded-full bg-ai-grad shadow-glow" />}
            <t.icon className="relative h-4 w-4" /> <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
          {tab === "apply" && <Apply events={events} initialEvent={initialEvent} />}
          {tab === "chat" && <Chat configured={status.configured} />}
          {tab === "tools" && <Tools configured={status.configured} projects={projects} events={events} />}
          {tab === "drafts" && <Drafts />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Orb({ size = 84, thinking = false }: { size?: number; thinking?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <motion.div className="absolute inset-0 rounded-full bg-ai-grad blur-md" animate={{ scale: thinking ? [1, 1.25, 1] : [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }} transition={{ repeat: Infinity, duration: thinking ? 1 : 3 }} />
      <motion.div className="absolute inset-[6%] rounded-full bg-ai-grad" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: thinking ? 2 : 10, ease: "linear" }} style={{ background: "conic-gradient(from 0deg, #8257FF, #42C9E8, #B49BFF, #8257FF)" }} />
      <div className="absolute inset-[18%] flex items-center justify-center rounded-full bg-white/90 backdrop-blur">
        <Sparkles className="text-grape" style={{ width: size * 0.32, height: size * 0.32 }} />
      </div>
    </div>
  );
}

function copy(text: string, label = "Copied to clipboard") {
  navigator.clipboard.writeText(text).then(() => toast(label));
}

/* ───────────────────────── Apply ───────────────────────── */

function Apply({ events, initialEvent }: { events: { id: string; name: string; source: string }[]; initialEvent: string }) {
  const [eventId, setEventId] = useState(initialEvent);
  const [mode, setMode] = useState<"common" | "paste" | "url">("common");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [tone, setTone] = useState<"enthusiastic" | "professional" | "concise">("enthusiastic");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ draftId: string; drafts: Draft[]; sourceNote: string; model: string; aiConfigured: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { hackathonId: eventId || null, tone };
      if (mode === "paste") body.formText = text;
      if (mode === "url") body.url = url;
      setResult(await api("/api/ai/apply", { body }));
    } catch {
    } finally {
      setLoading(false);
    }
  };
  const edit = (i: number, answer: string) => setResult((r) => (r ? { ...r, drafts: r.drafts.map((d, j) => (j === i ? { ...d, answer } : d)) } : r));
  const save = async () => {
    if (!result) return;
    setSaving(true);
    await api(`/api/ai/drafts?id=${result.draftId}`, { method: "PATCH", body: { content: JSON.stringify(result.drafts) } }).then(() => toast("Draft saved")).catch(() => {});
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <section className="card space-y-4 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Hackathon</label>
            <select className="input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Not listed / general application</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}{e.source === "sample" ? " (sample)" : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tone</label>
            <div className="flex gap-1.5">
              {(["enthusiastic", "professional", "concise"] as const).map((t) => (
                <button key={t} onClick={() => setTone(t)} className={cn("chip flex-1 justify-center py-3 capitalize", tone === t ? "bg-grape text-white" : "border border-paper-line bg-white text-ink-soft")}>{t}</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="label">Application questions</label>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {([["common", "Common questions", ListChecks], ["paste", "Paste the form", ClipboardCopy], ["url", "Form link", Link2]] as const).map(([k, l, I]) => (
              <button key={k} onClick={() => setMode(k)} className={cn("flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-xs font-semibold transition", mode === k ? "border-grape bg-grape-soft text-grape-deep" : "border-paper-line text-ink-soft hover:border-ink-faint")}>
                <I className="h-5 w-5" /> {l}
              </button>
            ))}
          </div>
          {mode === "paste" && <textarea className="input min-h-36" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the application questions or the whole form text here…" maxLength={20000} />}
          {mode === "url" && (
            <>
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (a public application page)" />
              <p className="mt-1.5 text-xs text-ink-mute">Works for public, server-rendered pages. Google Forms, Typeform and sign-in-gated forms usually need you to paste the questions instead.</p>
            </>
          )}
          {mode === "common" && <p className="text-sm text-ink-mute">We&apos;ll draft answers to the 5 questions most hackathons ask.</p>}
        </div>
        <button onClick={run} disabled={loading || (mode === "paste" && !text.trim()) || (mode === "url" && !url.trim())} className="btn w-full bg-ai-grad py-3.5 text-[15px] text-white shadow-glow hover:brightness-105">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />} {loading ? "Reading your profile & drafting…" : "Draft my application"}
        </button>
        <p className="text-center text-xs text-ink-faint">Gemma never submits anything for you. Answers only use facts from your profile; missing details are marked [ADD: …].</p>
      </section>

      {loading && (
        <div className="card flex flex-col items-center gap-3 p-10">
          <Orb size={64} thinking />
          <p className="text-sm font-semibold text-ink-soft">Matching your projects to each question…</p>
        </div>
      )}

      {result && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Your drafts</h2>
              <p className="text-xs text-ink-mute">{result.sourceNote} · {result.aiConfigured ? `Drafted by ${result.model}` : "Templates (AI not configured)"}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copy(result.drafts.map((d) => `${d.question}\n\n${d.answer}`).join("\n\n---\n\n"), "All answers copied")} className="btn-outline px-3 py-2 text-xs"><ClipboardCopy className="h-3.5 w-3.5" /> Copy all</button>
              <button onClick={save} disabled={saving} className="btn-primary px-3 py-2 text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save edits</button>
            </div>
          </div>
          {result.drafts.map((d, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-paper-line bg-gradient-to-r from-grape-soft/60 to-aqua-soft/60 px-5 py-3">
                <p className="font-semibold">{i + 1}. {d.question}</p>
                <button onClick={() => copy(d.answer)} className="btn-ghost shrink-0 p-1.5" aria-label="Copy answer"><ClipboardCopy className="h-4 w-4" /></button>
              </div>
              <div className="p-5">
                <textarea className="input min-h-40 text-[15px] leading-relaxed" value={d.answer} onChange={(e) => edit(i, e.target.value)} />
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-faint">
                  <span><Pencil className="mr-1 inline h-3 w-3" />Editable · {d.answer.trim().split(/\s+/).filter(Boolean).length} words</span>
                  {/\[ADD:/.test(d.answer) && <span className="font-semibold text-tang-deep">Has placeholders to fill in</span>}
                </div>
                {d.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="eyebrow mr-1">Based on</span>
                    {d.sources.map((s) => <span key={s} className="chip bg-aqua-soft text-aqua-deep">{s}</span>)}
                  </div>
                )}
                {d.tips && <p className="mt-3 rounded-2xl bg-sun-soft px-3 py-2 text-xs text-sun-deep">💡 {d.tips}</p>}
              </div>
            </motion.div>
          ))}
          <p className="rounded-3xl border border-dashed border-paper-line p-4 text-xs text-ink-mute">
            Auto-filling third-party forms isn&apos;t supported: Hackergram can&apos;t (and won&apos;t) type into other websites for you. Copy each answer into the official form, review it, and submit it yourself.
          </p>
        </section>
      )}
    </div>
  );
}

/* ───────────────────────── Chat ───────────────────────── */

const STARTERS = ["What should I build at my next hackathon?", "Review my strongest project for a resume bullet", "How do I find a designer for my team?", "Explain RAG like I'm a sophomore"];

function Chat({ configured }: { configured: boolean }) {
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("hg-ai-chat") ?? "[]");
    } catch {
      return [];
    }
  });
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
    try {
      sessionStorage.setItem("hg-ai-chat", JSON.stringify(msgs.slice(-30)));
    } catch {}
  }, [msgs]);

  const send = async (content: string) => {
    if (!content.trim() || loading) return;
    const next = [...msgs, { role: "user" as const, content }];
    setMsgs(next);
    setText("");
    setLoading(true);
    try {
      const r = await api("/api/ai/chat", { body: { messages: next } });
      setMsgs([...next, { role: "assistant", content: r.reply }]);
    } catch {
      setMsgs(msgs);
      setText(content);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card flex h-[calc(100dvh-360px)] min-h-[460px] flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Orb size={70} />
            <p className="mt-4 font-bold">Ask me anything about building, applying, or teaming up</p>
            {!configured && <p className="mt-1 max-w-sm text-sm text-sun-deep">Chat needs Gemma 4 configured (GEMINI_API_KEY).</p>}
            <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
              {STARTERS.map((s) => <button key={s} disabled={!configured} onClick={() => send(s)} className="chip border border-paper-line bg-white px-3 py-2 text-[13px] text-ink-soft hover:border-grape hover:text-grape disabled:opacity-50">{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
            {m.role === "assistant" && <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ai-grad"><Sparkles className="h-4 w-4 text-white" /></span>}
            <div className={cn("max-w-[85%] rounded-3xl px-4 py-3", m.role === "user" ? "rounded-br-md bg-ink text-white" : "rounded-tl-md bg-gradient-to-br from-grape-soft to-aqua-soft text-ink")}>
              {m.role === "assistant" ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap text-[15px]">{m.content}</p>}
              {m.role === "assistant" && <button onClick={() => copy(m.content)} className="mt-1 text-[11px] font-semibold text-ink-mute hover:text-grape">Copy</button>}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ai-grad"><Loader2 className="h-4 w-4 animate-spin text-white" /></span>
            <span className="flex items-center gap-1 rounded-3xl bg-grape-soft px-4 py-3">
              {[0, 1, 2].map((d) => <motion.span key={d} className="h-2 w-2 rounded-full bg-grape" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }} />)}
            </span>
          </div>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-end gap-2 border-t border-paper-line p-3">
        {msgs.length > 0 && <button type="button" onClick={() => setMsgs([])} className="btn-ghost p-2.5" aria-label="Clear chat"><Trash2 className="h-4 w-4" /></button>}
        <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} disabled={!configured} placeholder={configured ? "Ask Gemma…" : "Configure Gemma 4 to chat"} className="max-h-32 min-h-[46px] flex-1 resize-none rounded-3xl border border-paper-line bg-paper-off px-4 py-3 outline-none focus:border-grape focus:bg-white" />
        <button disabled={!configured || !text.trim() || loading} className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-ai-grad text-white shadow-glow disabled:opacity-40" aria-label="Send"><Send className="h-5 w-5" /></button>
      </form>
    </section>
  );
}

/* ───────────────────────── Tools ───────────────────────── */

const TOOLS = [
  { key: "ideas", title: "Project ideas", body: "5 hackathon-sized ideas that fit your skills.", icon: Lightbulb, color: "#FFD65A", field: { name: "theme", placeholder: "Optional theme, e.g. climate, health" } },
  { key: "team", title: "Team composition", body: "Who to recruit, and which role you should take.", icon: Users, color: "#FF668C", field: { name: "projectId", placeholder: "" } },
  { key: "skillgap", title: "Skill gap analysis", body: "What you have, what you need, and a 4-week plan.", icon: Target, color: "#4285FF", field: { name: "goal", placeholder: "Goal, e.g. ML engineer internship" } },
  { key: "prep", title: "Hackathon prep", body: "A checklist and 36-hour game plan.", icon: ListChecks, color: "#35C98A", field: { name: "event", placeholder: "" } },
  { key: "readme", title: "README writer", body: "A polished README from a few notes.", icon: BookOpen, color: "#8257FF", field: { name: "title", placeholder: "Project name" } },
  { key: "collab", title: "Collaborator advice", body: "The kinds of teammates who'd complement you.", icon: Sparkles, color: "#42C9E8", field: null },
] as const;

function Tools({ configured, projects, events }: { configured: boolean; projects: { id: string; title: string }[]; events: { id: string; name: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState<Record<string, string>>({});
  const [out, setOut] = useState<{ content: string; model: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const tool = TOOLS.find((t) => t.key === active);

  const run = async () => {
    if (!tool) return;
    setLoading(true);
    setOut(null);
    try {
      const payload: Record<string, unknown> = { ...input };
      if (tool.key === "prep" && input.event) payload.event = events.find((e) => e.id === input.event)?.name;
      if (tool.key === "readme" && input.notes) payload.notes = input.notes;
      setOut(await api("/api/ai/tools", { body: { tool: tool.key, input: payload } }));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <motion.button key={t.key} whileHover={{ y: -4 }} onClick={() => { setActive(t.key); setInput({}); setOut(null); }} className={cn("card p-5 text-left transition", active === t.key ? "ring-2 ring-grape" : "hover:shadow-lift")}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${t.color}22` }}><t.icon className="h-5 w-5" style={{ color: t.color === "#FFD65A" ? "#A87F00" : t.color }} /></span>
            <div className="mt-3 font-bold">{t.title}</div>
            <div className="text-sm text-ink-mute">{t.body}</div>
          </motion.button>
        ))}
      </div>
      {tool && (
        <section className="card space-y-3 p-5">
          <h3 className="font-bold">{tool.title}</h3>
          {tool.key === "team" ? (
            <select className="input" value={input.projectId ?? ""} onChange={(e) => setInput({ projectId: e.target.value })}>
              <option value="">A general hackathon project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          ) : tool.key === "prep" ? (
            <select className="input" value={input.event ?? ""} onChange={(e) => setInput({ event: e.target.value })}>
              <option value="">Any upcoming hackathon</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          ) : tool.field ? (
            <input className="input" placeholder={tool.field.placeholder} value={input[tool.field.name] ?? ""} onChange={(e) => setInput({ ...input, [tool.field!.name]: e.target.value })} />
          ) : null}
          {tool.key === "readme" && <textarea className="input min-h-24" placeholder="What does it do? How do you run it? (notes)" value={input.notes ?? ""} onChange={(e) => setInput({ ...input, notes: e.target.value })} />}
          <button onClick={run} disabled={!configured || loading} className="btn bg-ai-grad px-6 text-white shadow-glow">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {configured ? "Generate" : "Requires Gemma 4 (see README)"}
          </button>
          {loading && <div className="flex justify-center py-6"><Orb size={56} thinking /></div>}
          {out && (
            <div className="rounded-3xl bg-gradient-to-br from-grape-soft/50 to-aqua-soft/50 p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="chip bg-ai-grad text-white">AI-generated · {out.model}</span>
                <button onClick={() => copy(out.content)} className="btn-ghost px-2 py-1 text-xs"><ClipboardCopy className="h-3.5 w-3.5" /> Copy</button>
              </div>
              <Markdown text={out.content} />
              <p className="mt-3 text-[11px] text-ink-faint">Saved to your Drafts, where you can edit it.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ───────────────────────── Drafts ───────────────────────── */

function Drafts() {
  const [drafts, setDrafts] = useState<{ id: string; kind: string; title: string; content: string; model: string; updatedAt: string }[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState("");
  useEffect(() => {
    api("/api/ai/drafts", { silent: true }).then((d) => setDrafts(d.drafts)).catch(() => setDrafts([]));
  }, []);
  const current = drafts?.find((d) => d.id === open);
  const pretty = (d: { kind: string; content: string }) => {
    if (d.kind !== "application") return d.content;
    try {
      return (JSON.parse(d.content) as Draft[]).map((x) => `## ${x.question}\n\n${x.answer}`).join("\n\n");
    } catch {
      return d.content;
    }
  };
  const save = async () => {
    if (!current) return;
    let content = edit;
    if (current.kind === "application") {
      // Re-pack edited "## question\n\nanswer" blocks into the structured format.
      const parts = edit.split(/^## /m).filter(Boolean).map((b) => {
        const [q, ...rest] = b.split("\n");
        return { question: q!.trim(), answer: rest.join("\n").trim(), sources: [] };
      });
      content = JSON.stringify(parts);
    }
    await api(`/api/ai/drafts?id=${current.id}`, { method: "PATCH", body: { content } });
    setDrafts((ds) => ds?.map((d) => (d.id === current.id ? { ...d, content, updatedAt: new Date().toISOString() } : d)) ?? null);
    toast("Draft saved");
  };
  const del = async (id: string) => {
    await api(`/api/ai/drafts?id=${id}`, { method: "DELETE" });
    setDrafts((ds) => ds?.filter((d) => d.id !== id) ?? null);
    if (open === id) setOpen(null);
  };
  if (!drafts) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-grape" /></div>;
  if (!drafts.length) return <div className="card p-10 text-center text-sm text-ink-mute">No drafts yet. Anything you generate is saved here so you can come back and edit it.</div>;
  return (
    <div className="grid gap-4 md:grid-cols-[300px_1fr]">
      <div className="space-y-2">
        {drafts.map((d) => (
          <button key={d.id} onClick={() => { setOpen(d.id); setEdit(pretty(d)); }} className={cn("card w-full p-4 text-left transition", open === d.id ? "ring-2 ring-grape" : "hover:shadow-lift")}>
            <div className="truncate font-bold">{d.title}</div>
            <div className="mt-1 flex items-center justify-between text-xs text-ink-mute"><span className="capitalize">{d.kind}</span><span>{timeAgo(d.updatedAt)}</span></div>
          </button>
        ))}
      </div>
      {current ? (
        <section className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold">{current.title}</h3>
              <p className="text-xs text-ink-mute">{current.model}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copy(edit)} className="btn-outline px-3 py-2 text-xs"><ClipboardCopy className="h-3.5 w-3.5" /> Copy</button>
              <button onClick={save} className="btn-primary px-3 py-2 text-xs"><Save className="h-3.5 w-3.5" /> Save</button>
              <button onClick={() => del(current.id)} className="btn-ghost px-2 py-2 text-coral-deep" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <textarea className="input min-h-[420px] font-mono text-[13px] leading-relaxed" value={edit} onChange={(e) => setEdit(e.target.value)} />
        </section>
      ) : (
        <div className="card hidden items-center justify-center p-10 text-sm text-ink-mute md:flex">Select a draft to view and edit it.</div>
      )}
    </div>
  );
}
