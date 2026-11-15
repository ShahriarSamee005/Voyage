// content/types.ts — the locked content contract (schema.md §3).
// Runtime game state is NOT defined here; it lives with the game layer (techspec §5).

export type PlanetStatus = "playable" | "locked";
export type HazardType = "cold_power" | "soft_soil" | "dust_storm";
export type Speaker = "mission_control" | "player_rover";
export type RoverId = "sojourner" | "spirit" | "opportunity";

export interface GameContent {
  planets: Planet[];
  scripts: CinematicScripts; // global narration (not per-rover)
}

export interface Planet {
  id: "mars" | "moon";
  name: string;
  status: PlanetStatus;
  rovers: Rover[]; // empty for locked planets (Moon)
}

export interface Rover {
  id: RoverId;
  name: string;
  order: number; // 1,2,3 — fixed linear path
  mission: string;
  launchYear: number;
  endYear: number;
  endReason: string;

  // Approved discovery remark (player rover) — VERBATIM from prd.md §4.8
  discovery: {
    monologue: string;
  };

  hazard: {
    type: HazardType;
    description: string;
  };

  // Signature escape loop — Spirit & Opportunity. Sojourner: false (teaching leg).
  hasEscapeLoop: boolean;
  tool: Tool | null;

  // Rover Archives → AI Chat
  factSheet: string[]; // the ONLY knowledge chat may use
  voice: string;
  fallbackQA: QAPair[];

  // Rover Archives → Story / Full Journey
  timeline: Milestone[];

  // Rover Archives → Photo Gallery
  gallery: GalleryImage[];

  // End screen "Data Beamed Home"
  epitaph: {
    line: string;
    dates: string;
  };
}

export interface Milestone {
  date: string; // UTC (content-prep/README.md date convention)
  heading: string;
  summary: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
}

export interface QAPair {
  q: string;
  a: string;
}

export interface GalleryImage {
  src: string;
  title: string;
  caption: string;
  credit: string;
  date: string;
}

// prd.md §4.8 is the AUTHORITATIVE text; these fields mirror it VERBATIM.
export interface CinematicScripts {
  opening: ScriptSegment;
  openingTags: string[];
  landing: ScriptSegment;
  /** Phase I (B3): Mission Control during the trajectory mini-game. */
  spaceTravel: ScriptSegment;
  ending: ScriptSegment;
}

export interface ScriptSegment {
  id: string;
  speaker: Speaker;
  lines: string[];
}
