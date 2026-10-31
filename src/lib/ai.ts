import "server-only";

/**
 * Gemma 4 client. Model and provider are configuration, never hard-coded:
 *  - AI_PROVIDER=gemini (default): Google's Gemini API, which serves Gemma 4 as
 *    `gemma-4-26b-a4b-it` and `gemma-4-31b-it` via models/{id}:generateContent.
 *  - AI_PROVIDER=openai-compatible: any /chat/completions server (Ollama, vLLM,
 *    LM Studio) running a Gemma 4 build, e.g. AI_BASE_URL=http://localhost:11434/v1.
 * If nothing is configured, callers get `aiConfigured() === false` and must say so
 * in the UI instead of pretending.
 */

export type ChatMsg = { role: "user" | "assistant"; content: string };

const provider = () => (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
export const aiModel = () => process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

export function aiConfigured() {
  if (provider() === "openai-compatible") return Boolean(process.env.AI_BASE_URL);
  return Boolean(process.env.GEMINI_API_KEY);
}

export function aiStatus() {
  return {
    configured: aiConfigured(),
    provider: provider() === "openai-compatible" ? "OpenAI-compatible endpoint" : "Gemini API",
    model: aiModel(),
  };
}

export async function generate(opts: {
  system: string;
  messages: ChatMsg[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; model: string }> {
  if (!aiConfigured()) throw new Error("AI_NOT_CONFIGURED");
  const model = aiModel();
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 1600;

  if (provider() === "openai-compatible") {
    const res = await fetch(`${process.env.AI_BASE_URL!.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: opts.system }, ...opts.messages],
      }),
    });
    if (!res.ok) throw new Error(`AI provider error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return { text: String(data.choices?.[0]?.message?.content ?? "").trim(), model };
  }

  // Gemini API. The system prompt is folded into the first user turn, which works
  // for every Gemma generation regardless of system-instruction support.
  const contents = opts.messages.map((m, i) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: i === 0 ? `${opts.system}\n\n---\n\n${m.content}` : m.content }],
  }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({ contents, generationConfig: { temperature, maxOutputTokens: maxTokens } }),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("The model returned an empty response");
  return { text, model };
}

/** Extracts the first JSON object/array from a model reply. */
export function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1]! : text;
  const start = raw.search(/[[{]/);
  if (start < 0) return null;
  for (let end = raw.length; end > start; end--) {
    try {
      return JSON.parse(raw.slice(start, end)) as T;
    } catch {}
  }
  return null;
}

export const GROUNDING_RULES = `Rules you must follow:
- Use ONLY facts present in the provided profile/project data. Never invent awards, employers, metrics, degrees, or experiences.
- If something the user would need is missing, write a clearly marked placeholder like [ADD: your role on this project] instead of guessing.
- Be specific, warm, and concise. Avoid buzzword soup.`;
