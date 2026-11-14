import { getRover } from "@/content";
import type { RoverId } from "@/content/types";
import { fallbackAnswer } from "./fallback";

export interface ChatReply {
  answer: string;
  source: "gemini" | "fallback";
}

const CLIENT_TIMEOUT_MS = 10000;

/**
 * The game's only chat entry point (techspec §10): try live chat, and on ANY failure
 * (offline, timeout, HTTP error, bad payload) answer from the rover's local scripted Q&A.
 * The story never waits on this (rules §2).
 */
export async function askRover(roverId: RoverId, question: string): Promise<ChatReply> {
  const offline = (): ChatReply => ({ answer: fallbackAnswer(getRover(roverId), question), source: "fallback" });

  if (typeof navigator !== "undefined" && navigator.onLine === false) return offline();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roverId, question }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    if (!res.ok) return offline();
    const data = (await res.json()) as Partial<ChatReply>;
    if (typeof data.answer !== "string" || !data.answer.trim()) return offline();
    return { answer: data.answer, source: "gemini" };
  } catch {
    return offline();
  }
}
