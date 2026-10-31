import { db } from "@/lib/db";
import { authed, HttpError, ok } from "@/lib/api";
import { aiConfigured, generate, GROUNDING_RULES } from "@/lib/ai";
import { profileContext } from "@/lib/aiContext";

/** Generates the "Developer snapshot" on a user's own profile. */
export const POST = authed(
  async (_req, { user }) => {
    if (!aiConfigured()) throw new HttpError(503, "AI isn't configured. Add GEMINI_API_KEY to .env (see README).");
    const ctx = await profileContext(user.id);
    try {
      const { text, model } = await generate({
        system: `You write concise developer profile summaries for Hackergram, a social network for builders.\n${GROUNDING_RULES}\n- Write 2-3 sentences in third person, max 75 words. No bullet points, no headings.\n- Mention specialization, strongest languages/frameworks, the kinds of projects they build, and interests.\n- Prefer facts labeled [GitHub] for technical strengths; don't overstate self-reported skills.`,
        messages: [{ role: "user", content: `${ctx.text}\n\nWrite the summary now.` }],
        temperature: 0.4,
        maxTokens: 300,
      });
      const summary = text.replace(/^["']|["']$/g, "").trim();
      await db.user.update({ where: { id: user.id }, data: { aiSummary: summary, aiSummaryModel: model, aiSummaryAt: new Date() } });
      return ok({ summary, model });
    } catch (e) {
      throw new HttpError(502, e instanceof Error ? e.message : "AI request failed");
    }
  },
  { limit: 5, windowMs: 10 * 60_000 },
);
