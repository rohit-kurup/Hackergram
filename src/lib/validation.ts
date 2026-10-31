import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "at least 3 characters")
  .max(24)
  .regex(/^[a-z0-9_.]+$/, "letters, numbers, _ and . only");

export const passwordSchema = z.string().min(8, "at least 8 characters").max(200);

export const signupSchema = z.object({
  name: z.string().trim().min(1, "required").max(80),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

const list = z.array(z.string().trim().min(1).max(40)).max(30);
const url = z.string().trim().max(300).url().or(z.literal(""));

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  username: usernameSchema,
  bio: z.string().trim().max(400),
  headline: z.string().trim().max(120),
  location: z.string().trim().max(80),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  university: z.string().trim().max(120),
  major: z.string().trim().max(120),
  gradYear: z.number().int().min(1950).max(2040).nullable(),
  company: z.string().trim().max(120),
  interests: list,
  languages: list,
  technologies: list,
  projectTypes: list,
  lookingForCollab: z.boolean(),
  openToHackathons: z.boolean(),
  availability: z.string().trim().max(60),
  accent: z.enum(["purple", "blue", "coral", "orange", "green", "yellow", "cyan"]),
});

export const privacySchema = z.object({
  showEmail: z.boolean(),
  showLocation: z.boolean(),
  showUniversity: z.boolean(),
  showActivity: z.boolean(),
  showInMatch: z.boolean(),
  showRepos: z.boolean(),
});
export type Privacy = z.infer<typeof privacySchema>;
export const DEFAULT_PRIVACY: Privacy = {
  showEmail: false,
  showLocation: true,
  showUniversity: true,
  showActivity: true,
  showInMatch: true,
  showRepos: true,
};

export const postSchema = z.object({
  kind: z.enum(["update", "project", "question", "hackathon", "collab", "repo"]),
  content: z.string().trim().min(1, "say something").max(2000),
  imageUrl: z.string().max(300).nullable().optional(),
  repoUrl: z
    .string()
    .trim()
    .max(300)
    .regex(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i, "must be a github.com/owner/repo link")
    .nullable()
    .optional()
    .or(z.literal("")),
  projectId: z.string().max(40).nullable().optional(),
  hackathonId: z.string().max(40).nullable().optional(),
});

export const projectSchema = z.object({
  title: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(140),
  description: z.string().trim().max(3000),
  tech: list,
  category: z.string().trim().max(40),
  repoUrl: url,
  demoUrl: url,
  color: z.enum(["purple", "blue", "coral", "orange", "green", "yellow", "cyan"]),
  thumbnail: z.string().max(300).nullable().optional(),
  isListing: z.boolean(),
  rolesNeeded: list,
  requiredSkills: list,
  teamSize: z.number().int().min(1).max(20),
  stage: z.enum(["Idea", "Prototype", "MVP", "Launched"]),
  commitment: z.string().trim().max(60),
  remote: z.boolean(),
  location: z.string().trim().max(80),
  beginnerFriendly: z.boolean(),
});

export const eventSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(3000),
  category: z.enum(["hackathon", "meetup", "startup", "competition", "conference"]),
  startsAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endsAt: z.string().optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
  city: z.string().trim().max(80),
  venue: z.string().trim().max(120),
  university: z.string().trim().max(120),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  isOnline: z.boolean(),
  organizer: z.string().trim().max(120),
  prize: z.string().trim().max(120),
  prizeAmount: z.number().int().min(0).max(100_000_000),
  website: z.string().trim().url().max(300),
  skills: list,
  beginnerFriendly: z.boolean(),
});
