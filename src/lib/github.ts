import "server-only";
import { db } from "./db";
import { decrypt } from "./crypto";
import { parseList, toList } from "./json";

const API = "https://api.github.com";

export const githubConfigured = () => Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

/** read:user + user:email by default. `repo` (private repo read) only if the user opts in. */
export function authorizeUrl(state: string, includePrivate: boolean) {
  const scopes = ["read:user", "user:email", ...(includePrivate ? ["repo"] : [])];
  const p = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/github/callback`,
    scope: scopes.join(" "),
    state,
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${p}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
  });
  const data = (await res.json()) as { access_token?: string; scope?: string; error_description?: string };
  if (!data.access_token) throw new Error(data.error_description ?? "GitHub token exchange failed");
  return { token: data.access_token, scope: data.scope ?? "" };
}

export async function gh<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Hackergram",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    throw new Error("GitHub API rate limit reached. Try syncing again later.");
  }
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export type GhUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string;
  email: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
};

type GhRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  private: boolean;
  fork: boolean;
  pushed_at: string | null;
  created_at: string;
  owner: { login: string };
};

type GhEvent = {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload: any;
};

export type GithubStats = {
  login?: string;
  followers?: number;
  following?: number;
  publicRepos?: number;
  totalStars?: number;
  totalForks?: number;
  languageBytes?: Record<string, number>;
  calendar?: { date: string; count: number }[];
  totalContributions?: number;
  commits?: number;
  pullRequests?: number;
  mergedPullRequests?: number;
  issues?: number;
  reviews?: number;
  restricted?: number;
  accountCreated?: string;
  includesPrivate?: boolean;
  limitations?: string[];
};

export async function getGithubToken(userId: string) {
  const acct = await db.account.findFirst({ where: { userId, provider: "github" } });
  return acct ? { token: decrypt(acct.accessTokenEnc), scope: acct.scope } : null;
}

async function contributionData(token: string) {
  const query = `query {
    viewer {
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
        contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
      }
    }
  }`;
  const res = await gh<any>(token, "/graphql", { method: "POST", body: JSON.stringify({ query }) });
  const c = res?.data?.viewer?.contributionsCollection;
  if (!c) return null;
  return {
    commits: c.totalCommitContributions as number,
    pullRequests: c.totalPullRequestContributions as number,
    issues: c.totalIssueContributions as number,
    reviews: c.totalPullRequestReviewContributions as number,
    restricted: c.restrictedContributionsCount as number,
    totalContributions: c.contributionCalendar.totalContributions as number,
    calendar: (c.contributionCalendar.weeks as any[]).flatMap((w) =>
      (w.contributionDays as any[]).map((d) => ({ date: d.date as string, count: d.contributionCount as number })),
    ),
  };
}

function describeEvent(e: GhEvent): { title: string; url: string } | null {
  const repoUrl = `https://github.com/${e.repo.name}`;
  switch (e.type) {
    case "PushEvent":
      return { title: `Pushed ${e.payload.size ?? e.payload.commits?.length ?? ""} commit(s) to ${e.repo.name}`.replace("  ", " "), url: repoUrl };
    case "PullRequestEvent":
      return {
        title: `${e.payload.action === "closed" && e.payload.pull_request?.merged ? "Merged" : cap(e.payload.action)} PR: ${e.payload.pull_request?.title ?? ""}`,
        url: e.payload.pull_request?.html_url ?? repoUrl,
      };
    case "IssuesEvent":
      return { title: `${cap(e.payload.action)} issue: ${e.payload.issue?.title ?? ""}`, url: e.payload.issue?.html_url ?? repoUrl };
    case "CreateEvent":
      return e.payload.ref_type === "repository" ? { title: `Created repository ${e.repo.name}`, url: repoUrl } : null;
    case "WatchEvent":
      return { title: `Starred ${e.repo.name}`, url: repoUrl };
    case "ForkEvent":
      return { title: `Forked ${e.repo.name}`, url: repoUrl };
    case "ReleaseEvent":
      return { title: `Released ${e.payload.release?.tag_name ?? ""} of ${e.repo.name}`, url: e.payload.release?.html_url ?? repoUrl };
    case "PullRequestReviewEvent":
      return { title: `Reviewed a PR in ${e.repo.name}`, url: e.payload.pull_request?.html_url ?? repoUrl };
    default:
      return null;
  }
}
const cap = (s?: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : "");

/**
 * Pulls everything GitHub's APIs expose for this user and writes it to the DB.
 * Honest about limits: the events API only covers ~90 days / 300 events, the
 * contribution calendar covers the last year, and private data appears only if
 * the user granted the `repo` scope (and enabled private contributions on GitHub).
 */
export async function syncGithub(userId: string) {
  const creds = await getGithubToken(userId);
  if (!creds) throw new Error("GitHub is not connected");
  const { token, scope } = creds;
  const includesPrivate = scope.split(/[ ,]/).includes("repo");

  const me = await gh<GhUser>(token, "/user");
  const repos: GhRepo[] = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await gh<GhRepo[]>(
      token,
      `/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner${includesPrivate ? "" : "&visibility=public"}`,
    );
    repos.push(...batch);
    if (batch.length < 100) break;
  }

  // Languages (bytes) for the 15 most recently pushed non-fork repos.
  const own = repos.filter((r) => !r.fork);
  const languageBytes: Record<string, number> = {};
  const repoLangs = new Map<number, Record<string, number>>();
  await Promise.all(
    own.slice(0, 15).map(async (r) => {
      try {
        const langs = await gh<Record<string, number>>(token, `/repos/${r.full_name}/languages`);
        repoLangs.set(r.id, langs);
        for (const [l, b] of Object.entries(langs)) languageBytes[l] = (languageBytes[l] ?? 0) + b;
      } catch {}
    }),
  );
  if (Object.keys(languageBytes).length === 0) {
    for (const r of own) if (r.language) languageBytes[r.language] = (languageBytes[r.language] ?? 0) + 1;
  }

  // README excerpts for the top 6 repos by stars.
  const top = [...own].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
  const readmes = new Map<number, string>();
  await Promise.all(
    top.map(async (r) => {
      try {
        const res = await fetch(`${API}/repos/${r.full_name}/readme`, {
          headers: { Accept: "application/vnd.github.raw+json", Authorization: `Bearer ${token}`, "User-Agent": "Hackergram" },
          cache: "no-store",
        });
        if (res.ok) readmes.set(r.id, (await res.text()).slice(0, 2000));
      } catch {}
    }),
  );

  const contrib = await contributionData(token).catch(() => null);
  const merged = await gh<{ total_count: number }>(token, `/search/issues?q=${encodeURIComponent(`is:pr author:${me.login} is:merged`)}&per_page=1`)
    .then((r) => r.total_count)
    .catch(() => undefined);
  const events = await gh<GhEvent[]>(token, `/users/${me.login}/events?per_page=100`).catch(() => [] as GhEvent[]);

  const stats: GithubStats = {
    login: me.login,
    followers: me.followers,
    following: me.following,
    publicRepos: me.public_repos,
    totalStars: own.reduce((s, r) => s + r.stargazers_count, 0),
    totalForks: own.reduce((s, r) => s + r.forks_count, 0),
    languageBytes,
    accountCreated: me.created_at,
    includesPrivate,
    mergedPullRequests: merged,
    ...(contrib ?? {}),
    limitations: [
      "Contribution totals cover the last 12 months, as reported by GitHub's GraphQL API.",
      "Recent activity comes from the Events API, which only returns the last 90 days (max 300 events).",
      includesPrivate
        ? "Private repositories are included because you granted the `repo` scope."
        : "Only public repositories are included. Reconnect with private access to include private repos.",
      "Language stats are measured in bytes across your 15 most recently pushed repositories.",
    ],
  };

  await db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const topLangs = Object.entries(languageBytes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([l]) => l);
    await tx.user.update({
      where: { id: userId },
      data: {
        githubUsername: me.login,
        githubSyncedAt: new Date(),
        githubStats: JSON.stringify(stats),
        image: user.image ?? me.avatar_url,
        bio: user.bio || me.bio || "",
        location: user.location || me.location || "",
        company: user.company || (me.company ?? "").replace(/^@/, ""),
        // Merge GitHub-derived languages into the user's list (never removes user-entered ones).
        languages: toList([...parseList(user.languages), ...topLangs]),
      },
    });

    const keepIds = repos.map((r) => r.id);
    await tx.githubRepo.deleteMany({ where: { userId, githubId: { notIn: keepIds } } });
    for (const r of repos) {
      const data = {
        name: r.name,
        fullName: r.full_name,
        description: r.description ?? "",
        url: r.html_url,
        homepage: r.homepage ?? "",
        language: r.language,
        languages: JSON.stringify(repoLangs.get(r.id) ?? {}),
        topics: JSON.stringify(r.topics ?? []),
        stars: r.stargazers_count,
        forks: r.forks_count,
        isPrivate: r.private,
        isFork: r.fork,
        readme: readmes.get(r.id) ?? null,
        pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
        createdAtGh: new Date(r.created_at),
        syncedAt: new Date(),
      };
      await tx.githubRepo.upsert({
        where: { userId_githubId: { userId, githubId: r.id } },
        create: { userId, githubId: r.id, ...data },
        update: data,
      });
    }

    for (const e of events) {
      const d = describeEvent(e);
      if (!d) continue;
      await tx.githubActivity.upsert({
        where: { userId_eventId: { userId, eventId: e.id } },
        create: { userId, eventId: e.id, type: e.type, repo: e.repo.name, title: d.title, url: d.url, occurredAt: new Date(e.created_at) },
        update: {},
      });
    }

    // Seed portfolio projects from the best public repos (first sync only per repo).
    const existing = await tx.project.findMany({ where: { ownerId: userId, source: "github" }, select: { githubRepoId: true } });
    const have = new Set(existing.map((p) => p.githubRepoId));
    const best = own
      .filter((r) => !r.private)
      .sort((a, b) => b.stargazers_count * 3 + +new Date(b.pushed_at ?? 0) / 1e10 - (a.stargazers_count * 3 + +new Date(a.pushed_at ?? 0) / 1e10))
      .slice(0, 6);
    const colors = ["blue", "purple", "coral", "green", "orange", "cyan"];
    let i = 0;
    for (const r of best) {
      if (have.has(String(r.id))) {
        await tx.project.updateMany({
          where: { ownerId: userId, githubRepoId: String(r.id) },
          data: { stars: r.stargazers_count, forks: r.forks_count },
        });
        continue;
      }
      const langs = Object.keys(repoLangs.get(r.id) ?? {}).slice(0, 4);
      await tx.project.create({
        data: {
          ownerId: userId,
          title: r.name,
          tagline: r.description ?? "",
          description: r.description ?? "",
          tech: toList([...(langs.length ? langs : r.language ? [r.language] : []), ...(r.topics ?? []).slice(0, 3)]),
          category: guessCategory(r),
          repoUrl: r.html_url,
          demoUrl: r.homepage ?? "",
          stars: r.stargazers_count,
          forks: r.forks_count,
          source: "github",
          githubRepoId: String(r.id),
          color: colors[i++ % colors.length]!,
          thumbnail: `https://opengraph.githubassets.com/1/${r.full_name}`,
        },
      });
    }
  });

  return stats;
}

function guessCategory(r: GhRepo) {
  const t = `${r.name} ${r.description ?? ""} ${(r.topics ?? []).join(" ")}`.toLowerCase();
  if (/(ml|machine-learning|ai|llm|neural|model|gpt|torch|tensorflow)/.test(t)) return "AI / ML";
  if (/(ios|android|mobile|flutter|react-native|swift)/.test(t)) return "Mobile";
  if (/(cli|devtool|tooling|plugin|extension|lint|sdk)/.test(t)) return "Dev Tools";
  if (/(game|unity|godot)/.test(t)) return "Games";
  if (/(blockchain|web3|solidity|crypto)/.test(t)) return "Web3";
  if (/(data|analytics|dashboard|viz)/.test(t)) return "Data";
  return "Web";
}

/** Fetch a public repo preview for posts. Uses the user's token when available. */
export async function repoPreview(repoUrl: string, token?: string) {
  const m = repoUrl.match(/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  if (!m) return null;
  const full = `${m[1]}/${m[2]!.replace(/\.git$/, "")}`;
  try {
    const res = await fetch(`${API}/repos/${full}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Hackergram",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { fullName: full, url: `https://github.com/${full}`, description: "", stars: 0, forks: 0, language: null, verified: false };
    const r = (await res.json()) as GhRepo;
    if (r.private) return null; // never leak private repo metadata into public posts
    return {
      fullName: r.full_name,
      url: r.html_url,
      description: r.description ?? "",
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      topics: (r.topics ?? []).slice(0, 4),
      verified: true,
    };
  } catch {
    return { fullName: full, url: `https://github.com/${full}`, description: "", stars: 0, forks: 0, language: null, verified: false };
  }
}
