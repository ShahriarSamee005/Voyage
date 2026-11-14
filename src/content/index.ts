// Single source of truth for game content (schema.md §1). Game, chat and end screen all read from here.
import type { GameContent, Rover, RoverId } from "./types";
import { scripts } from "./scripts";
import { sojourner } from "./rovers/sojourner";
import { spirit } from "./rovers/spirit";
import { opportunity } from "./rovers/opportunity";

// Fixed linear order: Sojourner → Spirit → Opportunity (PRD §5 E).
export const marsRovers: Rover[] = [sojourner, spirit, opportunity].sort((a, b) => a.order - b.order);

export const content: GameContent = {
  planets: [
    { id: "mars", name: "Mars", status: "playable", rovers: marsRovers },
    { id: "moon", name: "Moon", status: "locked", rovers: [] },
  ],
  scripts,
};

const roversById = new Map<string, Rover>(marsRovers.map((r) => [r.id, r]));

export function isRoverId(value: unknown): value is RoverId {
  return typeof value === "string" && roversById.has(value);
}

export function getRover(id: RoverId): Rover {
  const rover = roversById.get(id);
  if (!rover) throw new Error(`Unknown rover: ${id}`);
  return rover;
}

export { scripts };
export type * from "./types";
