import { isWorldPaused, runStore } from "../state/runStore";
import type { RunState } from "../state/types";
import { audio, type MusicState } from "./engine";
import { TUNING } from "../tuning";

// Adaptive audio (design.md §9): derives music, ambience loops and event sounds from run state,
// so gameplay code never has to manage audio. Scenes only trigger a few physical one-shots
// (debris hit, touchdown) directly.

function musicFor(s: RunState): MusicState {
  if (s.screen === "title" || s.screen === "destination") return "title";
  if (s.screen === "data_home") return "debrief";
  switch (s.stage) {
    case "opening":
      return "launch";
    case "rocket":
      return "space";
    case "landing":
      if (s.banner?.label === "FLASHBACK" || s.banner?.label === "REAL NASA IMAGE") return "memory";
      if (s.banner?.label === "PRESENT DAY") return "mars";
      return "space";
    case "ending":
      return "ending";
    case "surface":
      if (s.roverOffline) return "ending"; // the rover has died in the storm; the ending music carries on
      if (s.mode === "cinematic" || (s.hubOpen && s.encounterStep === "discovered")) return "discovery";
      if (s.severeStorm || s.encounterStep === "hazard") return "hazard";
      return "mars";
  }
}

const WIND: Record<RunState["solarCondition"], number> = { clear: 0.03, dusty: 0.09, dust_storm: 0.2 };

function applyLoops(s: RunState) {
  const paused = isWorldPaused(s) && s.mode !== "cinematic";
  const game = s.screen === "game";
  audio.setLoop("thrust", game && !paused && (s.stage === "opening" || (s.stage === "rocket" && (s.rocketLock ?? 0) < 100)) ? 0.1 : 0);
  const onMars = game && (s.stage === "surface" || (s.stage === "landing" && s.banner?.label === "PRESENT DAY"));
  audio.setLoop("wind", onMars ? (s.severeStorm ? 0.34 : WIND[s.solarCondition]) * (s.hubOpen ? 0.5 : 1) : s.stage === "ending" && game ? 0.04 : 0);
  audio.setLoop("drive", game && s.stage === "surface" && !paused && s.isRoverMoving ? 0.07 : 0);
}

export function startAudioDirector(): () => void {
  let prev = runStore.get();
  audio.setMusic(musicFor(prev));
  applyLoops(prev);

  return runStore.subscribe(() => {
    const s = runStore.get();
    audio.setMusic(musicFor(s));
    applyLoops(s);

    // Event sounds from state changes.
    if (s.hubOpen !== prev.hubOpen) audio.sfx(s.hubOpen ? "hubOpen" : "hubClose");
    if (s.coins > prev.coins) audio.sfx("coin");
    if (s.stage === "surface" && s.isCharging && !prev.isCharging && s.batteryChargePercent < 90) audio.sfx("chargeStart");
    if (s.unlockedTools.length > prev.unlockedTools.length) audio.sfx("unlock");
    if (s.mode === "cinematic" && prev.mode !== "cinematic" && s.stage === "surface") audio.sfx("discovery");
    if (s.mode === "travel" && prev.mode !== "travel") audio.sfx("travel");
    if (prev.severeStorm && !s.severeStorm && s.stage === "surface") audio.sfx("stormPass");
    if (s.panelDamaged && !prev.panelDamaged) audio.sfx("panelDamage");
    if (s.roverOffline && !prev.roverOffline) audio.sfx("powerDown");
    if ((s.rocketLock ?? 0) >= 100 && (prev.rocketLock ?? 0) < 100) audio.sfx("lock");
    if (s.stage === "surface" && s.batteryChargePercent < TUNING.lowBatteryWarning && prev.batteryChargePercent >= TUNING.lowBatteryWarning) {
      audio.sfx("lowPower");
    }
    if (s.screen !== prev.screen || s.stage !== prev.stage) audio.stopVoice();
    prev = s;
  });
}
