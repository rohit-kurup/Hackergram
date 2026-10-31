"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck, CalendarDays, Check, Clock, Download, ExternalLink, Globe, List, Loader2, Map as MapIcon, MapPin, Plus, Search, Share2, ShieldAlert, Sparkles, Sprout, Trophy, Users, X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useShell } from "@/components/shell/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, SampleBadge, TechTag } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { cn, formatDate, haversineKm } from "@/lib/utils";
import { CATEGORY_STYLE } from "./categories";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-[#F4F6FB]"><Loader2 className="h-7 w-7 animate-spin text-mint" /></div>,
});

export type MapEvent = {
  id: string; name: string; description: string; category: string; startsAt: string; endsAt: string | null; deadline: string | null;
  city: string; venue: string; university: string; lat: number | null; lng: number | null; isOnline: boolean; organizer: string; prize: string;
  prizeAmount: number; website: string; skills: string[]; beginnerFriendly: boolean; participants: number | null; source: string;
  verified: boolean; status: string; hgCount: number; going: boolean;
};

const DATE_RANGES = [
  { key: "all", label: "Any time", days: Infinity },
  { key: "30", label: "Next 30 days", days: 30 },
  { key: "90", label: "Next 3 months", days: 90 },
];
const DISTANCES = [
  { key: "any", label: "Anywhere", km: Infinity },
  { key: "50", label: "< 50 km", km: 50 },
  { key: "300", label: "< 300 km", km: 300 },
  { key: "1000", label: "< 1000 km", km: 1000 },
];

export function MapExperience({ events: initial, initialSelected, isAdmin, me }: { events: MapEvent[]; initialSelected: string | null; isAdmin: boolean; me: { lat: number | null; lng: number | null; location: string } }) {
  const [events, setEvents] = useState(initial);
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [view, setView] = useState<"map" | "list">("map");
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [mode, setMode] = useState<"all" | "inperson" | "online">("all");
  const [range, setRange] = useState("all");
  const [dist, setDist] = useState("any");
  const [beginner, setBeginner] = useState(false);
  const [minPrize, setMinPrize] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [origin, setOrigin] = useState(me.lat != null && me.lng != null ? { lat: me.lat, lng: me.lng } : null);
  const router = useRouter();

  useEffect(() => setEvents(initial), [initial]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    const r = DATE_RANGES.find((d) => d.key === range)!;
    const d = DISTANCES.find((x) => x.key === dist)!;
    return events
      .filter((e) => (term ? `${e.name} ${e.city} ${e.university} ${e.organizer} ${e.skills.join(" ")}`.toLowerCase().includes(term) : true))
      .filter((e) => (cats.length ? cats.includes(e.category) : true))
      .filter((e) => (mode === "online" ? e.isOnline : mode === "inperson" ? !e.isOnline : true))
      .filter((e) => (r.days === Infinity ? true : +new Date(e.startsAt) - Date.now() < r.days * 864e5))
      .filter((e) => (beginner ? e.beginnerFriendly : true))
      .filter((e) => e.prizeAmount >= minPrize)
      .filter((e) => (d.km === Infinity || !origin ? true : !e.isOnline && e.lat != null && haversineKm(origin, { lat: e.lat, lng: e.lng! }) < d.km))
      .map((e) => ({ ...e, km: origin && e.lat != null ? haversineKm(origin, { lat: e.lat, lng: e.lng! }) : null }));
  }, [events, q, cats, mode, range, dist, beginner, minPrize, origin]);

  const sel = events.find((e) => e.id === selected) ?? null;
  const center: [number, number] = origin ? [origin.lat, origin.lng] : [37.5, -96];

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude });
        setDist("300");
        toast("Showing events near you");
      },
      () => toast.error("Location permission denied"),
    );

  const runImport = async () => {
    setImporting(true);
    try {
      const r = await api("/api/events/import", { method: "POST" });
      toast(`Devpost import: ${r.created} new, ${r.updated} updated`);
      router.refresh();
    } catch {
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="relative flex h-[calc(100dvh-61px-96px)] flex-col md:h-screen md:flex-row">
      {/* Panel */}
      <section className={cn("flex w-full flex-col border-r border-paper-line bg-white md:w-[420px]", view === "map" && "hidden md:flex")}>
        <div className="space-y-3 border-b border-paper-line p-4">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-event-grad text-white"><Trophy className="h-5 w-5" /></span>
              Hackathons
            </h1>
            <button onClick={() => setSubmitOpen(true)} className="btn bg-mint px-3 py-2 text-xs text-white hover:bg-mint-deep"><Plus className="h-4 w-4" /> Submit</button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input className="input rounded-full bg-paper-off py-2.5 pl-10" placeholder="Search events, cities, universities…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {Object.entries(CATEGORY_STYLE).map(([k, s]) => (
              <button key={k} onClick={() => setCats(cats.includes(k) ? cats.filter((c) => c !== k) : [...cats, k])} className={cn("chip shrink-0 border py-1.5", cats.includes(k) ? "border-transparent text-white" : "border-paper-line bg-white text-ink-soft")} style={cats.includes(k) ? { background: s.color } : undefined}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Seg value={mode} onChange={(v) => setMode(v as typeof mode)} options={[["all", "All"], ["inperson", "In person"], ["online", "Online"]]} />
            <select className="chip border border-paper-line bg-white py-1.5 outline-none" value={range} onChange={(e) => setRange(e.target.value)}>
              {DATE_RANGES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <select className="chip border border-paper-line bg-white py-1.5 outline-none" value={dist} onChange={(e) => (origin ? setDist(e.target.value) : locate())} title={origin ? "" : "Set your location first"}>
              {DISTANCES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <select className="chip border border-paper-line bg-white py-1.5 outline-none" value={minPrize} onChange={(e) => setMinPrize(Number(e.target.value))}>
              <option value={0}>Any prize</option>
              <option value={1000}>$1k+</option>
              <option value={5000}>$5k+</option>
              <option value={10000}>$10k+</option>
            </select>
            <button onClick={() => setBeginner(!beginner)} className={cn("chip border py-1.5", beginner ? "border-transparent bg-mint-soft text-mint-deep" : "border-paper-line bg-white text-ink-soft")}><Sprout className="h-3 w-3" /> Beginner</button>
            <button onClick={locate} className="chip border border-paper-line bg-white py-1.5 text-ink-soft"><MapPin className="h-3 w-3 text-mint" /> Near me</button>
          </div>
          {isAdmin && (
            <button onClick={runImport} disabled={importing} className="btn-outline w-full py-2 text-xs">
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Import upcoming hackathons from Devpost (admin)
            </button>
          )}
        </div>
        <div className="flex-1 space-y-2.5 overflow-y-auto bg-paper-off/50 p-3">
          <p className="px-1 text-xs font-semibold text-ink-mute">{filtered.length} event{filtered.length === 1 ? "" : "s"}</p>
          {filtered.length === 0 && <EmptyState icon={CalendarDays} accent="green" title="No events match" body="Try widening your filters, or submit an event you know about." />}
          {filtered.map((e) => (
            <EventRow key={e.id} e={e} active={e.id === selected} onClick={() => { setSelected(e.id); setView("map"); }} />
          ))}
        </div>
      </section>

      {/* Map */}
      <section className={cn("relative flex-1", view === "list" && "hidden md:block")}>
        <LeafletMap
          pins={filtered}
          selectedId={selected}
          onSelect={setSelected}
          center={center}
          zoom={origin ? 6 : 4}
          flyTarget={sel && sel.lat != null ? [sel.lat, sel.lng!] : null}
        />
        <div className="pointer-events-none absolute left-3 top-3 z-[500] flex flex-wrap gap-1.5">
          {Object.entries(CATEGORY_STYLE).map(([k, s]) => (
            <span key={k} className="chip pointer-events-auto bg-white/95 text-ink-soft shadow-card"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
          ))}
        </div>
        <AnimatePresence>{sel && <EventDrawer key={sel.id} e={sel} onClose={() => setSelected(null)} onChange={(patch) => setEvents((xs) => xs.map((x) => (x.id === sel.id ? { ...x, ...patch } : x)))} isAdmin={isAdmin} />}</AnimatePresence>
      </section>

      {/* Mobile view toggle */}
      <div className="absolute bottom-4 left-1/2 z-[600] -translate-x-1/2 md:hidden">
        <button onClick={() => setView(view === "map" ? "list" : "map")} className="btn bg-ink px-5 py-3 text-white shadow-lift">
          {view === "map" ? <><List className="h-4 w-4" /> List</> : <><MapIcon className="h-4 w-4" /> Map</>}
        </button>
      </div>

      <SubmitEvent open={submitOpen} onClose={() => setSubmitOpen(false)} center={center} />
    </div>
  );
}

function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex rounded-full border border-paper-line bg-white p-0.5">
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", value === k ? "bg-ink text-white" : "text-ink-soft")}>{l}</button>
      ))}
    </div>
  );
}

export function SourceBadge({ e }: { e: Pick<MapEvent, "source" | "verified" | "status"> }) {
  if (e.status === "pending") return <span className="chip bg-sun-soft text-sun-deep"><Clock className="h-3 w-3" /> Pending review</span>;
  if (e.status === "rejected") return <span className="chip bg-coral-soft text-coral-deep">Rejected</span>;
  if (e.source === "sample") return <SampleBadge />;
  if (e.source === "devpost") return <span className="chip bg-sky-soft text-sky-deep" title="Imported from Devpost's public listing"><BadgeCheck className="h-3 w-3" /> Devpost</span>;
  return <span className="chip bg-paper-soft text-ink-soft" title="Submitted by a community member and approved by a moderator"><Users className="h-3 w-3" /> Community</span>;
}

function EventRow({ e, active, onClick }: { e: MapEvent & { km: number | null }; active: boolean; onClick: () => void }) {
  const s = CATEGORY_STYLE[e.category] ?? CATEGORY_STYLE.hackathon!;
  const d = new Date(e.startsAt);
  return (
    <motion.button layout whileHover={{ y: -2 }} onClick={onClick} className={cn("flex w-full gap-3 rounded-3xl bg-white p-3 text-left shadow-card ring-2 transition", active ? "ring-mint" : "ring-transparent hover:shadow-lift")}>
      <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}bb)` }}>
        <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</span>
        <span className="font-display text-2xl font-extrabold leading-none">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-1 font-bold">{e.name}</span>
          {e.going && <span className="chip shrink-0 bg-sun text-ink"><Check className="h-3 w-3" /> Going</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-mute">
          {e.isOnline ? <><Globe className="h-3 w-3" /> Online</> : <><MapPin className="h-3 w-3" /> {e.city || e.venue}{e.km != null && ` · ${Math.round(e.km)} km`}</>}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <SourceBadge e={e} />
          {e.prize && <span className="chip bg-tang-soft text-tang-deep">🏆 {e.prize}</span>}
          {e.hgCount > 0 && <span className="chip bg-grape-soft text-grape-deep"><Users className="h-3 w-3" /> {e.hgCount}</span>}
        </div>
      </div>
    </motion.button>
  );
}

type Attendee = { id: string; name: string; username: string; image: string | null; headline: string; lookingForTeam: boolean; skills: string[]; score: number; reason: string };

function EventDrawer({ e, onClose, onChange, isAdmin }: { e: MapEvent; onClose: () => void; onChange: (p: Partial<MapEvent>) => void; isAdmin: boolean }) {
  const s = CATEGORY_STYLE[e.category] ?? CATEGORY_STYLE.hackathon!;
  const { openComposer } = useShell();
  const router = useRouter();
  const [data, setData] = useState<{ going: boolean; lookingForTeam: boolean; attendees: Attendee[]; count: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/api/events/${e.id}`, { silent: true }).then(setData).catch(() => setData({ going: e.going, lookingForTeam: true, attendees: [], count: e.hgCount }));
  }, [e.id, e.going, e.hgCount]);

  const attend = async (going: boolean, lookingForTeam = true) => {
    setBusy(true);
    try {
      if (going) await api(`/api/events/${e.id}`, { body: { lookingForTeam } });
      else await api(`/api/events/${e.id}`, { method: "DELETE" });
      setData((d) => (d ? { ...d, going, lookingForTeam, count: d.count + (going === d.going ? 0 : going ? 1 : -1) } : d));
      onChange({ going, hgCount: e.hgCount + (going === e.going ? 0 : going ? 1 : -1) });
      if (going !== data?.going) toast(going ? "You're going! 🎉 Don't forget to register on the official site." : "Removed from your events");
    } catch {
    } finally {
      setBusy(false);
    }
  };
  const moderate = async (status: "approved" | "rejected") => {
    await api(`/api/events/${e.id}`, { method: "PATCH", body: { status } });
    toast(`Event ${status}`);
    onChange({ status });
    router.refresh();
  };

  const teammates = data?.attendees.filter((a) => a.lookingForTeam) ?? [];

  return (
    <motion.aside
      initial={{ y: "100%", opacity: 0.5 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 34 }}
      className="absolute inset-x-0 bottom-0 z-[700] max-h-[78%] overflow-y-auto rounded-t-[32px] bg-white shadow-pop md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[400px] md:rounded-[32px]"
    >
      <div className="relative overflow-hidden p-5 pb-4 text-white" style={{ background: `linear-gradient(135deg, ${s.color}, #FFD65A)` }}>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20" />
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/25 p-1.5 backdrop-blur hover:bg-white/40" aria-label="Close"><X className="h-4 w-4" /></button>
        <span className="text-3xl">{s.emoji}</span>
        <h2 className="mt-1 pr-8 text-2xl font-extrabold leading-tight drop-shadow-sm">{e.name}</h2>
        <div className="mt-1 text-sm font-medium text-white/90">{e.organizer && `by ${e.organizer}`}</div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-1.5">
          <SourceBadge e={e} />
          <span className="chip" style={{ background: `${s.color}1a`, color: s.color }}>{s.label}</span>
          {e.beginnerFriendly && <span className="chip bg-mint-soft text-mint-deep"><Sprout className="h-3 w-3" /> Beginner friendly</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info icon={CalendarDays} label="When" value={`${formatDate(e.startsAt)}${e.endsAt && e.endsAt.slice(0, 10) !== e.startsAt.slice(0, 10) ? ` – ${formatDate(e.endsAt)}` : ""}`} />
          <Info icon={e.isOnline ? Globe : MapPin} label="Where" value={e.isOnline ? "Online" : e.venue || e.city} />
          {e.deadline && <Info icon={Clock} label="Register by" value={formatDate(e.deadline)} />}
          {e.prize && <Info icon={Trophy} label="Prizes" value={e.prize} />}
          {e.participants != null && <Info icon={Users} label="Participants" value={`${e.participants.toLocaleString()}`} />}
          {e.university && <Info icon={BadgeCheck} label="Host" value={e.university} />}
        </div>

        {e.description && <p className="text-sm leading-relaxed text-ink-soft">{e.description}</p>}
        {e.skills.length > 0 && <div className="flex flex-wrap gap-1.5">{e.skills.map((t) => <TechTag key={t} name={t} />)}</div>}

        {e.status === "approved" ? (
          <div className="space-y-2">
            {data?.going ? (
              <div className="rounded-3xl bg-sun-soft p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-bold"><Check className="h-4 w-4 text-mint-deep" /> You&apos;re going</span>
                  <button onClick={() => attend(false)} disabled={busy} className="text-xs font-semibold text-ink-mute hover:text-coral">Not going</button>
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={data.lookingForTeam} onChange={(ev) => attend(true, ev.target.checked)} /> I&apos;m looking for a team
                </label>
              </div>
            ) : (
              <button onClick={() => attend(true)} disabled={busy || !data} className="btn w-full bg-mint py-3 text-white hover:bg-mint-deep">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} I&apos;m going
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/ai?event=${e.id}`} className="btn bg-ai-grad py-2.5 text-white shadow-glow"><Sparkles className="h-4 w-4" /> Apply with AI</Link>
              <button onClick={() => openComposer({ kind: "hackathon", hackathonId: e.id })} className="btn-outline py-2.5"><Share2 className="h-4 w-4" /> Share</button>
            </div>
            {e.website && (
              <a href={e.website} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full text-sm"><ExternalLink className="h-4 w-4" /> Official website & registration</a>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-sun-soft p-4 text-sm text-sun-deep">
            <ShieldAlert className="mb-1 h-4 w-4" />
            This community submission is awaiting moderator review and is only visible to you{isAdmin ? " and admins" : ""}.
            {isAdmin && e.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => moderate("approved")} className="btn bg-mint px-4 py-2 text-xs text-white">Approve</button>
                <button onClick={() => moderate("rejected")} className="btn bg-white px-4 py-2 text-xs text-coral-deep">Reject</button>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">Hackergrammers going</h3>
            <span className="text-xs font-semibold text-ink-mute">{data?.count ?? e.hgCount}</span>
          </div>
          {!data ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-faint" />
          ) : data.attendees.length === 0 ? (
            <p className="text-sm text-ink-mute">No one yet. Be the first and find teammates here.</p>
          ) : (
            <>
              {teammates.length > 0 && <p className="eyebrow mb-2 text-coral">Looking for a team</p>}
              <div className="space-y-1">
                {data.attendees.slice(0, 8).map((a) => (
                  <Link key={a.id} href={`/u/${a.username}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-paper-off">
                    <Avatar name={a.name} src={a.image} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate text-sm font-bold">{a.name} {a.lookingForTeam && <span className="h-2 w-2 rounded-full bg-coral" title="Looking for team" />}</div>
                      <div className="truncate text-xs text-ink-mute">{a.reason || a.skills.join(" · ")}</div>
                    </div>
                    <span className="chip bg-grape-soft text-grape-deep">{a.score}%</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-paper-off p-3">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-mute"><Icon className="h-3 w-3" /> {label}</div>
      <div className="mt-0.5 line-clamp-2 font-semibold">{value}</div>
    </div>
  );
}

function SubmitEvent({ open, onClose, center }: { open: boolean; onClose: () => void; center: [number, number] }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", description: "", category: "hackathon", startsAt: "", endsAt: "", deadline: "", city: "", venue: "", university: "", isOnline: false, organizer: "", prize: "", prizeAmount: 0, website: "", beginnerFriendly: false, skills: "" });
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api("/api/events", {
        body: { ...f, prizeAmount: Number(f.prizeAmount) || 0, skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean), lat: pos?.[0] ?? null, lng: pos?.[1] ?? null },
      });
      toast(r.status === "approved" ? "Event published" : "Thanks! A moderator will review your event soon.");
      onClose();
      router.refresh();
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Submit an event" className="sm:max-w-2xl">
      <p className="-mt-2 mb-4 text-sm text-ink-mute">Community submissions are reviewed before appearing on the map, and are labeled as community-submitted. Please only submit real events with an official website.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input sm:col-span-2" placeholder="Event name" value={f.name} onChange={set("name")} />
        <select className="input" value={f.category} onChange={set("category")}>
          {Object.entries(CATEGORY_STYLE).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <input className="input" placeholder="Official website (https://…)" value={f.website} onChange={set("website")} />
        <label className="text-xs font-semibold text-ink-mute">Starts<input className="input mt-1" type="date" value={f.startsAt} onChange={set("startsAt")} /></label>
        <label className="text-xs font-semibold text-ink-mute">Ends<input className="input mt-1" type="date" value={f.endsAt} onChange={set("endsAt")} /></label>
        <label className="text-xs font-semibold text-ink-mute">Registration deadline<input className="input mt-1" type="date" value={f.deadline} onChange={set("deadline")} /></label>
        <input className="input self-end" placeholder="Organizer" value={f.organizer} onChange={set("organizer")} />
        <input className="input" placeholder="Prize (e.g. $10,000 in prizes)" value={f.prize} onChange={set("prize")} />
        <input className="input" type="number" min={0} placeholder="Prize total in USD" value={f.prizeAmount || ""} onChange={set("prizeAmount")} />
        <input className="input sm:col-span-2" placeholder="Themes / skills (comma separated)" value={f.skills} onChange={set("skills")} />
        <textarea className="input min-h-20 sm:col-span-2" placeholder="Description" value={f.description} onChange={set("description")} />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="button" onClick={() => setF({ ...f, isOnline: !f.isOnline })} className={cn("chip px-3 py-2", f.isOnline ? "bg-ink text-white" : "border border-paper-line")}>{f.isOnline ? "✓ " : ""}Online event</button>
          <button type="button" onClick={() => setF({ ...f, beginnerFriendly: !f.beginnerFriendly })} className={cn("chip px-3 py-2", f.beginnerFriendly ? "bg-ink text-white" : "border border-paper-line")}>{f.beginnerFriendly ? "✓ " : ""}Beginner friendly</button>
        </div>
        {!f.isOnline && (
          <>
            <input className="input" placeholder="City" value={f.city} onChange={set("city")} />
            <input className="input" placeholder="Venue / university" value={f.venue} onChange={set("venue")} />
            <div className="h-56 overflow-hidden rounded-3xl border border-paper-line sm:col-span-2">
              {open && <LeafletMap pins={[]} center={center} zoom={4} onPick={(lat, lng) => setPos([lat, lng])} picked={pos} />}
            </div>
            <p className="text-xs text-ink-mute sm:col-span-2">{pos ? `📍 ${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}` : "Click the map to drop a pin at the venue."}</p>
          </>
        )}
      </div>
      <button className="btn bg-mint mt-5 w-full py-3 text-white hover:bg-mint-deep" disabled={busy || !f.name || !f.startsAt || !f.website} onClick={submit}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit for review
      </button>
    </Modal>
  );
}
