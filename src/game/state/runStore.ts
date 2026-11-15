import { getRover } from "@/content";
import type { RoverId } from "@/content/types";
import { FIRST_LEG, LEGS } from "../legs";
import { TUNING } from "../tuning";
import type { ArchiveSection, Banner, Dialogue, HubView, RunState, Screen, Stage, Subtitle } from "./types";

// One in-memory store = single source of truth for Phaser (world) and React (HUD, Hub, menus).
// No persistence: a new run replaces the whole state (techspec §5).

type Listener = () => void;

export const TRACTION_TOOL_ID = "traction-mode";
export const POWER_TOOL_ID = "power-preservation";

function approachObjective(rover: RoverId): string {
  return rover === "opportunity" ? "Find Opportunity through the dust storm" : `Locate ${getRover(rover).name}`;
}

function legState(rover: RoverId): Partial<RunState> {
  return {
    activeEncounterRover: rover,
    encounterStep: "approach",
    solarCondition: LEGS[rover].weather,
    objective: { text: approachObjective(rover), angle: null, distance: null },
    canScan: false,
    canJump: false,
    toolEngaged: false,
    tractionStatus: "normal",
    communicationStatus: "connected",
    severeStorm: false,
    warning: null,
  };
}

function initialState(runId: number, screen: Screen = "title"): RunState {
  return {
    runId,
    screen,
    stage: "opening",
    mode: "cinematic",
    subtitle: null,
    missionTags: [],
    banner: null,
    rocketLock: null,
    batteryChargePercent: TUNING.startBattery,
    solarCondition: LEGS[FIRST_LEG].weather,
    isRoverMoving: false,
    isCharging: false,
    outOfPower: false,
    coins: TUNING.startCoins,
    rewardedEncounters: [],
    discoveredRovers: [],
    activeEncounterRover: FIRST_LEG,
    encounterStep: "approach",
    objective: { text: approachObjective(FIRST_LEG), angle: null, distance: null },
    canScan: false,
    canJump: false,
    unlockedTools: [],
    toolEngaged: false,
    tractionStatus: "normal",
    communicationStatus: "connected",
    hubOpen: false,
    hubView: "my_rover",
    selectedArchive: null,
    archiveSection: "story",
    pauseOpen: false,
    confirmReturnOpen: false,
    dialogue: null,
    warning: null,
    toast: null,
    travel: null,
    severeStorm: false,
  };
}

let state: RunState = initialState(1);
const listeners = new Set<Listener>();

export const runStore = {
  get: (): RunState => state,
  set(patch: Partial<RunState> | ((s: RunState) => Partial<RunState>)) {
    const next = typeof patch === "function" ? patch(state) : patch;
    let changed = false;
    for (const key in next) {
      if (next[key as keyof RunState] !== state[key as keyof RunState]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** World simulation is frozen whenever a blocking overlay, cinematic or travel owns the screen (rules §4). */
export function isWorldPaused(s: RunState = state): boolean {
  return s.hubOpen || s.pauseOpen || s.confirmReturnOpen || s.dialogue !== null || s.mode !== "explore";
}

/**
 * End-of-leg dialogue (Phase H): it no longer jump-cuts on its own. Closing it leaves the player
 * free to explore; the next region is reached by driving to the jump point and choosing to jump.
 */
function legCompleteDialogue(from: RoverId, title: string, lines: string[]): Dialogue {
  const next = LEGS[from].next;
  return next
    ? {
        speaker: "player_rover",
        title,
        lines: [...lines, `When you're ready, drive to the jump point and choose when to travel on to ${LEGS[next].place}.`],
        actionLabel: "Head for the jump point",
        action: "dismiss",
      }
    : { speaker: "system", title, lines, actionLabel: "Continue exploring", action: "dismiss" };
}

/** Objective once a leg is done: reach the jump point (the scene adds direction + distance). */
function jumpObjective(from: RoverId) {
  const next = LEGS[from].next;
  return { text: next ? `Drive to the jump point → ${LEGS[next].place}` : "Mission complete", angle: null, distance: null };
}

/** Great-circle distance between two sites on Mars (km, mean radius 3389.5 km). */
function marsKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const c = Math.sin(a.lat * r) * Math.sin(b.lat * r) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return 3389.5 * Math.acos(Math.max(-1, Math.min(1, c)));
}

function addTool(tools: string[], id: string): string[] {
  return tools.includes(id) ? tools : [...tools, id];
}

/** Actions. React and Phaser both call these — mission logic lives here, not in UI code. */
export const actions = {
  newRun(screen: Screen = "title") {
    state = initialState(state.runId + 1, screen);
    listeners.forEach((l) => l());
  },

  // ---- Outer screens + stage flow (appflow §1 order) ----
  goToDestination() {
    runStore.set({ screen: "destination" });
  },
  backToTitle() {
    actions.newRun("title");
  },
  /** Confirm Mars on the destination screen → Earth liftoff. */
  launchMission() {
    actions.newRun("game");
  },
  /** Play Again from the end screen: a fresh run straight into the opening. */
  playAgain() {
    actions.newRun("game");
  },
  setStage(stage: Stage, mode: RunState["mode"] = stage === "rocket" || stage === "surface" ? "explore" : "cinematic") {
    runStore.set({ stage, mode, subtitle: null, banner: null, missionTags: [], rocketLock: stage === "rocket" ? 0 : null });
  },
  setSubtitle(subtitle: Subtitle | null) {
    runStore.set({ subtitle });
  },
  showMissionTag(tag: string) {
    runStore.set((s) => ({ missionTags: s.missionTags.includes(tag) ? s.missionTags : [...s.missionTags, tag] }));
  },
  setBanner(banner: Banner | null) {
    runStore.set({ banner });
  },
  startEnding() {
    runStore.set({ dialogue: null, hubOpen: false, warning: null, stage: "ending", mode: "cinematic", subtitle: null, banner: null });
  },
  endingFinished() {
    runStore.set({ screen: "data_home", subtitle: null, banner: null });
  },
  /** Rocket mini-game: optional Easter egg reward (non-blocking, PRD §4.1 #3). */
  awardSighting(label: string) {
    runStore.set((s) => ({ coins: s.coins + 1, toast: `Spotted ${label}! +1 coin` }));
  },

  // ---- Rover Hub ----
  openHub(view: HubView = "my_rover") {
    const s = state;
    if (s.stage !== "surface" || s.mode !== "explore" || s.pauseOpen || s.dialogue) return;
    runStore.set({ hubOpen: true, hubView: view });
  },
  closeHub() {
    // Close ≠ Continue: closing never advances the encounter (rules §4).
    runStore.set({ hubOpen: false });
  },
  showMyRover() {
    runStore.set({ hubView: "my_rover" });
  },
  selectArchive(roverId: RoverId) {
    if (!state.discoveredRovers.includes(roverId)) return; // locked
    runStore.set({ hubView: "rover_archives", selectedArchive: roverId });
  },
  setArchiveSection(section: ArchiveSection) {
    runStore.set({ archiveSection: section });
  },

  /** Continue is available only when the ACTIVE encounter can progress (never from archive browsing). */
  canContinue(s: RunState = state): boolean {
    return s.activeEncounterRover !== null && s.encounterStep === "discovered";
  },
  continueEncounter() {
    if (!actions.canContinue()) return;
    const leg = state.activeEncounterRover!;

    if (leg === "sojourner") {
      runStore.set({
        hubOpen: false,
        encounterStep: "complete",
        objective: jumpObjective("sojourner"),
        dialogue: legCompleteDialogue("sojourner", "Lesson from Sojourner", [
          "Sojourner relied on the Pathfinder lander to talk to Earth. In September 1997 the lander fell silent — most likely because its battery ran down and it grew too cold — and Sojourner went quiet too.",
          "Your rover runs on sunlight as well. Watch your battery, and stop in the open to let your solar panels recharge before you run low.",
        ]),
      });
      return;
    }

    if (leg === "spirit") {
      const tool = getRover("spirit").tool!;
      runStore.set((s) => ({
        hubOpen: false,
        encounterStep: "tool_unlocked",
        unlockedTools: addTool(s.unlockedTools, tool.id),
        objective: { ...s.objective, text: "Engage traction mode [E] and drive out of the soft soil" },
        dialogue: {
          speaker: "player_rover",
          title: "Lesson from Spirit",
          lines: [
            "Spirit got trapped in soft, loose soil at 'Troy' in May 2009. With only five working wheels, it couldn't get enough traction to free itself.",
            `${tool.name} unlocked: ${tool.description}`,
            "Press E to engage it, then drive slowly out of the soft soil.",
          ],
          actionLabel: "Got it",
          action: "dismiss",
        },
      }));
      return;
    }

    // Opportunity: after Continue, the storm hits the player (team decision, Nov 14).
    const tool = getRover("opportunity").tool!;
    runStore.set((s) => ({
      hubOpen: false,
      encounterStep: "tool_unlocked",
      severeStorm: true,
      communicationStatus: "searching",
      unlockedTools: addTool(s.unlockedTools, tool.id),
      objective: { ...s.objective, text: "Engage power preservation [E] and hold still until the storm passes", angle: null },
      dialogue: {
        speaker: "player_rover",
        title: "The storm hits",
        lines: [
          "In June 2018 a planet-encircling dust storm blocked nearly all the sunlight Opportunity needed. Its solar panels couldn't make enough power, and it never responded again.",
          `${tool.name} unlocked: ${tool.description}`,
          "The storm is hitting you now. Press E to enter survival mode and hold still until it passes.",
        ],
        actionLabel: "Brace for the storm",
        action: "dismiss",
      },
    }));
  },

  // ---- Discovery (called by the surface scene when the player scans a rover) ----
  beginDiscovery(roverId: RoverId) {
    if (state.discoveredRovers.includes(roverId)) return;
    const rover = getRover(roverId);
    runStore.set({
      mode: "cinematic",
      canScan: false,
      dialogue: {
        speaker: "player_rover",
        title: "Mission log",
        lines: rover.discovery.monologue.split("\n").filter(Boolean), // verbatim PRD §4.8
        actionLabel: `Open ${rover.name}'s archive`,
        action: "open_archive",
        voice: `discovery-${roverId}`, // J3: our rover ("Mina") speaks the discovery remark
      },
    });
  },
  /** Unlock archive + one-time coin reward, then open the Hub on the new archive (techspec §5). */
  completeDiscovery(roverId: RoverId) {
    const firstReward = !state.rewardedEncounters.includes(roverId);
    const name = getRover(roverId).name;
    runStore.set((s) => ({
      mode: "explore",
      dialogue: null,
      discoveredRovers: s.discoveredRovers.includes(roverId) ? s.discoveredRovers : [...s.discoveredRovers, roverId],
      rewardedEncounters: firstReward ? [...s.rewardedEncounters, roverId] : s.rewardedEncounters,
      coins: firstReward ? s.coins + TUNING.discoveryReward : s.coins,
      encounterStep: s.activeEncounterRover === roverId ? "discovered" : s.encounterStep,
      objective: { ...s.objective, text: `Learn from ${name} — then press Continue in the Rover Hub`, angle: null },
      toast: firstReward ? `+${TUNING.discoveryReward} coins · archive unlocked` : null,
      hubOpen: true,
      hubView: "rover_archives",
      selectedArchive: roverId,
      archiveSection: "story",
    }));
  },

  /** Opportunity: the player held survival mode long enough — the storm passes. */
  stormPassed() {
    runStore.set(() => ({
      severeStorm: false,
      toolEngaged: false,
      solarCondition: "dusty",
      communicationStatus: "connected",
      encounterStep: "complete",
      objective: { text: "Mission complete", angle: null, distance: null },
      dialogue: {
        speaker: "player_rover",
        title: "The storm passed",
        lines: [
          "The dust is settling and sunlight is reaching your solar panels again.",
          "You rode out the storm — something Opportunity never got the chance to do.",
          "All three explorers found. Their stories are ready to send home.",
        ],
        actionLabel: "Continue",
        action: "ending",
      },
      warning: null,
    }));
  },

  /** Spirit: drove free of the soft soil with traction mode. */
  escapedSoftSoil() {
    runStore.set({
      encounterStep: "complete",
      objective: jumpObjective("spirit"),
      dialogue: legCompleteDialogue("spirit", "Leg complete", [
        "You drove free of the soft soil that held Spirit for good.",
        "Spirit's archive stays unlocked in your Rover Hub for the rest of this run.",
      ]),
    });
  },

  /**
   * Jump to the next leg (PRD §4.3) — only when the player CHOOSES to, with the leg complete
   * (Phase H: no automatic jump-cut). Battery, coins, archives and tools carry over.
   */
  travelToNextLeg() {
    const from = state.activeEncounterRover;
    const next = from ? LEGS[from].next : null;
    if (!from || !next || state.encounterStep !== "complete") return;
    runStore.set({
      ...legState(next),
      dialogue: null,
      hubOpen: false,
      mode: "travel",
      travel: {
        from: LEGS[from].place,
        to: LEGS[next].place,
        fromSite: LEGS[from].site,
        toSite: LEGS[next].site,
        km: marsKm(LEGS[from].site, LEGS[next].site),
      },
    });
  },
  /** Called by the surface scene once the next leg is built. */
  arrivedAtLeg() {
    runStore.set({ mode: "explore", travel: null });
  },

  dismissDialogue() {
    const d = state.dialogue;
    if (!d) return;
    if (d.action === "open_archive") {
      const roverId = state.activeEncounterRover;
      if (roverId) actions.completeDiscovery(roverId);
      return;
    }
    if (d.action === "travel") {
      actions.travelToNextLeg();
      return;
    }
    if (d.action === "ending") {
      actions.startEnding();
      return;
    }
    runStore.set({ dialogue: null });
  },

  // ---- Coins: optional skip of the solar-charging wait (one validated action, techspec §6.3) ----
  canQuickCharge(s: RunState = state): boolean {
    return !isWorldPaused(s) && s.coins >= TUNING.quickChargeCost && s.batteryChargePercent < 100;
  },
  quickCharge() {
    if (!actions.canQuickCharge()) return;
    runStore.set((s) => ({
      coins: s.coins - TUNING.quickChargeCost,
      batteryChargePercent: Math.min(100, s.batteryChargePercent + TUNING.quickChargeAmount),
      outOfPower: false,
      toast: `Quick charge: +${TUNING.quickChargeAmount}% for ${TUNING.quickChargeCost} coins`,
    }));
  },

  // ---- Pause ----
  openPause() {
    // Pause exists for interactive play only; cinematics are unskippable and own input (rules §3).
    if (state.screen !== "game" || state.mode !== "explore" || state.hubOpen || state.dialogue) return;
    runStore.set({ pauseOpen: true });
  },
  resume() {
    runStore.set({ pauseOpen: false, confirmReturnOpen: false });
  },
  requestReturnToTitle() {
    runStore.set({ confirmReturnOpen: true });
  },
  cancelReturnToTitle() {
    runStore.set({ confirmReturnOpen: false });
  },
  confirmReturnToTitle() {
    actions.backToTitle(); // discards the unsaved run (no persistence)
  },

  clearToast() {
    runStore.set({ toast: null });
  },
};
