// Server-side only: the Gemini provider lives here and nowhere else (rules §7 — provider stays isolated).
// Swapping providers means replacing this file; game, content and the /api/chat contract don't change.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash-lite"; // verified stable on ai.google.dev, Nov 14 2026
const TIMEOUT_MS = 8000;

export class ChatProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "not_configured" | "timeout" | "upstream" | "empty",
  ) {
    super(message);
  }
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
}

export async function generateAnswer(systemPrompt: string, question: string): Promise<string> {
  // Trim: env values pasted/piped on Windows can carry a trailing "\r", which makes the header invalid.
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new ChatProviderError("GEMINI_API_KEY is not set", "not_configured");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: {
          maxOutputTokens: 400,
          thinkingConfig: { thinkingLevel: "MINIMAL" },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    // Server log only (never sent to the browser): include the underlying reason for diagnosis.
    const reason = err instanceof Error ? `${err.name}: ${err.message}${err.cause ? ` (${String(err.cause)})` : ""}` : String(err);
    throw new ChatProviderError(timedOut ? "Gemini timed out" : `Gemini unreachable: ${reason}`, timedOut ? "timeout" : "upstream");
  }

  if (!res.ok) {
    // Never forward provider error bodies to the browser — they can echo request details.
    throw new ChatProviderError(`Gemini HTTP ${res.status}`, "upstream");
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new ChatProviderError("Gemini returned no text", "empty");
  return text;
}
