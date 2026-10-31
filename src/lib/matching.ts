import { parseList } from "./json";
import { haversineKm } from "./utils";

type MatchUser = {
  id: string;
  languages: string;
  technologies: string;
  interests: string;
  projectTypes: string;
  university: string;
  location: string;
  lat: number | null;
  lng: number | null;
  availability: string;
  lookingForCollab: boolean;
  githubStats?: string;
};

type ProjectNeeds = { requiredSkills: string; rolesNeeded: string; tech: string; category: string; remote: boolean; location: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.]/g, "");
const skillsOf = (u: MatchUser) => [...parseList(u.languages), ...parseList(u.technologies)];

function overlap(a: string[], b: string[]) {
  const nb = new Map(b.map((x) => [norm(x), x]));
  return a.filter((x) => nb.has(norm(x)));
}

/**
 * Transparent, explainable scoring (0–100). Every point maps to a reason
 * shown on the card, so users can see *why* someone was recommended.
 */
export function scoreCandidate(me: MatchUser, c: MatchUser, project?: ProjectNeeds | null) {
  const reasons: string[] = [];
  let score = 0;
  const mySkills = skillsOf(me);
  const theirSkills = skillsOf(c);
  const shared = overlap(theirSkills, mySkills);
  const sharedInterests = overlap(parseList(c.interests), parseList(me.interests));
  const complementary = theirSkills.filter((s) => !mySkills.some((m) => norm(m) === norm(s)));

  if (project) {
    const need = [...parseList(project.requiredSkills), ...parseList(project.tech)];
    const hits = overlap(theirSkills, need);
    const pct = need.length ? hits.length / need.length : 0;
    score += Math.round(pct * 45);
    if (hits.length) reasons.push(`Has ${hits.slice(0, 3).join(", ")} for this project`);
    if (parseList(c.projectTypes).some((t) => norm(t) === norm(project.category))) {
      score += 10;
      reasons.push(`Wants to build ${project.category} projects`);
    }
  } else {
    score += Math.min(20, shared.length * 5);
    if (shared.length) reasons.push(`You both use ${shared.slice(0, 3).join(", ")}`);
    score += Math.min(20, complementary.length * 3);
    if (complementary.length) reasons.push(`Brings ${complementary.slice(0, 2).join(" & ")} to the table`);
  }

  score += Math.min(15, sharedInterests.length * 5);
  if (sharedInterests.length) reasons.push(`Shared interest in ${sharedInterests.slice(0, 2).join(" & ")}`);

  if (me.university && c.university && norm(me.university) === norm(c.university)) {
    score += 10;
    reasons.push(`Also at ${c.university}`);
  }

  if (me.lat != null && me.lng != null && c.lat != null && c.lng != null) {
    const km = haversineKm({ lat: me.lat, lng: me.lng }, { lat: c.lat, lng: c.lng });
    if (km < 50) {
      score += 10;
      reasons.push("Lives nearby");
    } else if (km < 300) score += 4;
  }

  if (c.lookingForCollab) score += 8;
  if (me.availability && norm(me.availability) === norm(c.availability)) {
    score += 5;
    reasons.push(`Same availability: ${c.availability}`);
  }

  const stats = c.githubStats ? safe(c.githubStats) : {};
  if ((stats.totalContributions ?? 0) > 200) score += 7;

  return { score: Math.min(100, score), reasons: reasons.slice(0, 4), shared, sharedInterests, complementary: complementary.slice(0, 6) };
}

function safe(s: string): { totalContributions?: number } {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

/** Deterministic project ideas from shared skills & interests (no AI required). */
export function projectIdeasFor(shared: string[], interests: string[]) {
  const i = interests.map((x) => x.toLowerCase()).join(" ");
  const s = shared.length ? shared.slice(0, 2).join(" + ") : "your combined stack";
  const ideas: string[] = [];
  if (/ai|ml|machine/.test(i)) ideas.push(`An AI study buddy that turns lecture notes into quizzes, built with ${s}`);
  if (/health|med/.test(i)) ideas.push(`A symptom journal with privacy-first local storage using ${s}`);
  if (/climate|sustain|energy/.test(i)) ideas.push(`A campus energy-usage tracker with live dashboards in ${s}`);
  if (/fin|crypto|web3/.test(i)) ideas.push(`A split-the-bill app for student clubs using ${s}`);
  if (/game/.test(i)) ideas.push(`A multiplayer coding-puzzle game built on ${s}`);
  if (/dev ?tools|open source/.test(i)) ideas.push(`A CLI that auto-writes changelogs from commits, in ${s}`);
  ideas.push(`A hackathon team-finder bot for Discord built with ${s}`);
  ideas.push(`A "what should I build?" idea generator seeded from both your GitHub repos`);
  return ideas.slice(0, 3);
}
