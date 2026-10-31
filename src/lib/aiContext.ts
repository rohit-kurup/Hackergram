import "server-only";
import { db } from "./db";
import { parseList, parseObj } from "./json";
import type { GithubStats } from "./github";

/**
 * Builds a factual profile dossier for the model. Every line is labeled with its
 * source so the model (and the user) can tell GitHub data from self-reported data.
 */
export async function profileContext(userId: string) {
  const u = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      education: true,
      experience: true,
      projects: { orderBy: [{ pinned: "desc" }, { stars: "desc" }], take: 8 },
      repos: { where: { isFork: false, isPrivate: false }, orderBy: [{ stars: "desc" }, { pushedAt: "desc" }], take: 8 },
      attendance: { include: { hackathon: { select: { name: true } } }, take: 10 },
    },
  });
  const gh = parseObj<GithubStats & { sample?: boolean }>(u.githubStats, {});
  const langs = Object.entries(gh.languageBytes ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([l]) => l);

  const lines: string[] = [
    `# Profile of ${u.name} (@${u.username})`,
    `[self-reported] Headline: ${u.headline || "—"}`,
    `[self-reported] Bio: ${u.bio || "—"}`,
    `[self-reported] Location: ${u.location || "—"}`,
    `[self-reported] University: ${u.university || "—"}${u.major ? `, ${u.major}` : ""}${u.gradYear ? `, class of ${u.gradYear}` : ""}`,
    `[self-reported] Current role: ${u.company || "—"}`,
    `[self-reported] Languages: ${parseList(u.languages).join(", ") || "—"}`,
    `[self-reported] Frameworks/tools: ${parseList(u.technologies).join(", ") || "—"}`,
    `[self-reported] Interests: ${parseList(u.interests).join(", ") || "—"}`,
    `[self-reported] Wants to build: ${parseList(u.projectTypes).join(", ") || "—"}`,
  ];
  for (const e of u.education) lines.push(`[self-reported] Education: ${[e.degree, e.field].filter(Boolean).join(" ")} at ${e.school} ${e.startYear ?? ""}–${e.endYear ?? ""}`);
  for (const e of u.experience) lines.push(`[self-reported] ${e.kind}: ${e.title} at ${e.org} (${e.start}${e.current ? "–present" : e.end ? `–${e.end}` : ""})${e.description ? `: ${e.description}` : ""}`);
  for (const p of u.projects) {
    lines.push(`[${p.source === "github" ? "GitHub" : "self-reported"}] Project "${p.title}": ${p.tagline || p.description.slice(0, 200)} | tech: ${parseList(p.tech).join(", ")} | ${p.stars} stars${p.repoUrl ? ` | ${p.repoUrl}` : ""}`);
  }
  if (u.githubUsername) {
    lines.push(`[GitHub] Username: ${u.githubUsername}`);
    if (langs.length) lines.push(`[GitHub] Languages by code volume: ${langs.join(", ")}`);
    if (gh.totalContributions != null) lines.push(`[GitHub] Contributions in the last 12 months: ${gh.totalContributions} (commits ${gh.commits ?? "?"}, PRs ${gh.pullRequests ?? "?"}, merged PRs ${gh.mergedPullRequests ?? "?"}, issues ${gh.issues ?? "?"})`);
    for (const r of u.repos) {
      lines.push(`[GitHub] Repo ${r.fullName}: ${r.description || "no description"} | ${r.language ?? ""} | ${r.stars}★ | topics: ${parseList(r.topics).join(", ")}${r.readme ? `\n  README excerpt: ${r.readme.replace(/\s+/g, " ").slice(0, 500)}` : ""}`);
    }
  } else if (gh.sample) {
    lines.push(`[sample] This is a demo profile; GitHub statistics are illustrative.`);
  }
  if (u.attendance.length) lines.push(`[Hackergram] Attending: ${u.attendance.map((a) => a.hackathon.name).join(", ")}`);
  return { text: lines.join("\n"), user: u, langs };
}
