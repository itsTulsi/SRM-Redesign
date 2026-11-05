/**
 * Optional "free AI" layer. The site never needs it: the rule-based assistant and search answer on their own.
 * If LLM_API_KEY (+ LLM_BASE_URL, LLM_MODEL) are set, the assistant uses ANY OpenAI-compatible chat endpoint
 * for questions it could not answer by rule: a free tier (Groq, Google Gemini's OpenAI-compatible endpoint,
 * OpenRouter's free models) or a local model (Ollama at http://localhost:11434/v1). No SDK, no paid dependency.
 * The model only ever sees the verified records we pass it and is told to answer from them alone.
 * Server only. Returns null on any problem, so callers fall back to the rule-based answer.
 */
const KEY = process.env.LLM_API_KEY;
const BASE = (process.env.LLM_BASE_URL ?? "").replace(/\/$/, "");
const MODEL = process.env.LLM_MODEL;

export const llmEnabled = () => !!(KEY && BASE && MODEL);

export async function askLLM(system: string, user: string, maxTokens = 800): Promise<string | null> {
  if (!llmEnabled()) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 9000);
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      signal: ctl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: maxTokens,
        // gpt-oss models think before answering; "low" keeps that short, so the answer is not cut off and fewer free-tier tokens are spent.
        ...(MODEL?.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.replace(/[\u202f\u00a0]/g, " ").replace(/\s*\n+\s*/g, " ").replace(/\*\*/g, "").trim();
    return text && text.length < 1200 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
