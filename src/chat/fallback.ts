import type { Rover } from "@/content/types";

// Offline chat (rules §2): pick the closest scripted Q&A for this rover, or admit it doesn't remember.
// Never generates new facts — every answer is pre-written, verified content.

const STOP = new Set(
  "the a an and or but of to in on at for with you your yours me my i is are was were be been do did does what how why when where who which that this it its can could would will about tell please".split(
    " ",
  ),
);

const SYNONYMS: Record<string, string> = {
  end: "happen", ended: "happen", die: "happen", died: "happen", dead: "happen", stop: "happen", stopped: "happen",
  last: "happen", fate: "happen", lost: "happen", silence: "happen", final: "happen", happened: "happen",
  find: "discover", found: "discover", discoveries: "discover", discovered: "discover", learn: "discover", science: "discover",
  job: "mission", purpose: "mission", goal: "mission", task: "mission", built: "mission",
  land: "landing", landed: "landing", arrive: "landing", arrived: "landing", airbag: "landing", airbags: "landing",
  trapped: "stuck", trap: "stuck", sand: "stuck", soil: "stuck", wheel: "stuck", wheels: "stuck",
  far: "travel", distance: "travel", drive: "travel", drove: "travel", kilometers: "travel", miles: "travel", marathon: "travel",
};

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => SYNONYMS[w] ?? w.replace(/(ing|ed|es|s)$/, ""))
    .map((w) => SYNONYMS[w] ?? w);
}

export function fallbackAnswer(rover: Rover, question: string): string {
  const q = new Set(tokens(question));
  let best = { score: 0, answer: "" };
  for (const pair of rover.fallbackQA) {
    const qTokens = new Set(tokens(pair.q));
    const aTokens = new Set(tokens(pair.a));
    let score = 0;
    q.forEach((t) => {
      if (qTokens.has(t)) score += 2;
      else if (aTokens.has(t)) score += 0.5;
    });
    if (score > best.score) best = { score, answer: pair.a };
  }
  if (best.score >= 1) return best.answer;
  return `I don't remember that. I'm ${rover.name} — ask me about my mission, what I discovered, or what happened to me.`;
}
