// PROVISIONAL gameplay numbers (Nov 14). PRD §8 / techspec §14 mark all of these TBD —
// they are deliberately collected here so Phase 6 can tune them in one place.
import type { SolarCondition } from "./state/types";

export const TUNING = {
  // Movement (px/s in the 1280×720 logical world)
  driveSpeed: 170,
  softSoilSpeedFactor: 0.55, // outer soft-soil zone: reduced traction
  tractionModeSpeedFactor: 0.45, // tool engaged inside soft soil: slow but free
  sinkSeconds: 0.9, // time in the soft-soil core before the rover is stuck

  // Battery (percent). A full charge ≈ one normal approach leg (PRD §4.5).
  startBattery: 100,
  // Phase 6 tuning: legs are ~13–20 s of straight driving, so 4 %/s makes a full charge ≈ one approach
  // (Sojourner ≈ ⅔ charge, Spirit ≈ most of a charge, Opportunity's storm drive needs a recharge or coins).
  drainPerSecond: 4, // while driving (or spinning wheels when stuck)
  stormDriveDrainFactor: 1.25, // driving through a dust storm costs more (1.5 made the leg a slog in testing)
  chargeGraceSeconds: 0.5, // must be stationary this long before solar charging starts
  // All three conditions recharge (rules §5): clear fastest → dusty → dust storm slowest.
  chargePerSecond: { clear: 6, dusty: 3.5, dust_storm: 2.2 } satisfies Record<SolarCondition, number>,
  lowBatteryWarning: 25,
  minChargeToDriveAfterEmpty: 10, // at 0% the rover waits for this much solar charge (soft recovery)

  // Opportunity: the storm hits and the rover doesn't make it (team decision, Nov 15).
  // After Continue the rover heads for the final checkpoint; the storm hits on the way, once it has
  // covered this share of the distance, or after this many seconds if the player wanders off.
  stormTriggerProgress: 0.45,
  stormTriggerSeconds: 15,
  // Timeline in seconds of play after the "storm hits" dialogue closes:
  stormEmergencyChargeAt: 2.5, // the rover spends all its coins on one last charge
  stormPanelDamageAt: 7, // a gust damages the solar panels: no more charging
  stormShutdownBy: 22, // the drain speeds up if needed so the battery is empty by now
  stormSignalLostDelay: 4, // offline and unmoving this long before the "Signal lost" message
  stormDrainPerSecond: 3.5, // battery drain in the storm (systems + heaters, no sunlight)
  stormDrainPreservedPerSecond: 2, // with power preservation engaged: slower, but still draining
  emergencyChargePerCoin: 3,
  emergencyChargeMax: 30,

  // Coins (earned only, no real money) — PRD §4.5
  startCoins: 3,
  discoveryReward: 5,
  quickChargeCost: 2,
  quickChargeAmount: 50,

  // Interaction / presentation
  scanRange: 340,
  boundaryMargin: 140, // soft "mission zone" edge that redirects the rover
  travelCardMs: 3600, // the jump map draws its route in ~2.5 s, then holds briefly
} as const;
