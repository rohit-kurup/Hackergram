import { z } from "zod";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { aiConfigured, generate, GROUNDING_RULES } from "@/lib/ai";
import { profileContext } from "@/lib/aiContext";

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(6000) })).min(1).max(30),
});

export const POST = authed(
  async (req, { user }) => {
    const { messages } = await parseBody(req, schema);
    if (!aiConfigured()) throw new HttpError(503, "AI isn't configured. Add GEMINI_API_KEY to .env (see README).");
    const ctx = await profileContext(user.id);
    try {
      const { text, model } = await generate({
        system: `You are Gemma, Hackergram's AI companion for developers. You help with hackathon applications, project ideas, team formation, READMEs, and technical questions. Keep answers focused and use markdown sparingly.\n${GROUNDING_RULES}\n\nThe user's profile (for personalization):\n${ctx.text}`,
        messages: messages.slice(-12),
        temperature: 0.7,
        maxTokens: 1500,
      });
      return ok({ reply: text, model });
    } catch (e) {
      throw new HttpError(502, e instanceof Error ? e.message : "AI request failed");
    }
  },
  { limit: 30, windowMs: 10 * 60_000 },
);
