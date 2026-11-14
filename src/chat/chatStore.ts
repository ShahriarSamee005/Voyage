"use client";

import { useSyncExternalStore } from "react";
import type { RoverId } from "@/content/types";
import { askRover } from "./askRover";

export interface ChatMessage {
  id: number;
  from: "player" | "rover";
  text: string;
  source?: "gemini" | "fallback";
}

interface Thread {
  messages: ChatMessage[];
  pending: boolean;
}

// One thread per rover. Replies are filed under the rover they were ASKED of, so switching
// archives mid-request can never show a stale answer under the wrong rover (rules §2).
let threads: Partial<Record<RoverId, Thread>> = {};
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: Thread = { messages: [], pending: false };

function emit() {
  listeners.forEach((l) => l());
}

function update(roverId: RoverId, fn: (t: Thread) => Thread) {
  threads = { ...threads, [roverId]: fn(threads[roverId] ?? EMPTY) };
  emit();
}

export function resetChats() {
  threads = {};
  emit();
}

export async function sendChat(roverId: RoverId, question: string) {
  const text = question.trim();
  if (!text || (threads[roverId]?.pending ?? false)) return;
  update(roverId, (t) => ({ pending: true, messages: [...t.messages, { id: nextId++, from: "player", text }] }));
  const reply = await askRover(roverId, text);
  update(roverId, (t) => ({
    pending: false,
    messages: [...t.messages, { id: nextId++, from: "rover", text: reply.answer, source: reply.source }],
  }));
}

export function useThread(roverId: RoverId): Thread {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => threads[roverId] ?? EMPTY,
    () => EMPTY,
  );
}
