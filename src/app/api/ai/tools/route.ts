import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { aiConfigured, generate, GROUNDING_RULES } from "@/lib/ai";
import { profileContext } from "@/lib/aiContext";
import { parseList } from "@/lib/json";

const schema = z.object({
  tool: z.enum(["ideas", "team", "skillgap", "readme", "description", "prep", "collab"]),
  input: z.record(z.any()).default({}),
});

const TOOL_PROMPTS: Record<string, { title: string; prompt: (input: any) => string }> = {
  ideas: {
    title: "Project ideas",
    prompt: (i) => `Suggest 5 hackathon-sized project ideas that fit this person's real skills and interests${i.theme ? ` and the theme "${i.theme}"` : ""}. For each: a catchy name, one-sentence pitch, the stack (using their skills where possible), and a 'stretch goal'. Use markdown headings per idea.`,
  },
  team: {
    title: "Team composition",
    prompt: (i) => `Recommend an ideal 3–5 person team composition for ${i.project ? `the project "${i.project}"` : "a hackathon project in their area"}. Identify which role this person should take based on their profile, and which complementary roles/skills they should recruit. Be concrete.`,
  },
  skillgap: {
    title: "Skill gap analysis",
    prompt: (i) => `Compare this person's skills with what's needed for ${i.goal ? `"${i.goal}"` : "their stated interests"}. List: strengths they already have (cite evidence), gaps, and a 4-week learning plan with one small project per week.`,
  },
  readme: {
    title: "README draft",
    prompt: (i) => `Write a polished README.md for the project "${i.title ?? "(untitled)"}". Known details: ${i.notes ?? ""}. Tech: ${(i.tech ?? []).join(", ")}. Include: title + one-liner, features, tech stack, getting started (with placeholders for commands you don't know), screenshots placeholder, roadmap, contributing, license placeholder. Don't invent metrics or users.`,
  },
  description: {
    title: "Project description",
    prompt: (i) => `Write a compelling 120–180 word project description for a Hackergram project listing. Title: ${i.title}. One-liner: ${i.tagline ?? ""}. Notes from the founder: ${i.notes ?? ""}. Tech: ${(i.tech ?? []).join(", ")}. Roles needed: ${(i.rolesNeeded ?? []).join(", ")}. Cover the problem, what's built, and who they're looking for. Plain text, no markdown headings. Only use facts given.`,
  },
  prep: {
    title: "Hackathon prep plan",
    prompt: (i) => `Create a practical preparation checklist for ${i.event ? `the hackathon "${i.event}"` : "an upcoming hackathon"}: one week before, the night before, during (hour-by-hour plan for a 36h event), and demo/judging tips. Tailor tool suggestions to their actual stack.`,
  },
  collab: {
    title: "Collaboration recommendations",
    prompt: () => `Based on this profile, describe the 3 kinds of collaborators who would complement them best (skills, working style, project interests) and give one opening message they could send each.`,
  },
};

export const POST = authed(
  async (req, { user }) => {
    const { tool, input } = await parseBody(req, schema);
    if (!aiConfigured()) throw new HttpError(503, "AI isn't configured. Add GEMINI_API_KEY to .env (see README).");
    const ctx = await profileContext(user.id);
    let extra = "";
    if (tool === "team" && typeof input.projectId === "string") {
      const p = await db.project.findFirst({ where: { id: input.projectId, ownerId: user.id } });
      if (p) {
        input.project = p.title;
        extra = `\n\nProject: ${p.title}: ${p.description || p.tagline}. Tech: ${parseList(p.tech).join(", ")}. Roles listed: ${parseList(p.rolesNeeded).join(", ")}.`;
      }
    }
    const t = TOOL_PROMPTS[tool]!;
    try {
      const { text, model } = await generate({
        system: `You are Gemma, Hackergram's friendly AI companion for builders. Be practical, specific and encouraging.\n${GROUNDING_RULES}`,
        messages: [{ role: "user", content: `${ctx.text}${extra}\n\n---\nTask: ${t.prompt(input)}` }],
        temperature: tool === "ideas" ? 0.9 : 0.6,
        maxTokens: tool === "readme" || tool === "prep" ? 2200 : 1400,
      });
      const draft = await db.aiDraft.create({
        data: { userId: user.id, kind: tool, title: `${t.title}${input.project ? `: ${input.project}` : input.title ? `: ${input.title}` : ""}`, input: JSON.stringify(input), content: text, model },
      });
      return ok({ content: text, model, draftId: draft.id });
    } catch (e) {
      throw new HttpError(502, e instanceof Error ? e.message : "AI request failed");
    }
  },
  { limit: 15, windowMs: 10 * 60_000 },
);
