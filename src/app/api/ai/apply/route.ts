import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { aiConfigured, extractJson, generate, GROUNDING_RULES } from "@/lib/ai";
import { profileContext } from "@/lib/aiContext";
import { parseList } from "@/lib/json";
import { fetchPublicPage, htmlToText } from "@/lib/safeFetch";

const DEFAULT_QUESTIONS = [
  "Why do you want to participate in this hackathon?",
  "Tell us about a project you've built that you're proud of.",
  "What do you hope to build at this event?",
  "Describe your relevant technical experience.",
  "Do you have a team? If so, describe it; if not, what kind of teammates are you looking for?",
];

const schema = z.object({
  hackathonId: z.string().max(40).nullable().optional(),
  questions: z.array(z.string().trim().min(3).max(500)).max(15).optional(),
  formText: z.string().max(20_000).optional(),
  url: z.string().url().max(500).optional().or(z.literal("")),
  tone: z.enum(["enthusiastic", "professional", "concise"]).default("enthusiastic"),
});

type Draft = { question: string; answer: string; sources: string[]; tips?: string };

/**
 * Apply with AI. Step 1: figure out the questions (given, pasted, or read from a
 * public form URL). Step 2: draft grounded answers from the user's real profile.
 * Nothing is ever submitted anywhere: the user edits and copies answers themselves.
 */
export const POST = authed(
  async (req, { user }) => {
    const body = await parseBody(req, schema);
    const event = body.hackathonId ? await db.hackathon.findUnique({ where: { id: body.hackathonId } }) : null;
    const ctx = await profileContext(user.id);
    const ready = aiConfigured();

    // 1) Questions
    let questions = body.questions?.filter(Boolean) ?? [];
    let sourceNote = questions.length ? "Questions you provided" : "";
    let raw = body.formText?.trim() ?? "";
    if (!questions.length && body.url) {
      try {
        raw = htmlToText(await fetchPublicPage(body.url));
        sourceNote = `Questions read from ${new URL(body.url).hostname}`;
      } catch (e) {
        throw new HttpError(400, `Couldn't read that form: ${e instanceof Error ? e.message : "unknown error"}. Many forms (Google Forms, Typeform) load questions with JavaScript or need sign-in, so paste the questions instead.`);
      }
    }
    if (!questions.length && raw) {
      if (ready) {
        const { text } = await generate({
          system: "Extract the application questions from this form text. Return ONLY a JSON array of strings, max 12. Ignore name/email/phone/school-ID style fields and legal checkboxes.",
          messages: [{ role: "user", content: raw.slice(0, 15_000) }],
          temperature: 0,
          maxTokens: 800,
        });
        questions = (extractJson<string[]>(text) ?? []).filter((q) => typeof q === "string").slice(0, 12);
      } else {
        questions = raw
          .split(/\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 12 && l.length < 300 && /\?|describe|tell us|explain|why|what/i.test(l))
          .slice(0, 12);
      }
      sourceNote ||= "Questions extracted from the text you pasted";
    }
    if (!questions.length) {
      questions = DEFAULT_QUESTIONS;
      sourceNote = "Common hackathon application questions";
    }

    // 2) Drafts
    let drafts: Draft[];
    let model: string;
    if (ready) {
      const eventInfo = event
        ? `Hackathon: ${event.name}\nDates: ${event.startsAt.toDateString()}\nLocation: ${event.isOnline ? "Online" : event.city}\nThemes/skills: ${parseList(event.skills).join(", ")}\nDescription: ${event.description}\nOrganizer: ${event.organizer}`
        : "Hackathon: (not specified)";
      const { text, model: m } = await generate({
        system: `You help developers write hackathon applications on Hackergram.\n${GROUNDING_RULES}\n- Tone: ${body.tone}. Write in first person as the applicant.\n- 80–150 words per answer unless the question implies shorter.\n- For each answer, list the profile facts you used in "sources" (e.g. "GitHub repo owner/name", "Project: X", "Self-reported: University").\n- Add one short "tips" string on how the applicant could make the answer stronger with details only they know.\nReturn ONLY JSON: [{"question": string, "answer": string, "sources": string[], "tips": string}]`,
        messages: [{ role: "user", content: `${eventInfo}\n\n${ctx.text}\n\nQuestions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}` }],
        temperature: 0.6,
        maxTokens: 3500,
      });
      model = m;
      const parsed = extractJson<Draft[]>(text);
      if (!parsed?.length) throw new HttpError(502, "The model's answer couldn't be parsed. Please try again.");
      drafts = questions.map((q, i) => ({
        question: q,
        answer: String(parsed[i]?.answer ?? ""),
        sources: Array.isArray(parsed[i]?.sources) ? parsed[i]!.sources.map(String).slice(0, 6) : [],
        tips: parsed[i]?.tips ? String(parsed[i]!.tips) : undefined,
      }));
    } else {
      model = "template (AI not configured)";
      drafts = questions.map((q) => templateDraft(q, ctx, event?.name));
    }

    const saved = await db.aiDraft.create({
      data: {
        userId: user.id,
        hackathonId: event?.id ?? null,
        kind: "application",
        title: `Application${event ? `: ${event.name}` : ""}`,
        input: JSON.stringify({ questions, sourceNote, tone: body.tone }),
        content: JSON.stringify(drafts),
        model,
      },
    });
    return ok({ draftId: saved.id, questions, sourceNote, drafts, model, aiConfigured: ready });
  },
  { limit: 10, windowMs: 10 * 60_000 },
);

/**
 * No-AI fallback: a fill-in-the-blanks template built only from real profile
 * facts, with [ADD: …] placeholders for anything we don't know.
 */
function templateDraft(question: string, ctx: Awaited<ReturnType<typeof profileContext>>, eventName?: string): Draft {
  const u = ctx.user;
  const top = u.projects[0];
  const skills = [...parseList(u.languages), ...parseList(u.technologies)].slice(0, 4);
  const interests = parseList(u.interests).slice(0, 2);
  const q = question.toLowerCase();
  const sources: string[] = [];
  let answer: string;
  if (/why|motivat|excite/.test(q)) {
    if (interests.length) sources.push("Self-reported: interests");
    answer = `I want to join ${eventName ?? "this hackathon"} because ${interests.length ? `I'm passionate about ${interests.join(" and ")}` : "[ADD: what draws you to this event]"} and I learn fastest by shipping under a deadline. [ADD: a specific theme, sponsor or workshop you're excited about.]`;
  } else if (/project|built|proud/.test(q)) {
    if (top) sources.push(`Project: ${top.title}`);
    answer = top
      ? `I'm proud of ${top.title}${top.tagline ? `, ${top.tagline.charAt(0).toLowerCase()}${top.tagline.slice(1)}` : ""}. I built it with ${parseList(top.tech).slice(0, 3).join(", ") || "[ADD: stack]"}. [ADD: your role, the hardest problem you solved, and what you learned.]`
      : "[ADD: describe a project you built, your role, the stack, and what you learned.]";
  } else if (/experience|skill|technical|background/.test(q)) {
    if (skills.length) sources.push("Self-reported: skills");
    if (u.university) sources.push("Self-reported: university");
    answer = `${u.university ? `I study ${u.major || "[ADD: major]"} at ${u.university}. ` : ""}I work mostly with ${skills.join(", ") || "[ADD: your main languages]"}${u.company ? `, and currently I'm ${u.company}` : ""}. [ADD: one concrete example of using these skills.]`;
  } else if (/team/.test(q)) {
    answer = `[ADD: teammates' names, or "I'm looking for a team".] I'd bring ${skills.slice(0, 2).join(" and ") || "[ADD: your strengths]"}, and I'm looking for teammates with complementary skills like [ADD: roles you need].`;
  } else if (/build|hope|idea|plan/.test(q)) {
    answer = `I'd love to build something in ${interests[0] ?? "[ADD: area]"} using ${skills.slice(0, 2).join(" and ") || "[ADD: stack]"}. [ADD: the idea in one sentence, and why it matters.]`;
  } else {
    answer = "[ADD: your answer.] Tip: connect a concrete project or experience from your profile to this question.";
  }
  return { question, answer, sources, tips: "Template only: configure Gemma 4 for fully drafted, personalized answers." };
}
