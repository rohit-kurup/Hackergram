import "server-only";
import { db } from "./db";

/** Generates a unique username from a seed (name, email local-part, or GitHub login). */
export async function uniqueUsername(seed: string) {
  const base =
    seed
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9_.]/g, "")
      .slice(0, 18) || "builder";
  let candidate = base.length >= 3 ? base : `${base}dev`;
  for (let i = 0; i < 50; i++) {
    const exists = await db.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
    candidate = `${base}${Math.floor(Math.random() * 9000 + 100)}`;
  }
  return `${base}${Date.now().toString(36)}`;
}

/** Fields safe to send to other users. Never includes email, tokens or password hashes. */
export const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  headline: true,
  bio: true,
  location: true,
  university: true,
  major: true,
  gradYear: true,
  company: true,
  languages: true,
  technologies: true,
  interests: true,
  projectTypes: true,
  lookingForCollab: true,
  openToHackathons: true,
  availability: true,
  accent: true,
  githubUsername: true,
  githubStats: true,
  isSample: true,
  lastSeenAt: true,
  lat: true,
  lng: true,
  privacy: true,
} as const;

export const miniUserSelect = { id: true, name: true, username: true, image: true, headline: true, isSample: true, lastSeenAt: true } as const;
