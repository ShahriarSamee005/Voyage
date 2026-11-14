import type { CommunicationStatus, SolarCondition, TractionStatus } from "@/game/state/types";

export const SOLAR_LABEL: Record<SolarCondition, string> = {
  clear: "CLEAR",
  dusty: "DUSTY",
  dust_storm: "DUST STORM",
};

export const TRACTION_LABEL: Record<TractionStatus, string> = {
  normal: "Normal",
  reduced: "Reduced",
  stuck: "Stuck",
};

export const COMMS_LABEL: Record<CommunicationStatus, string> = {
  connected: "Connected",
  searching: "Searching",
  offline: "Offline",
};

export const TOOL_SHORT: Record<string, string> = {
  "traction-mode": "TRACTION MODE",
  "power-preservation": "POWER PRESERVATION",
};

export const TOOL_NAMES: Record<string, string> = {
  "traction-mode": "Soft-soil traction mode",
  "power-preservation": "Dust storm power preservation",
};
