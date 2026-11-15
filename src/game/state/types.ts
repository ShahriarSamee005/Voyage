import type { RoverId, Speaker } from "@/content/types";

// Runtime state (techspec §5). Not content — reset on every new run, never persisted.
export type SolarCondition = "clear" | "dusty" | "dust_storm";
export type HubView = "my_rover" | "rover_archives";
export type ArchiveSection = "story" | "gallery" | "chat" | "model";
export type TractionStatus = "normal" | "reduced" | "stuck";
export type CommunicationStatus = "connected" | "searching" | "offline";
export type GameMode = "explore" | "cinematic" | "travel";

/** Outer React screens (title/destination/end are React + Tailwind per techspec §11.1). */
export type Screen = "title" | "destination" | "game" | "data_home";
/** Phaser stages inside the game screen, in the locked order (appflow §1). */
export type Stage = "opening" | "rocket" | "landing" | "surface" | "ending";

export interface Subtitle {
  speaker: Speaker;
  text: string;
  /** Typewriter reveal time: the voice clip's spoken length, or a reading pace without audio. */
  revealSeconds: number;
  /** An AI-generated voice clip (ElevenLabs) is reading this line. */
  voiced?: boolean;
}

export interface Banner {
  label: string;
  title: string;
  caption?: string;
}

/**
 * Generic encounter steps; each leg uses a subset (team decisions, Nov 14):
 *  Sojourner:   approach → discovered → complete            (teaching leg, no tool)
 *  Spirit:      approach → hazard(stuck) → discovered → tool_unlocked → complete
 *  Opportunity: approach(storm) → discovered → complete(drive to the checkpoint)
 *               → tool_unlocked(the storm hits on the way → shutdown, the run ends)
 */
export type EncounterStep = "approach" | "hazard" | "discovered" | "tool_unlocked" | "complete";

export type DialogueAction = "open_archive" | "dismiss" | "travel" | "ending";

export interface TravelCard {
  from: string;
  to: string;
  /** Real rover sites (degrees, N/E positive) for the jump map, and the great-circle distance. */
  fromSite: { lat: number; lon: number };
  toSite: { lat: number; lon: number };
  km: number;
}

export interface Dialogue {
  speaker: Speaker | "system";
  title: string;
  lines: string[];
  actionLabel: string;
  action: DialogueAction;
  /**
   * Voice-clip prefix (Phase I): line N plays `${voice}-${N}` if that clip is registered in
   * voiceClips.ts; otherwise the line types at reading pace in silence.
   */
  voice?: string;
}

export interface Objective {
  text: string;
  /** Angle (radians, screen space) from the rover to the target; null hides the arrow. */
  angle: number | null;
  distance: number | null;
}

export interface RunState {
  runId: number;
  screen: Screen;
  stage: Stage;
  mode: GameMode;

  // Cinematic presentation (fixed, always-visible subtitles; no skip — rules §3)
  subtitle: Subtitle | null;
  missionTags: string[];
  banner: Banner | null;
  /** Rocket mini-game trajectory lock 0–100 (null outside the mini-game). */
  rocketLock: number | null;

  // Power + environment
  batteryChargePercent: number;
  solarCondition: SolarCondition;
  isRoverMoving: boolean;
  isCharging: boolean;
  outOfPower: boolean;

  // Coins
  coins: number;
  rewardedEncounters: RoverId[];

  // Mission / encounter (separate from archive selection!)
  discoveredRovers: RoverId[];
  activeEncounterRover: RoverId | null;
  encounterStep: EncounterStep;
  objective: Objective;
  canScan: boolean;
  /** At the jump point with the leg complete: the player may choose to jump (Phase H). */
  canJump: boolean;

  // Rover systems (status shown in My Rover)
  unlockedTools: string[];
  toolEngaged: boolean;
  tractionStatus: TractionStatus;
  communicationStatus: CommunicationStatus;

  // Presentation
  hubOpen: boolean;
  hubView: HubView;
  selectedArchive: RoverId | null; // UI selection only
  archiveSection: ArchiveSection;
  pauseOpen: boolean;
  confirmReturnOpen: boolean;
  dialogue: Dialogue | null;
  warning: string | null;
  toast: string | null;
  travel: TravelCard | null;
  /** Opportunity: the storm has hit after Continue and is still raging. */
  severeStorm: boolean;
  /** Opportunity's storm: a gust has damaged the solar panels, so nothing can recharge the battery. */
  panelDamaged: boolean;
  /** Opportunity's storm: the battery hit 0% with no way to recharge, and the rover has shut down. */
  roverOffline: boolean;
}
