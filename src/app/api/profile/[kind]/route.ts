import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";

type Ctx = { params: Promise<{ kind: string }> };

const educationSchema = z.object({
  school: z.string().trim().min(1).max(120),
  degree: z.string().trim().max(80).default(""),
  field: z.string().trim().max(120).default(""),
  startYear: z.number().int().min(1950).max(2040).nullable().optional(),
  endYear: z.number().int().min(1950).max(2045).nullable().optional(),
});

const experienceSchema = z.object({
  kind: z.enum(["job", "internship", "certification"]),
  title: z.string().trim().min(1).max(120),
  org: z.string().trim().min(1).max(120),
  start: z.string().trim().max(40).default(""),
  end: z.string().trim().max(40).default(""),
  description: z.string().trim().max(1000).default(""),
  current: z.boolean().default(false),
});

/** POST /api/profile/(education|experience) — add an entry to your profile. */
export const POST = authed<Ctx>(async (req, { params, user }) => {
  const { kind } = await params;
  if (kind === "education") {
    const data = await parseBody(req, educationSchema);
    return ok({ item: await db.education.create({ data: { ...data, userId: user.id } }) });
  }
  if (kind === "experience") {
    const data = await parseBody(req, experienceSchema);
    return ok({ item: await db.experience.create({ data: { ...data, userId: user.id } }) });
  }
  throw new HttpError(404, "Unknown section");
});

/** DELETE /api/profile/(education|experience)?id= */
export const DELETE = authed<Ctx>(async (req, { params, user }) => {
  const { kind } = await params;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const where = { id, userId: user.id };
  const n = kind === "education" ? await db.education.deleteMany({ where }) : kind === "experience" ? await db.experience.deleteMany({ where }) : null;
  if (!n?.count) throw new HttpError(404, "Not found");
  return ok({ ok: true });
});
