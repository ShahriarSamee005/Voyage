"use client";

import type { ReactNode } from "react";
import { useRun } from "../useRun";
import { BatteryBar } from "../hud/BatteryBar";
import { COMMS_LABEL, SOLAR_LABEL, TOOL_NAMES, TRACTION_LABEL } from "../labels";
import type { RunState } from "@/game/state/types";
import { TUNING } from "@/game/tuning";

/** Status-only diagnostics read from runtime state. No controls, no invented readings (design.md §7.3). */
export function MyRoverView() {
  const battery = useRun((s) => Math.round(s.batteryChargePercent));
  const solar = useRun((s) => s.solarCondition);
  const traction = useRun((s) => s.tractionStatus);
  const comms = useRun((s) => s.communicationStatus);
  const tools = useRun((s) => s.unlockedTools);
  const toolEngaged = useRun((s) => s.toolEngaged);
  const legTool = useRun((s) =>
    s.activeEncounterRover === "spirit" ? "traction-mode" : s.activeEncounterRover === "opportunity" ? "power-preservation" : null,
  );
  const summary = useRun(statusSummary);

  return (
    <section className="flex h-full gap-6 p-6" aria-label="My Rover system status">
      <div className="flex w-[300px] shrink-0 flex-col gap-4">
        <div className="flex h-[300px] items-center justify-center rounded-md border border-ui-border/70 bg-ui-panel">
          {/* Front 3/4 view (south-east frame) of the player rover. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/rovers/player/player_SE.png" alt="Your rover" className="h-[256px] w-[256px]" />
        </div>
        <div className="rounded-md border border-ui-border/70 bg-ui-panel p-4">
          <div className="mb-1 font-mono text-[12px] tracking-widest text-ui-cyan">STATUS SUMMARY</div>
          <p className="text-[16px] leading-relaxed">{summary}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <h3 className="font-mono text-[20px] tracking-[0.2em]">
          MY ROVER <span className="text-ui-cyan">/ SYSTEM STATUS</span>
        </h3>
        <Row label="BATTERY CHARGE" value={`${battery}%`}>
          <BatteryBar percent={battery} large />
        </Row>
        <Row label="SOLAR CONDITION" value={SOLAR_LABEL[solar]} />
        <Row label="TRACTION" value={TRACTION_LABEL[traction]} tone={traction === "stuck" ? "danger" : traction === "reduced" ? "warning" : "ok"} />
        <Row label="COMMUNICATIONS" value={COMMS_LABEL[comms]} />
        <Row label="INSTALLED TOOLS" value={tools.length ? "" : "None unlocked yet"}>
          {tools.length > 0 && (
            <ul className="text-[15px]">
              {tools.map((t) => (
                <li key={t}>
                  {TOOL_NAMES[t] ?? t} —{" "}
                  <span className="text-ui-muted">{toolEngaged && t === legTool ? "engaged" : "standby"} (press E in the field)</span>
                </li>
              ))}
            </ul>
          )}
        </Row>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  tone = "ok",
  children,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warning" | "danger";
  children?: ReactNode;
}) {
  const color = tone === "danger" ? "text-ui-danger" : tone === "warning" ? "text-ui-warning" : "text-ui-text";
  return (
    <div className="rounded-md border border-ui-border/70 bg-ui-panel px-5 py-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[13px] tracking-widest text-ui-muted">{label}</span>
        {value && <span className={`font-mono text-[18px] ${color}`}>{value}</span>}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

function statusSummary(s: RunState): string {
  if (s.severeStorm && s.toolEngaged) return "Survival mode on. Power use is minimal while the storm passes. Hold still.";
  if (s.severeStorm) return "A severe dust storm is draining power. Engage power preservation (E) and hold still.";
  if (s.outOfPower) return "Out of power. Stay still so the solar panels can recharge the battery.";
  if (s.tractionStatus === "stuck") return "Wheels are stuck in soft soil. Driving won't free the rover on its own.";
  if (s.batteryChargePercent < TUNING.lowBatteryWarning) return "Battery is low. Stop for a while to recharge from sunlight.";
  if (s.isCharging && s.solarCondition === "dust_storm") return "Charging very slowly — dust is blocking most of the sunlight.";
  if (s.isCharging && s.solarCondition === "dusty") return "Charging, but dust in the air is slowing it down.";
  if (s.isCharging) return "Stationary and charging from the solar panels.";
  return "All systems normal. Ready to continue exploring.";
}
