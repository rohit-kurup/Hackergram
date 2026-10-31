"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Github, GraduationCap, Heart, Loader2, Rocket, Sparkles, User, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { TagPicker } from "@/components/ui/TagPicker";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { AVAILABILITY, INTERESTS, LANGUAGES, PROJECT_TYPES, TECHNOLOGIES } from "@/lib/catalog";
import { ACCENTS, cn, type Accent } from "@/lib/utils";

type Form = {
  name: string;
  username: string;
  image: string | null;
  headline: string;
  bio: string;
  location: string;
  lat: number | null;
  lng: number | null;
  university: string;
  major: string;
  gradYear: number | null;
  company: string;
  languages: string[];
  technologies: string[];
  interests: string[];
  projectTypes: string[];
  lookingForCollab: boolean;
  openToHackathons: boolean;
  availability: string;
  accent: Accent;
  githubUsername: string | null;
};

const STEPS = [
  { key: "github", title: "Bring your code", icon: Github, color: "#15131F" },
  { key: "basics", title: "The basics", icon: User, color: "#8257FF" },
  { key: "school", title: "School & work", icon: GraduationCap, color: "#4285FF" },
  { key: "skills", title: "Your toolkit", icon: Wrench, color: "#FF984F" },
  { key: "interests", title: "What excites you", icon: Heart, color: "#FF668C" },
  { key: "collab", title: "Ready to team up?", icon: Rocket, color: "#35C98A" },
] as const;

export function OnboardingFlow({ initial, githubConfigured }: { initial: Form; githubConfigured: boolean }) {
  const [f, setF] = useState<Form>(initial);
  const [step, setStep] = useState(initial.githubUsername ? 1 : 0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const go = (d: number) => {
    setDir(d);
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + d)));
  };

  const finish = async () => {
    setSaving(true);
    try {
      const { githubUsername, image, ...payload } = f;
      await api("/api/me", { method: "PATCH", body: { ...payload, onboarded: true } });
      toast("Welcome to Hackergram! 🎉");
      router.push("/");
      router.refresh();
    } catch {
      setSaving(false);
    }
  };

  const canNext = step !== 1 || (f.name.trim() && f.username.trim().length >= 3);
  const S = STEPS[step]!;

  return (
    <div className="min-h-screen bg-paper-off">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-6">
        <div className="flex items-center justify-between">
          <LogoMark size={36} />
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <motion.span
                key={s.key}
                className="h-2 rounded-full"
                animate={{ width: i === step ? 28 : 8, background: i <= step ? s.color : "#E4E3EC" }}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-ink-mute">
            {step + 1}/{STEPS.length}
          </span>
        </div>

        <div className="relative flex-1 py-10">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -60 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="mb-8 flex items-center gap-4">
                <motion.span
                  initial={{ rotate: -20, scale: 0.6 }}
                  animate={{ rotate: -6, scale: 1 }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lift"
                  style={{ background: S.color }}
                >
                  <S.icon className="h-7 w-7" />
                </motion.span>
                <div>
                  <h1 className="text-3xl font-extrabold">{S.title}</h1>
                  <p className="text-sm text-ink-mute">{SUBTITLES[S.key]}</p>
                </div>
              </div>

              {S.key === "github" && (
                <div className="space-y-4">
                  {f.githubUsername ? (
                    <div className="card flex items-center gap-4 p-5">
                      <Avatar name={f.name} src={f.image} size={52} />
                      <div className="flex-1">
                        <div className="font-bold">Connected as @{f.githubUsername}</div>
                        <div className="text-sm text-ink-mute">We imported your repos, languages and activity.</div>
                      </div>
                      <Check className="h-6 w-6 text-mint" />
                    </div>
                  ) : (
                    <div className="card overflow-hidden">
                      <div className="bg-gradient-to-br from-[#15131F] to-[#3a2f6b] p-6 text-white">
                        <Github className="h-9 w-9" />
                        <h3 className="mt-3 text-xl font-bold">Your portfolio, built from your GitHub</h3>
                        <ul className="mt-3 space-y-1.5 text-sm text-white/80">
                          <li>✦ Top repositories become portfolio projects</li>
                          <li>✦ Language breakdown & contribution chart</li>
                          <li>✦ Better teammate matches from real code</li>
                        </ul>
                      </div>
                      <div className="space-y-3 p-5">
                        {githubConfigured ? (
                          <>
                            <a href="/api/auth/github?mode=connect" className="btn w-full bg-ink py-3 text-white hover:shadow-lift">
                              <Github className="h-5 w-5" /> Connect GitHub (public repos)
                            </a>
                            <a href="/api/auth/github?mode=connect&private=1" className="btn-outline w-full py-3">
                              Include private repos too
                            </a>
                            <p className="text-center text-xs text-ink-mute">
                              We request read-only access. Private repos are only read if you choose that option, and are never shown publicly without your say.
                            </p>
                          </>
                        ) : (
                          <p className="rounded-2xl bg-sun-soft p-4 text-sm text-sun-deep">
                            GitHub OAuth isn&apos;t configured on this server yet, so you can skip this for now and connect later from Settings.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {S.key === "basics" && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Full name</label>
                      <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Username</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">@</span>
                        <input
                          className="input pl-8"
                          value={f.username}
                          onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="label">Headline</label>
                    <input className="input" maxLength={120} placeholder="CS @ UT Austin · building AI tools for students" value={f.headline} onChange={(e) => set("headline", e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Short bio</label>
                    <textarea className="input min-h-24 resize-none" maxLength={400} placeholder="What do you love building?" value={f.bio} onChange={(e) => set("bio", e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Where are you based?</label>
                    <LocationPicker value={{ location: f.location, lat: f.lat, lng: f.lng }} onChange={(v) => setF((x) => ({ ...x, ...v }))} />
                  </div>
                </div>
              )}

              {S.key === "school" && (
                <div className="space-y-5">
                  <div>
                    <label className="label">University</label>
                    <input className="input" placeholder="The University of Texas at Austin" value={f.university} onChange={(e) => set("university", e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                    <div>
                      <label className="label">Major</label>
                      <input className="input" placeholder="Computer Science" value={f.major} onChange={(e) => set("major", e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Grad year</label>
                      <input
                        className="input"
                        type="number"
                        min={1950}
                        max={2040}
                        placeholder="2027"
                        value={f.gradYear ?? ""}
                        onChange={(e) => set("gradYear", e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Current job or internship</label>
                    <input className="input" placeholder="SWE Intern @ Acme" value={f.company} onChange={(e) => set("company", e.target.value)} />
                  </div>
                  <p className="text-xs text-ink-mute">You can add previous experience and certifications from your profile later.</p>
                </div>
              )}

              {S.key === "skills" && (
                <div className="space-y-7">
                  <div>
                    <label className="label">Programming languages</label>
                    <TagPicker value={f.languages} onChange={(v) => set("languages", v)} suggestions={LANGUAGES} accent="orange" />
                  </div>
                  <div>
                    <label className="label">Frameworks & tools</label>
                    <TagPicker value={f.technologies} onChange={(v) => set("technologies", v)} suggestions={TECHNOLOGIES} accent="blue" />
                  </div>
                </div>
              )}

              {S.key === "interests" && (
                <div className="space-y-7">
                  <div>
                    <label className="label">Topics you care about</label>
                    <TagPicker value={f.interests} onChange={(v) => set("interests", v)} suggestions={INTERESTS} accent="coral" />
                  </div>
                  <div>
                    <label className="label">Projects you want to build</label>
                    <TagPicker value={f.projectTypes} onChange={(v) => set("projectTypes", v)} suggestions={PROJECT_TYPES} accent="purple" />
                  </div>
                </div>
              )}

              {S.key === "collab" && (
                <div className="space-y-5">
                  <Toggle
                    on={f.lookingForCollab}
                    onChange={(v) => set("lookingForCollab", v)}
                    title="Looking for collaborators"
                    body="Show up in Hackergram Match and project recommendations."
                    color="#FF668C"
                  />
                  <Toggle
                    on={f.openToHackathons}
                    onChange={(v) => set("openToHackathons", v)}
                    title="Open to hackathon teams"
                    body="Let people attending the same events find you."
                    color="#35C98A"
                  />
                  <div>
                    <label className="label">Availability</label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABILITY.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => set("availability", a)}
                          className={cn("chip px-3.5 py-2 text-[13px]", f.availability === a ? "bg-ink text-white" : "border border-paper-line bg-white text-ink-soft")}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Pick your profile color</label>
                    <div className="flex gap-3">
                      {(Object.keys(ACCENTS) as Accent[]).map((k) => (
                        <motion.button
                          type="button"
                          key={k}
                          whileHover={{ scale: 1.12 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => set("accent", k)}
                          aria-label={k}
                          className={cn("h-10 w-10 rounded-full bg-gradient-to-br ring-offset-2", ACCENTS[k].grad, f.accent === k && "ring-2 ring-ink")}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-paper-line pt-5">
          <button className="btn-ghost" onClick={() => go(-1)} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn-primary px-6" onClick={() => go(1)} disabled={!canNext}>
              {step === 0 && !f.githubUsername ? "Skip for now" : "Continue"} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button className="btn-brand px-6" onClick={finish} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Enter Hackergram
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const SUBTITLES: Record<string, string> = {
  github: "Connect GitHub and your profile builds itself.",
  basics: "How should other builders know you?",
  school: "Helps us find classmates and nearby hackathons.",
  skills: "Tap to add. Type anything we missed.",
  interests: "We use these to match you with the right people.",
  collab: "Last step. Tell people how you like to work.",
};

function Toggle({ on, onChange, title, body, color }: { on: boolean; onChange: (v: boolean) => void; title: string; body: string; color: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="card flex w-full items-center gap-4 p-4 text-left transition hover:shadow-lift">
      <div className="flex-1">
        <div className="font-bold">{title}</div>
        <div className="text-sm text-ink-mute">{body}</div>
      </div>
      <span className="relative h-7 w-12 rounded-full transition-colors" style={{ background: on ? color : "#E4E3EC" }}>
        <motion.span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow" animate={{ left: on ? 24 : 4 }} />
      </span>
    </button>
  );
}
