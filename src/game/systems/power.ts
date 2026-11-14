import { TUNING } from "../tuning";
import type { SolarCondition } from "../state/types";

// Power + environment (techspec §6). Pure function: elapsed-time based, never per-frame.
// Only called while the world is active, so paused time never drains or charges (rules §4).

export interface PowerInput {
  battery: number;
  condition: SolarCondition;
  /** Player is applying throttle (driving, or spinning wheels while stuck). */
  throttle: boolean;
  stationarySeconds: number;
  outOfPower: boolean;
  dtSeconds: number;
  /** Multiplier on driving drain (e.g. dust storm). */
  driveDrainFactor?: number;
  /** Constant systems load in %/s regardless of driving (Opportunity's storm before survival mode). */
  loadPerSecond?: number;
}

export interface PowerOutput {
  battery: number;
  isCharging: boolean;
  outOfPower: boolean;
}

export function stepPower(p: PowerInput): PowerOutput {
  let battery = p.battery;
  let isCharging = false;

  if (p.throttle && !p.outOfPower) {
    battery -= TUNING.drainPerSecond * (p.driveDrainFactor ?? 1) * p.dtSeconds;
  } else if (p.stationarySeconds >= TUNING.chargeGraceSeconds) {
    // Every condition recharges at a nonzero rate (rules §5).
    battery += TUNING.chargePerSecond[p.condition] * p.dtSeconds;
    isCharging = battery < 100;
  }
  battery -= (p.loadPerSecond ?? 0) * p.dtSeconds;
  battery = Math.min(100, Math.max(0, battery));

  // Soft recovery: at 0% the rover can't drive until solar brings it back to a minimum.
  let outOfPower = p.outOfPower;
  if (battery <= 0) outOfPower = true;
  else if (outOfPower && battery >= TUNING.minChargeToDriveAfterEmpty) outOfPower = false;

  return { battery, isCharging: isCharging && !(p.loadPerSecond ?? 0), outOfPower };
}
