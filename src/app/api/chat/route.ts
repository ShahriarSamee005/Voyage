import { getRover, isRoverId } from "@/content";
import { buildSystemPrompt, cleanAnswer } from "@/server/chatPrompt";
import { ChatProviderError, generateAnswer } from "@/server/gemini";
import { allowRequest, clientKey } from "@/server/rateLimit";

// Chat proxy (techspec §9.4):
//   POST /api/chat  body: { roverId: string, question: string }
//   200: { answer: string, source: "gemini" }
//   4xx/5xx: { error } — the client then answers from its local fallback Q&A.
// The browser never sees GEMINI_API_KEY and never sends facts; facts come from server-side content.

const MAX_QUESTION_LENGTH = 500;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const { roverId, question } = (body ?? {}) as { roverId?: unknown; question?: unknown };
  if (!isRoverId(roverId)) {
    return Response.json({ error: "Unknown roverId." }, { status: 400 });
  }
  if (typeof question !== "string" || !question.trim() || question.length > MAX_QUESTION_LENGTH) {
    return Response.json(
      { error: `question must be a non-empty string up to ${MAX_QUESTION_LENGTH} characters.` },
      { status: 400 },
    );
  }

  if (!allowRequest(clientKey(request))) {
    return Response.json({ error: "Too many questions — slow down a little." }, { status: 429 });
  }

  const rover = getRover(roverId);
  try {
    const raw = await generateAnswer(buildSystemPrompt(rover), question.trim());
    return Response.json({ answer: cleanAnswer(raw), source: "gemini" });
  } catch (err) {
    const kind = err instanceof ChatProviderError ? err.kind : "upstream";
    console.error(`[api/chat] ${roverId}: ${err instanceof Error ? err.message : String(err)}`);
    const status = kind === "not_configured" ? 503 : kind === "timeout" ? 504 : 502;
    return Response.json({ error: "Live chat unavailable." }, { status });
  }
}
