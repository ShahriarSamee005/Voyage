import type { RoverId } from "@/content/types";
import type { SolarCondition } from "./state/types";

// Phaser-free description of the three surface legs (fixed linear order, PRD §5 E).
// Real rovers are far apart: each leg is a small bounded region reached by a jump-cut (PRD §4.3).

export interface SoftSoil {
  x: number;
  y: number;
  coreRadius: number;
  outerRadius: number;
}

export interface LegConfig {
  rover: RoverId;
  /** Real location name (from verified rover facts). */
  place: string;
  world: { width: number; height: number };
  spawn: { x: number; y: number };
  target: { x: number; y: number };
  /** Weather the leg starts in; drives both visuals and charge rate. */
  weather: SolarCondition;
  rockSeed: number;
  /** Chapter mood tint over the world (design.md §2.4). */
  tint: { color: number; alpha: number } | null;
  softSoil: SoftSoil | null;
  /** Which encounter step allows scanning the historical rover. */
  scanStep: "approach" | "hazard";
  next: RoverId | null;
}

export const LEGS: Record<RoverId, LegConfig> = {
  sojourner: {
    rover: "sojourner",
    place: "Ares Vallis",
    world: { width: 3000, height: 1800 },
    spawn: { x: 380, y: 1450 },
    target: { x: 2380, y: 620 },
    weather: "clear",
    rockSeed: 11,
    tint: null,
    softSoil: null,
    scanStep: "approach",
    next: "spirit",
  },
  spirit: {
    rover: "spirit",
    place: "Gusev Crater",
    world: { width: 4000, height: 2400 },
    spawn: { x: 380, y: 2050 },
    target: { x: 3500, y: 560 },
    weather: "dusty",
    rockSeed: 42,
    tint: { color: 0x2a1208, alpha: 0.14 },
    softSoil: { x: 3540, y: 590, coreRadius: 260, outerRadius: 470 },
    scanStep: "hazard",
    next: "opportunity",
  },
  opportunity: {
    rover: "opportunity",
    place: "Perseverance Valley, Endeavour Crater",
    world: { width: 3200, height: 2000 },
    spawn: { x: 420, y: 1620 },
    target: { x: 2560, y: 700 },
    weather: "dust_storm",
    rockSeed: 77,
    tint: { color: 0x3a1a08, alpha: 0.1 },
    softSoil: null,
    scanStep: "approach",
    next: null,
  },
};

export const FIRST_LEG: RoverId = "sojourner";
